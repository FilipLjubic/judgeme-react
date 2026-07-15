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

export type ReviewsGridSelection =
  | "all"
  | "current_collection"
  | "current_product"
  | "custom_products"
  | "featured_reviews"
  | "product_reviews"
  | "store_reviews";

export type ReviewsGridDisplayOrder = "media_first" | "most_recent";
export type ReviewsGridCardGrouping = "per_media" | "per_review";
export type ReviewsGridCornerStyle =
  "extra_round" | "round" | "soft" | "square";
export type ReviewsGridCardSpacing = "large" | "medium" | "small" | "zero";

export interface ReviewsGridConfig {
  reviewSelection: ReviewsGridSelection;
  selectedProductIds: readonly string[];
  collectionId?: string;
  showReviewsWithMediaOnly: boolean;
  displayOrder: ReviewsGridDisplayOrder;
  cardGrouping: ReviewsGridCardGrouping;
  numberOfColumnsDesktop: number;
  numberOfRowsDesktop: number;
  numberOfColumnsMobile: number;
  numberOfRowsMobile: number;
  showStars: boolean;
  showReviewerName: boolean;
  showReviewTitleOnHoverDesktop: boolean;
  maxWidth: number;
  headerText: string;
  showAverageRating: boolean;
  isAwesome: boolean;
  cornerStyle: ReviewsGridCornerStyle;
  cardSpacing: ReviewsGridCardSpacing;
  headerTextColor: string;
  starAndReviewerNameColor: string;
  overlayAndBackgroundColor: string;
  contentColor: string;
  dropShadowColor: string;
}

export type ReviewsGridReview = Readonly<Record<string, JudgeMeJsonValue>>;

export interface ReviewsGridPageData {
  currentPage: number;
  perPage: number;
  reviewSelection: ReviewsGridSelection;
  reviews: readonly ReviewsGridReview[];
  totalCount: number;
  totalPages: number;
}

export interface ReviewsGridData {
  aggregate: {
    count: number;
    rating: number;
  };
  config: ReviewsGridConfig;
  page: ReviewsGridPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  /** Shared dashboard CSS used by Judge.me's exact runtime and icon fonts. */
  styles?: string;
}

export interface FetchReviewsGridPageOptions {
  shopDomain: string;
  productId?: string;
  config?: Partial<ReviewsGridConfig>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchReviewsGridOptions extends FetchReviewsGridPageOptions {
  publicToken: string;
}

export interface CreateReviewsGridDataOptions {
  aggregate: ReviewsGridData["aggregate"];
  config?: Partial<ReviewsGridConfig>;
  page: ReviewsGridPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles?: string;
}

const DEFAULT_REVIEWS_GRID_CONFIG: ReviewsGridConfig = {
  reviewSelection: "all",
  selectedProductIds: [],
  showReviewsWithMediaOnly: false,
  displayOrder: "media_first",
  cardGrouping: "per_media",
  numberOfColumnsDesktop: 3,
  numberOfRowsDesktop: 3,
  numberOfColumnsMobile: 2,
  numberOfRowsMobile: 6,
  showStars: true,
  showReviewerName: true,
  showReviewTitleOnHoverDesktop: true,
  maxWidth: 1100,
  headerText: "From our customers",
  showAverageRating: true,
  isAwesome: false,
  cornerStyle: "soft",
  cardSpacing: "medium",
  headerTextColor: "#000000",
  starAndReviewerNameColor: "#F9F9F9",
  overlayAndBackgroundColor: "#000000",
  contentColor: "#F9F9F9",
  dropShadowColor: "#000000",
};

interface ReviewsGridApiResponse {
  current_page?: unknown;
  per_page?: unknown;
  review_selection?: unknown;
  reviews?: unknown;
  total_count?: unknown;
  total_pages?: unknown;
}

/**
 * Fetches the Reviews Grid's current public CDN page. This endpoint does not
 * use a Judge.me API token; writes and private review data remain unavailable.
 */
export async function fetchReviewsGridPage({
  shopDomain,
  productId,
  config: configInput,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchReviewsGridPageOptions): Promise<ReviewsGridPageData> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const config = normalizeReviewsGridConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;

  assertReviewsGridSelectionContext(config, normalizedProductId);

  const url = new URL(`${JUDGE_ME_CDN_API}/widgets/reviews_grid_widget_data`);
  url.searchParams.set("shop_domain", normalizedShopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("page", "1");
  url.searchParams.set(
    "show_media_only",
    String(config.showReviewsWithMediaOnly),
  );
  url.searchParams.set("per_page", String(getReviewsGridPageSize(config)));
  url.searchParams.set("display_order", config.displayOrder);
  url.searchParams.set("review_selection", config.reviewSelection);

  if (config.reviewSelection === "current_product" && normalizedProductId) {
    url.searchParams.set("product_id", normalizedProductId);
  }

  if (config.reviewSelection === "current_collection" && config.collectionId) {
    url.searchParams.set("collection_id", config.collectionId);
  }

  if (config.reviewSelection === "custom_products") {
    for (const selectedProductId of config.selectedProductIds) {
      url.searchParams.append("select_products[]", selectedProductId);
    }
  }

  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me Reviews Grid request failed with HTTP ${response.status}.`,
    );
  }

  let payload: ReviewsGridApiResponse;

  try {
    payload = (await response.json()) as ReviewsGridApiResponse;
  } catch {
    throw new Error("Judge.me Reviews Grid returned invalid JSON.");
  }

  return normalizeReviewsGridPage(payload, config.reviewSelection);
}

/** Fetches a complete standalone Reviews Grid payload with shared settings. */
export async function fetchReviewsGrid({
  shopDomain,
  publicToken,
  productId,
  config,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchReviewsGridOptions): Promise<ReviewsGridData> {
  const [page, counter] = await Promise.all([
    fetchReviewsGridPage({
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
  const fallbackAggregate = summarizeRatedRecords(
    page.reviews,
    page.totalCount,
  );

  return createReviewsGridData({
    aggregate: counter
      ? { count: counter.count, rating: Number(counter.rating) }
      : fallbackAggregate,
    config,
    page,
    productId,
    settings: counter?.settings ?? EMPTY_JUDGE_ME_SETTINGS,
    shopDomain,
    styles: counter?.styles,
  });
}

/** Combines a grid page with resources already fetched by a storefront batch. */
export function createReviewsGridData({
  aggregate,
  config: configInput,
  page,
  productId,
  settings,
  shopDomain,
  styles,
}: CreateReviewsGridDataOptions): ReviewsGridData {
  const config = normalizeReviewsGridConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;
  const rating = Number(aggregate.rating);

  assertReviewsGridSelectionContext(config, normalizedProductId);

  if (
    !Number.isSafeInteger(aggregate.count) ||
    aggregate.count < 0 ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    throw new Error("Judge.me returned invalid Reviews Grid aggregates.");
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

export function normalizeReviewsGridConfig(
  config: Partial<ReviewsGridConfig> = {},
): ReviewsGridConfig {
  const normalized: ReviewsGridConfig = {
    ...DEFAULT_REVIEWS_GRID_CONFIG,
    ...config,
    selectedProductIds: (config.selectedProductIds ?? [])
      .map((id) => String(id).trim())
      .filter(Boolean),
    collectionId: config.collectionId?.trim() || undefined,
    headerText:
      config.headerText === undefined
        ? DEFAULT_REVIEWS_GRID_CONFIG.headerText
        : config.headerText.trim(),
  };

  assertIntegerInRange(
    normalized.numberOfColumnsDesktop,
    1,
    6,
    "desktop columns",
  );
  assertIntegerInRange(normalized.numberOfRowsDesktop, 1, 6, "desktop rows");
  assertIntegerInRange(
    normalized.numberOfColumnsMobile,
    1,
    2,
    "mobile columns",
  );
  assertIntegerInRange(normalized.numberOfRowsMobile, 1, 6, "mobile rows");
  assertIntegerInRange(normalized.maxWidth, 200, 1200, "maximum width");

  return normalized;
}

function getReviewsGridPageSize(config: ReviewsGridConfig): number {
  return config.numberOfColumnsDesktop * config.numberOfRowsDesktop;
}

function assertReviewsGridSelectionContext(
  config: ReviewsGridConfig,
  productId: string | undefined,
): void {
  if (config.reviewSelection === "current_product" && !productId) {
    throw new Error(
      "Judge.me Reviews Grid current_product selection requires a product ID.",
    );
  }

  if (config.reviewSelection === "current_collection" && !config.collectionId) {
    throw new Error(
      "Judge.me Reviews Grid current_collection selection requires a collection ID.",
    );
  }

  if (
    config.reviewSelection === "custom_products" &&
    config.selectedProductIds.length === 0
  ) {
    throw new Error(
      "Judge.me Reviews Grid custom_products selection requires product IDs.",
    );
  }
}

function normalizeReviewsGridPage(
  payload: ReviewsGridApiResponse,
  expectedSelection: ReviewsGridSelection,
): ReviewsGridPageData {
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
        assertSafePublicHtml(review.body_html, "Reviews Grid");
      }

      return [review];
    },
  );
  const currentPage = readPositiveInteger(payload.current_page, 1);
  const perPage = readPositiveInteger(payload.per_page, Math.max(1, reviews.length));
  const totalCount = readNonNegativeInteger(payload.total_count, reviews.length);
  const totalPages = readNonNegativeInteger(
    payload.total_pages,
    reviews.length > 0 ? 1 : 0,
  );
  const responseSelection = String(payload.review_selection ?? "");

  if (responseSelection && responseSelection !== expectedSelection) {
    throw new Error("Judge.me returned a mismatched Reviews Grid selection.");
  }

  return {
    currentPage,
    perPage,
    reviewSelection: expectedSelection,
    reviews,
    totalCount,
    totalPages,
  };
}

function isJsonObject(
  value: unknown,
): value is Record<string, JudgeMeJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveInteger(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 1
    ? normalized
    : fallback;
}

function readNonNegativeInteger(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 0
    ? normalized
    : fallback;
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `Judge.me Reviews Grid ${label} must be between ${minimum} and ${maximum}.`,
    );
  }
}
