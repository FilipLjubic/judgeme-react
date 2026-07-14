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

export type VideosCarouselSelection =
  | "all"
  | "cart"
  | "current_collection"
  | "current_product"
  | "custom_products"
  | "featured_reviews"
  | "product_reviews"
  | "store_reviews";

export type VideosCarouselStarRating = "all" | "5" | "4-5" | "3-5";
export type VideosCarouselReviewType =
  | "videos-only"
  | "photos-and-videos"
  | "any-review";
export type VideosCarouselStarsSize = "small" | "medium" | "large" | "hidden";
export type VideosCarouselTextSize =
  | "extra_small"
  | "small"
  | "medium"
  | "large"
  | "extra_large"
  | "huge";
export type VideosCarouselArrowsPosition = "sides" | "bottom" | "hidden";
export type VideosCarouselCornerStyle = "sharp" | "soft" | "rounded";
export type VideosCarouselStyle = "highlight" | "perspective";

export interface VideosCarouselConfig {
  reviewSelection: VideosCarouselSelection;
  selectedProductIds: readonly string[];
  collectionId?: string;
  starRating: VideosCarouselStarRating;
  reviewType: VideosCarouselReviewType;
  maxReviews: number;
  showReviewerName: boolean;
  starsSize: VideosCarouselStarsSize;
  textSize: VideosCarouselTextSize;
  arrowsPosition: VideosCarouselArrowsPosition;
  maxWidth: number;
  cornerStyle: VideosCarouselCornerStyle;
  textColor: string;
  headerColor: string;
  cardColor: string;
  starsColor: string;
  arrowsColor: string;
  showBorder: boolean;
  showDropShadow: boolean;
  autoplayMedia: boolean;
  transitionSpeed: number;
  carouselStyle: VideosCarouselStyle;
  headerText: string;
  showAverageRating: boolean;
  primaryLanguage: string;
}

export type VideosCarouselReview = Readonly<Record<string, JudgeMeJsonValue>>;

export interface VideosCarouselPageData {
  reviewSelection: VideosCarouselSelection;
  reviews: readonly VideosCarouselReview[];
}

export interface VideosCarouselData {
  aggregate: {
    count: number;
    rating: number;
  };
  config: VideosCarouselConfig;
  page: VideosCarouselPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles: string;
}

export interface FetchVideosCarouselPageOptions {
  shopDomain: string;
  productId?: string;
  config?: Partial<VideosCarouselConfig>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchVideosCarouselOptions
  extends FetchVideosCarouselPageOptions {
  publicToken: string;
}

export interface CreateVideosCarouselDataOptions {
  aggregate: VideosCarouselData["aggregate"];
  config?: Partial<VideosCarouselConfig>;
  page: VideosCarouselPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles?: string;
}

const DEFAULT_VIDEOS_CAROUSEL_CONFIG: VideosCarouselConfig = {
  reviewSelection: "all",
  selectedProductIds: [],
  starRating: "all",
  reviewType: "photos-and-videos",
  maxReviews: 20,
  showReviewerName: true,
  starsSize: "large",
  textSize: "medium",
  arrowsPosition: "sides",
  maxWidth: 1100,
  cornerStyle: "soft",
  textColor: "#FFFFFF",
  headerColor: "#000000",
  cardColor: "#7D7D7D",
  starsColor: "rgba(0,0,0,0)",
  arrowsColor: "#000000",
  showBorder: false,
  showDropShadow: false,
  autoplayMedia: false,
  transitionSpeed: 5,
  carouselStyle: "highlight",
  headerText: "Real customer stories",
  showAverageRating: true,
  primaryLanguage: "en",
};

const STAR_RATING_API_VALUES: Record<VideosCarouselStarRating, string> = {
  all: "all",
  "5": "5_star",
  "4-5": "4_to_5_star",
  "3-5": "3_to_5_star",
};

const REVIEW_TYPE_API_VALUES: Record<VideosCarouselReviewType, string> = {
  "videos-only": "video",
  "photos-and-videos": "photo_and_video",
  "any-review": "all",
};

interface VideosCarouselApiResponse {
  reviews?: unknown;
}

/** Fetches Videos Carousel cards from Judge.me's tokenless public CDN. */
export async function fetchVideosCarouselPage({
  shopDomain,
  productId,
  config: configInput,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchVideosCarouselPageOptions): Promise<VideosCarouselPageData> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const config = normalizeVideosCarouselConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;

  assertVideosCarouselSelectionContext(config, normalizedProductId);

  const url = new URL(`${JUDGE_ME_CDN_API}/reviews/reviews_for_carousel`);
  const requestSelection =
    config.reviewSelection === "cart"
      ? "custom_products"
      : config.reviewSelection;

  url.searchParams.set("reviews_selection", requestSelection);
  url.searchParams.set("carousel_type", "videos");
  url.searchParams.set("review_type", REVIEW_TYPE_API_VALUES[config.reviewType]);
  url.searchParams.set(
    "star_rating",
    STAR_RATING_API_VALUES[config.starRating],
  );
  url.searchParams.set("max_reviews", String(config.maxReviews));
  url.searchParams.set("url", `https://${normalizedShopDomain}`);
  url.searchParams.set("shop_domain", normalizedShopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("primary_language", config.primaryLanguage);

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
      `Judge.me Videos Carousel request failed with HTTP ${response.status}.`,
    );
  }

  let payload: VideosCarouselApiResponse;

  try {
    payload = (await response.json()) as VideosCarouselApiResponse;
  } catch {
    throw new Error("Judge.me Videos Carousel returned invalid JSON.");
  }

  return normalizeVideosCarouselPage(payload, config.reviewSelection);
}

/** Fetches a complete standalone Videos Carousel payload. */
export async function fetchVideosCarousel({
  shopDomain,
  publicToken,
  productId,
  config,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchVideosCarouselOptions): Promise<VideosCarouselData> {
  const [page, counter] = await Promise.all([
    fetchVideosCarouselPage({
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

  return createVideosCarouselData({
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

/** Combines cards with settings and aggregates fetched by another widget. */
export function createVideosCarouselData({
  aggregate,
  config: configInput,
  page,
  productId,
  settings,
  shopDomain,
  styles = "",
}: CreateVideosCarouselDataOptions): VideosCarouselData {
  const config = normalizeVideosCarouselConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;
  const rating = Number(aggregate.rating);

  assertVideosCarouselSelectionContext(config, normalizedProductId);

  if (page.reviewSelection !== config.reviewSelection) {
    throw new Error("Judge.me returned a mismatched Videos Carousel selection.");
  }

  if (
    !Number.isSafeInteger(aggregate.count) ||
    aggregate.count < 0 ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    throw new Error("Judge.me returned invalid Videos Carousel aggregates.");
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

export function normalizeVideosCarouselConfig(
  config: Partial<VideosCarouselConfig> = {},
): VideosCarouselConfig {
  const selectedProductIds = Array.from(
    new Set(
      (config.selectedProductIds ?? [])
        .map((id) => getShopifyNumericId(String(id)))
        .filter(Boolean),
    ),
  );
  const normalized: VideosCarouselConfig = {
    ...DEFAULT_VIDEOS_CAROUSEL_CONFIG,
    ...config,
    selectedProductIds,
    collectionId: config.collectionId
      ? getShopifyNumericId(config.collectionId)
      : undefined,
    headerText:
      config.headerText === undefined
        ? DEFAULT_VIDEOS_CAROUSEL_CONFIG.headerText
        : config.headerText.trim(),
    primaryLanguage:
      config.primaryLanguage?.trim() ||
      DEFAULT_VIDEOS_CAROUSEL_CONFIG.primaryLanguage,
  };

  assertIntegerInRange(normalized.maxReviews, 1, 30, "maximum reviews");
  assertIntegerInRange(normalized.maxWidth, 600, 1600, "maximum width");
  assertIntegerInRange(normalized.transitionSpeed, 0, 60, "transition speed");

  return normalized;
}

function assertVideosCarouselSelectionContext(
  config: VideosCarouselConfig,
  productId: string | undefined,
): void {
  if (config.reviewSelection === "current_product" && !productId) {
    throw new Error(
      "Judge.me Videos Carousel current_product selection requires a product ID.",
    );
  }

  if (config.reviewSelection === "current_collection" && !config.collectionId) {
    throw new Error(
      "Judge.me Videos Carousel current_collection selection requires a collection ID.",
    );
  }

  if (
    (config.reviewSelection === "custom_products" ||
      config.reviewSelection === "cart") &&
    config.selectedProductIds.length === 0
  ) {
    throw new Error(
      `Judge.me Videos Carousel ${config.reviewSelection} selection requires product IDs.`,
    );
  }
}

function normalizeVideosCarouselPage(
  payload: VideosCarouselApiResponse,
  reviewSelection: VideosCarouselSelection,
): VideosCarouselPageData {
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

      if (
        review.card_type !== "video" &&
        review.card_type !== "photo" &&
        review.card_type !== "text"
      ) {
        return [];
      }
      if (typeof review.body_html === "string") {
        assertSafePublicHtml(review.body_html, "Videos Carousel");
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
      `Judge.me Videos Carousel ${label} must be between ${minimum} and ${maximum}.`,
    );
  }
}
