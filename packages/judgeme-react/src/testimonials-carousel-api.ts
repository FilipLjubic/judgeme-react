import { normalizeShopDomain } from "./config.js";
import {
  fetchAllReviewsCounter,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";
import { getShopifyNumericId } from "./shopify.js";

const JUDGE_ME_CDN_API = "https://cdn.judge.me";

export type TestimonialsCarouselSelection =
  | "all"
  | "cart"
  | "current_collection"
  | "current_product"
  | "custom_products"
  | "featured_reviews"
  | "product_reviews"
  | "store_reviews";

export type TestimonialsCarouselStarRating = "all" | "5" | "4-5" | "3-5";
export type TestimonialsCarouselQuoteMarksSize =
  | "small"
  | "medium"
  | "large"
  | "extra_large"
  | "hidden";
export type TestimonialsCarouselProductNameTextSize =
  | "small"
  | "medium"
  | "large"
  | "extra_large"
  | "hidden";
export type TestimonialsCarouselVerifiedReviewer = "badge" | "text";
export type TestimonialsCarouselCardHeight =
  | "compact"
  | "medium"
  | "tall"
  | "extra_tall";
export type TestimonialsCarouselTextSize =
  | "extra_small"
  | "small"
  | "medium"
  | "large"
  | "extra_large"
  | "huge";
export type TestimonialsCarouselStarsSize =
  | "small"
  | "medium"
  | "large"
  | "hidden";
export type TestimonialsCarouselArrowsPosition =
  | "sides"
  | "bottom"
  | "hidden";
export type TestimonialsCarouselCornerStyle = "sharp" | "soft" | "rounded";
export type TestimonialsCarouselQuoteMarksStyle =
  | "serif"
  | "typewritten"
  | "basic"
  | "bold"
  | "cartoon"
  | "sans_serif";

export interface TestimonialsCarouselConfig {
  reviewSelection: TestimonialsCarouselSelection;
  selectedProductIds: readonly string[];
  collectionId?: string;
  starRating: TestimonialsCarouselStarRating;
  maxReviews: number;
  quoteMarksSize: TestimonialsCarouselQuoteMarksSize;
  productNameTextSize: TestimonialsCarouselProductNameTextSize;
  verifiedReviewer: TestimonialsCarouselVerifiedReviewer;
  cardHeight: TestimonialsCarouselCardHeight;
  textSize: TestimonialsCarouselTextSize;
  starsSize: TestimonialsCarouselStarsSize;
  arrowsPosition: TestimonialsCarouselArrowsPosition;
  maxWidth: number;
  cornerStyle: TestimonialsCarouselCornerStyle;
  quoteMarksStyle: TestimonialsCarouselQuoteMarksStyle;
  cardColor: string;
  starsAndQuoteMarksColor: string;
  textColor: string;
  arrowsColor: string;
  showBorder: boolean;
  showDropShadow: boolean;
  transitionSpeed: number;
  headerText: string;
  showAverageRating: boolean;
  primaryLanguage: string;
}

export type TestimonialsCarouselReview = Readonly<
  Record<string, JudgeMeJsonValue>
>;

export interface TestimonialsCarouselPageData {
  reviewSelection: TestimonialsCarouselSelection;
  reviews: readonly TestimonialsCarouselReview[];
}

export interface TestimonialsCarouselData {
  aggregate: {
    count: number;
    rating: number;
  };
  config: TestimonialsCarouselConfig;
  page: TestimonialsCarouselPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles: string;
}

export interface FetchTestimonialsCarouselPageOptions {
  shopDomain: string;
  productId?: string;
  config?: Partial<TestimonialsCarouselConfig>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchTestimonialsCarouselOptions
  extends FetchTestimonialsCarouselPageOptions {
  publicToken: string;
}

export interface CreateTestimonialsCarouselDataOptions {
  aggregate: TestimonialsCarouselData["aggregate"];
  config?: Partial<TestimonialsCarouselConfig>;
  page: TestimonialsCarouselPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles?: string;
}

const DEFAULT_TESTIMONIALS_CAROUSEL_CONFIG: TestimonialsCarouselConfig = {
  reviewSelection: "all",
  selectedProductIds: [],
  starRating: "all",
  maxReviews: 20,
  quoteMarksSize: "medium",
  productNameTextSize: "large",
  verifiedReviewer: "badge",
  cardHeight: "medium",
  textSize: "large",
  starsSize: "large",
  arrowsPosition: "sides",
  maxWidth: 1100,
  cornerStyle: "soft",
  quoteMarksStyle: "serif",
  cardColor: "#F9F9F9",
  starsAndQuoteMarksColor: "#108474",
  textColor: "#000000",
  arrowsColor: "#000000",
  showBorder: false,
  showDropShadow: false,
  transitionSpeed: 5,
  headerText: "Customers are saying",
  showAverageRating: true,
  primaryLanguage: "en",
};

const STAR_RATING_API_VALUES: Record<
  TestimonialsCarouselStarRating,
  string
> = {
  all: "all",
  "5": "5_star",
  "4-5": "4_to_5_star",
  "3-5": "3_to_5_star",
};

interface TestimonialsCarouselApiResponse {
  reviews?: unknown;
}

/** Fetches Testimonials Carousel reviews from Judge.me's tokenless CDN. */
export async function fetchTestimonialsCarouselPage({
  shopDomain,
  productId,
  config: configInput,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchTestimonialsCarouselPageOptions): Promise<TestimonialsCarouselPageData> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const config = normalizeTestimonialsCarouselConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;

  assertTestimonialsCarouselSelectionContext(config, normalizedProductId);

  const url = new URL(`${JUDGE_ME_CDN_API}/reviews/reviews_for_carousel`);
  const requestSelection =
    config.reviewSelection === "cart"
      ? "custom_products"
      : config.reviewSelection;

  url.searchParams.set("reviews_selection", requestSelection);
  url.searchParams.set("carousel_type", "testimonials");
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
      `Judge.me Testimonials Carousel request failed with HTTP ${response.status}.`,
    );
  }

  let payload: TestimonialsCarouselApiResponse;

  try {
    payload = (await response.json()) as TestimonialsCarouselApiResponse;
  } catch {
    throw new Error("Judge.me Testimonials Carousel returned invalid JSON.");
  }

  return normalizeTestimonialsCarouselPage(payload, config.reviewSelection);
}

/** Fetches a complete standalone Testimonials Carousel payload. */
export async function fetchTestimonialsCarousel({
  shopDomain,
  publicToken,
  productId,
  config,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchTestimonialsCarouselOptions): Promise<TestimonialsCarouselData> {
  const [page, counter] = await Promise.all([
    fetchTestimonialsCarouselPage({
      shopDomain,
      productId,
      config,
      signal,
      fetch: fetchImplementation,
    }),
    fetchAllReviewsCounter({
      shopDomain,
      publicToken,
      signal,
      fetch: fetchImplementation,
    }),
  ]);

  return createTestimonialsCarouselData({
    aggregate: { count: counter.count, rating: Number(counter.rating) },
    config,
    page,
    productId,
    settings: counter.settings,
    shopDomain,
    styles: counter.styles,
  });
}

/** Combines reviews with settings and aggregates fetched by another widget. */
export function createTestimonialsCarouselData({
  aggregate,
  config: configInput,
  page,
  productId,
  settings,
  shopDomain,
  styles = "",
}: CreateTestimonialsCarouselDataOptions): TestimonialsCarouselData {
  const config = normalizeTestimonialsCarouselConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;
  const rating = Number(aggregate.rating);

  assertTestimonialsCarouselSelectionContext(config, normalizedProductId);

  if (page.reviewSelection !== config.reviewSelection) {
    throw new Error(
      "Judge.me returned a mismatched Testimonials Carousel selection.",
    );
  }

  if (
    !Number.isSafeInteger(aggregate.count) ||
    aggregate.count < 0 ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    throw new Error("Judge.me returned invalid Testimonials Carousel aggregates.");
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

export function normalizeTestimonialsCarouselConfig(
  config: Partial<TestimonialsCarouselConfig> = {},
): TestimonialsCarouselConfig {
  const normalized: TestimonialsCarouselConfig = {
    ...DEFAULT_TESTIMONIALS_CAROUSEL_CONFIG,
    ...config,
    selectedProductIds: (config.selectedProductIds ?? [])
      .map((id) => getShopifyNumericId(String(id)))
      .filter(Boolean),
    collectionId: config.collectionId
      ? getShopifyNumericId(config.collectionId)
      : undefined,
    headerText:
      config.headerText === undefined
        ? DEFAULT_TESTIMONIALS_CAROUSEL_CONFIG.headerText
        : config.headerText.trim(),
    primaryLanguage:
      config.primaryLanguage?.trim() ||
      DEFAULT_TESTIMONIALS_CAROUSEL_CONFIG.primaryLanguage,
  };

  assertIntegerInRange(normalized.maxReviews, 1, 30, "maximum reviews");
  assertIntegerInRange(normalized.maxWidth, 600, 1600, "maximum width");
  assertIntegerInRange(normalized.transitionSpeed, 0, 60, "transition speed");

  return normalized;
}

function assertTestimonialsCarouselSelectionContext(
  config: TestimonialsCarouselConfig,
  productId: string | undefined,
): void {
  if (config.reviewSelection === "current_product" && !productId) {
    throw new Error(
      "Judge.me Testimonials Carousel current_product selection requires a product ID.",
    );
  }

  if (config.reviewSelection === "current_collection" && !config.collectionId) {
    throw new Error(
      "Judge.me Testimonials Carousel current_collection selection requires a collection ID.",
    );
  }

  if (
    (config.reviewSelection === "custom_products" ||
      config.reviewSelection === "cart") &&
    config.selectedProductIds.length === 0
  ) {
    throw new Error(
      `Judge.me Testimonials Carousel ${config.reviewSelection} selection requires product IDs.`,
    );
  }
}

function normalizeTestimonialsCarouselPage(
  payload: TestimonialsCarouselApiResponse,
  reviewSelection: TestimonialsCarouselSelection,
): TestimonialsCarouselPageData {
  if (!Array.isArray(payload.reviews)) {
    throw new Error(
      "Judge.me returned an invalid Testimonials Carousel review list.",
    );
  }

  const reviews = payload.reviews.map((review) => {
    if (!isJsonObject(review) || typeof review.uuid !== "string") {
      throw new Error("Judge.me returned an invalid Testimonials Carousel review.");
    }

    const rating = Number(review.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error("Judge.me returned an invalid Testimonials Carousel rating.");
    }

    return review;
  });

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
      `Judge.me Testimonials Carousel ${label} must be between ${minimum} and ${maximum}.`,
    );
  }
}
