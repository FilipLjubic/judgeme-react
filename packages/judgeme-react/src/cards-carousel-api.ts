import { normalizeShopDomain } from "./config.js";
import {
  fetchAllReviewsCounter,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";
import { getShopifyNumericId } from "./shopify.js";
import {
  assertSafePublicHtml,
  EMPTY_JUDGE_ME_SETTINGS,
  settleOptionalJudgeMeValue,
  summarizeRatedRecords,
} from "./resilient-data.js";

const JUDGE_ME_CDN_API = "https://cdn.judge.me";

export type CardsCarouselSelection =
  | "all"
  | "cart"
  | "current_collection"
  | "current_product"
  | "custom_products"
  | "featured_reviews"
  | "product_reviews"
  | "store_reviews";

export type CardsCarouselStarRating = "all" | "5" | "4-5" | "3-5";
export type CardsCarouselDisplayOrder = "media_first" | "most_recent";
export type CardsCarouselReviewLength = "short" | "medium" | "long";
export type CardsCarouselTextSize = "small" | "medium" | "large";
export type CardsCarouselImageRatio = "landscape" | "square" | "portrait";
export type CardsCarouselCornerStyle =
  "extra_round" | "round" | "soft" | "square";
export type CardsCarouselArrowsPosition = "sides" | "bottom";
export type CardsCarouselNoImageFallback = "product_image" | "review_text_only";

export interface CardsCarouselConfig {
  reviewSelection: CardsCarouselSelection;
  selectedProductIds: readonly string[];
  collectionId?: string;
  starRating: CardsCarouselStarRating;
  displayOrder: CardsCarouselDisplayOrder;
  maxReviews: number;
  showReviewMedia: boolean;
  noImageFallback: CardsCarouselNoImageFallback;
  reviewLength: CardsCarouselReviewLength;
  textSize: CardsCarouselTextSize;
  imageRatio: CardsCarouselImageRatio;
  reviewsShownDesktop: 3 | 4 | 5;
  showReviewerName: boolean;
  showProductName: boolean;
  showArrowsOnMobile: boolean;
  arrowsPosition: CardsCarouselArrowsPosition;
  maxWidth: number;
  cornerStyle: CardsCarouselCornerStyle;
  textColor: string;
  cardColor: string;
  headerColor: string;
  arrowsColor: string;
  starsColor: string;
  transitionSpeed: number;
  headerText: string;
  showAverageRating: boolean;
  primaryLanguage: string;
}

export type CardsCarouselReview = Readonly<Record<string, JudgeMeJsonValue>>;

export interface CardsCarouselPageData {
  reviewSelection: CardsCarouselSelection;
  reviews: readonly CardsCarouselReview[];
}

export interface CardsCarouselData {
  aggregate: {
    count: number;
    rating: number;
  };
  config: CardsCarouselConfig;
  page: CardsCarouselPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles: string;
}

export interface FetchCardsCarouselPageOptions {
  shopDomain: string;
  productId?: string;
  config?: Partial<CardsCarouselConfig>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchCardsCarouselOptions extends FetchCardsCarouselPageOptions {
  publicToken: string;
}

export interface CreateCardsCarouselDataOptions {
  aggregate: CardsCarouselData["aggregate"];
  config?: Partial<CardsCarouselConfig>;
  page: CardsCarouselPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles?: string;
}

const DEFAULT_CARDS_CAROUSEL_CONFIG: CardsCarouselConfig = {
  reviewSelection: "all",
  selectedProductIds: [],
  starRating: "all",
  displayOrder: "media_first",
  maxReviews: 20,
  showReviewMedia: true,
  noImageFallback: "review_text_only",
  reviewLength: "medium",
  textSize: "medium",
  imageRatio: "square",
  reviewsShownDesktop: 4,
  showReviewerName: true,
  showProductName: true,
  showArrowsOnMobile: false,
  arrowsPosition: "sides",
  maxWidth: 1100,
  cornerStyle: "soft",
  textColor: "#000000",
  cardColor: "#F9F9F9",
  headerColor: "#000000",
  arrowsColor: "#000000",
  starsColor: "rgba(0,0,0,0)",
  transitionSpeed: 5,
  headerText: "Customers are saying",
  showAverageRating: true,
  primaryLanguage: "en",
};

const STAR_RATING_API_VALUES: Record<CardsCarouselStarRating, string> = {
  all: "all",
  "5": "5_star",
  "4-5": "4_to_5_star",
  "3-5": "3_to_5_star",
};

interface CardsCarouselApiResponse {
  reviews?: unknown;
}

/** Fetches Cards Carousel reviews from Judge.me's tokenless public CDN. */
export async function fetchCardsCarouselPage({
  shopDomain,
  productId,
  config: configInput,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchCardsCarouselPageOptions): Promise<CardsCarouselPageData> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const config = normalizeCardsCarouselConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;

  assertCardsCarouselSelectionContext(config, normalizedProductId);

  const url = new URL(`${JUDGE_ME_CDN_API}/reviews/reviews_for_carousel`);
  const requestSelection =
    config.reviewSelection === "cart"
      ? "custom_products"
      : config.reviewSelection;

  url.searchParams.set("reviews_selection", requestSelection);
  url.searchParams.set("carousel_type", "cards");
  url.searchParams.set(
    "star_rating",
    STAR_RATING_API_VALUES[config.starRating],
  );
  url.searchParams.set("max_reviews", String(config.maxReviews));
  url.searchParams.set("url", `https://${normalizedShopDomain}`);
  url.searchParams.set("shop_domain", normalizedShopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("primary_language", config.primaryLanguage);
  url.searchParams.set("display_order", config.displayOrder);

  if (config.reviewSelection === "current_product" && normalizedProductId) {
    url.searchParams.set("product_ids", normalizedProductId);
  }

  if (config.reviewSelection === "current_collection" && config.collectionId) {
    url.searchParams.set("collection_id", config.collectionId);
  }

  if (
    config.reviewSelection === "custom_products" ||
    config.reviewSelection === "cart"
  ) {
    for (const selectedProductId of config.selectedProductIds) {
      url.searchParams.append("product_ids[]", selectedProductId);
    }
  }

  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me Cards Carousel request failed with HTTP ${response.status}.`,
    );
  }

  let payload: CardsCarouselApiResponse;

  try {
    payload = (await response.json()) as CardsCarouselApiResponse;
  } catch {
    throw new Error("Judge.me Cards Carousel returned invalid JSON.");
  }

  return normalizeCardsCarouselPage(payload, config.reviewSelection);
}

/** Fetches a complete standalone Cards Carousel payload. */
export async function fetchCardsCarousel({
  shopDomain,
  publicToken,
  productId,
  config,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchCardsCarouselOptions): Promise<CardsCarouselData> {
  const [page, counter] = await Promise.all([
    fetchCardsCarouselPage({
      shopDomain,
      productId,
      config,
      signal,
      fetch: fetchImplementation,
    }),
    settleOptionalJudgeMeValue(
      () =>
        fetchAllReviewsCounter({
          shopDomain,
          publicToken,
          signal,
          fetch: fetchImplementation,
        }),
      signal,
    ),
  ]);
  const fallbackAggregate = summarizeRatedRecords(page.reviews);

  return createCardsCarouselData({
    aggregate: counter
      ? { count: counter.count, rating: Number(counter.rating) }
      : fallbackAggregate,
    config,
    page,
    productId,
    settings: counter?.settings ?? EMPTY_JUDGE_ME_SETTINGS,
    shopDomain,
    styles: counter?.styles ?? "",
  });
}

/** Combines carousel reviews with resources already fetched by another widget. */
export function createCardsCarouselData({
  aggregate,
  config: configInput,
  page,
  productId,
  settings,
  shopDomain,
  styles = "",
}: CreateCardsCarouselDataOptions): CardsCarouselData {
  const config = normalizeCardsCarouselConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;
  const rating = Number(aggregate.rating);

  assertCardsCarouselSelectionContext(config, normalizedProductId);

  if (page.reviewSelection !== config.reviewSelection) {
    throw new Error("Judge.me returned a mismatched Cards Carousel selection.");
  }

  if (
    !Number.isSafeInteger(aggregate.count) ||
    aggregate.count < 0 ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    throw new Error("Judge.me returned invalid Cards Carousel aggregates.");
  }

  return {
    aggregate: { count: aggregate.count, rating },
    config,
    page,
    productId: normalizedProductId,
    settings,
    shopDomain: normalizeShopDomain(shopDomain),
    styles,
  };
}

export function normalizeCardsCarouselConfig(
  config: Partial<CardsCarouselConfig> = {},
): CardsCarouselConfig {
  const normalized: CardsCarouselConfig = {
    ...DEFAULT_CARDS_CAROUSEL_CONFIG,
    ...config,
    selectedProductIds: (config.selectedProductIds ?? [])
      .map((id) => getShopifyNumericId(String(id)))
      .filter(Boolean),
    collectionId: config.collectionId
      ? getShopifyNumericId(config.collectionId)
      : undefined,
    headerText:
      config.headerText === undefined
        ? DEFAULT_CARDS_CAROUSEL_CONFIG.headerText
        : config.headerText.trim(),
    primaryLanguage:
      config.primaryLanguage?.trim() ||
      DEFAULT_CARDS_CAROUSEL_CONFIG.primaryLanguage,
  };

  assertIntegerInRange(normalized.maxReviews, 1, 30, "maximum reviews");
  assertIntegerInRange(normalized.maxWidth, 600, 1600, "maximum width");
  assertIntegerInRange(normalized.transitionSpeed, 0, 60, "transition speed");

  if (![3, 4, 5].includes(normalized.reviewsShownDesktop)) {
    throw new Error(
      "Judge.me Cards Carousel desktop reviews must be 3, 4, or 5.",
    );
  }

  return normalized;
}

function assertCardsCarouselSelectionContext(
  config: CardsCarouselConfig,
  productId: string | undefined,
): void {
  if (config.reviewSelection === "current_product" && !productId) {
    throw new Error(
      "Judge.me Cards Carousel current_product selection requires a product ID.",
    );
  }

  if (config.reviewSelection === "current_collection" && !config.collectionId) {
    throw new Error(
      "Judge.me Cards Carousel current_collection selection requires a collection ID.",
    );
  }

  if (
    (config.reviewSelection === "custom_products" ||
      config.reviewSelection === "cart") &&
    config.selectedProductIds.length === 0
  ) {
    throw new Error(
      `Judge.me Cards Carousel ${config.reviewSelection} selection requires product IDs.`,
    );
  }
}

function normalizeCardsCarouselPage(
  payload: CardsCarouselApiResponse,
  reviewSelection: CardsCarouselSelection,
): CardsCarouselPageData {
  const reviews = (Array.isArray(payload.reviews) ? payload.reviews : []).flatMap(
    (review) => {
      if (
        !isJsonObject(review) ||
        typeof review.uuid !== "string" ||
        !review.uuid.trim()
      ) {
        return [];
      }

      const rating = Number(review.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return [];
      if (typeof review.body_html === "string") {
        assertSafePublicHtml(review.body_html, "Cards Carousel");
      }

      return [review];
    },
  );

  return { reviewSelection, reviews };
}

function isJsonObject(
  value: unknown,
): value is Record<string, JudgeMeJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `Judge.me Cards Carousel ${label} must be between ${minimum} and ${maximum}.`,
    );
  }
}
