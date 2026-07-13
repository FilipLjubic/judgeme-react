import { normalizeShopDomain } from "./config.js";
import {
  fetchAllReviewsCounter,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";
import { getShopifyNumericId } from "./shopify.js";

const JUDGE_ME_API = "https://api.judge.me";
const REVIEW_SNIPPETS_PATH = "/reviews/reviews_for_review_snippet_widget";

export type ReviewSnippetsSelection =
  | "all"
  | "auto"
  | "current_collection"
  | "current_product"
  | "custom"
  | "product"
  | "store";
export type ReviewSnippetsStarRating = "1" | "2" | "3" | "4" | "5" | "inherit";
export type ReviewSnippetsSize = "large" | "medium" | "small";
export type ReviewSnippetsArrowsVisibility =
  "always_hidden" | "always_shown" | "hidden_on_mobile";
export type ReviewSnippetsCornerStyle =
  "extra_round" | "inherit" | "round" | "soft" | "square";

export interface ReviewSnippetsConfig {
  reviewSelection: ReviewSnippetsSelection;
  selectedProductIds: readonly string[];
  collectionId?: string;
  maxReviews: number;
  minStarRating: ReviewSnippetsStarRating;
  filterPinned: boolean;
  filterFeatured: boolean;
  customTags: readonly string[];
  reviewLength: ReviewSnippetsSize;
  textSize: ReviewSnippetsSize;
  maxWidth: number;
  maxImageSize: ReviewSnippetsSize;
  arrowsVisibility: ReviewSnippetsArrowsVisibility;
  transitionSpeed: number;
  showReviewMedia: boolean;
  cornerStyle: ReviewSnippetsCornerStyle;
  isAwesome: boolean;
  textColor: string;
  lighterTextColor: string;
  cardColor: string;
  starsColor: string;
  arrowsColor: string;
  arrowsBackgroundColor: string;
}

export type ReviewSnippetsReview = Readonly<Record<string, JudgeMeJsonValue>>;

export interface ReviewSnippetsPageData {
  requestUrl: string;
  reviews: readonly ReviewSnippetsReview[];
  settings: Readonly<Record<string, JudgeMeJsonValue>>;
}

export interface ReviewSnippetsData {
  config: ReviewSnippetsConfig;
  page: ReviewSnippetsPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface FetchReviewSnippetsPageOptions {
  shopDomain: string;
  productId?: string;
  config?: Partial<ReviewSnippetsConfig>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchReviewSnippetsOptions extends FetchReviewSnippetsPageOptions {
  publicToken: string;
}

export interface CreateReviewSnippetsDataOptions {
  config?: Partial<ReviewSnippetsConfig>;
  page: ReviewSnippetsPageData;
  productId?: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

const DEFAULT_REVIEW_SNIPPETS_CONFIG: ReviewSnippetsConfig = {
  reviewSelection: "auto",
  selectedProductIds: [],
  maxReviews: 5,
  minStarRating: "inherit",
  filterPinned: false,
  filterFeatured: false,
  customTags: [],
  reviewLength: "medium",
  textSize: "medium",
  maxWidth: 1100,
  maxImageSize: "small",
  arrowsVisibility: "always_shown",
  transitionSpeed: 5,
  showReviewMedia: true,
  cornerStyle: "inherit",
  isAwesome: false,
  textColor: "",
  lighterTextColor: "",
  cardColor: "",
  starsColor: "",
  arrowsColor: "",
  arrowsBackgroundColor: "",
};

interface ReviewSnippetsApiResponse {
  reviews?: unknown;
  settings?: unknown;
}

/** Fetches the current tokenless Review Snippets feed and styling fallback. */
export async function fetchReviewSnippetsPage({
  shopDomain,
  productId,
  config: configInput,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchReviewSnippetsPageOptions): Promise<ReviewSnippetsPageData> {
  const context = normalizeReviewSnippetsContext({
    config: configInput,
    productId,
    shopDomain,
  });
  const url = createReviewSnippetsRequestUrl(context);
  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me Review Snippets request failed with HTTP ${response.status}.`,
    );
  }

  let payload: ReviewSnippetsApiResponse;
  try {
    payload = (await response.json()) as ReviewSnippetsApiResponse;
  } catch {
    throw new Error("Judge.me Review Snippets returned invalid JSON.");
  }

  return normalizeReviewSnippetsPage(payload, url, context.config.maxReviews);
}

/** Fetches a standalone Review Snippets payload with shared Judge.me settings. */
export async function fetchReviewSnippets({
  shopDomain,
  publicToken,
  productId,
  config,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchReviewSnippetsOptions): Promise<ReviewSnippetsData> {
  const [page, counter] = await Promise.all([
    fetchReviewSnippetsPage({
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

  return createReviewSnippetsData({
    config,
    page,
    productId,
    settings: counter.settings,
    shopDomain,
  });
}

/** Combines a snippets page with settings already fetched by another widget. */
export function createReviewSnippetsData({
  config: configInput,
  page,
  productId,
  settings,
  shopDomain,
}: CreateReviewSnippetsDataOptions): ReviewSnippetsData {
  const context = normalizeReviewSnippetsContext({
    config: configInput,
    productId,
    shopDomain,
  });
  const expectedRequestUrl = createReviewSnippetsRequestUrl(context);

  if (
    canonicalizeRequestUrl(page.requestUrl) !==
    canonicalizeRequestUrl(expectedRequestUrl)
  ) {
    throw new Error("Judge.me returned mismatched Review Snippets data.");
  }

  return {
    config: context.config,
    page,
    productId: context.productId,
    settings,
    shopDomain: context.shopDomain,
  };
}

/** Normalizes the current Review Snippets app-block configuration. */
export function normalizeReviewSnippetsConfig(
  config: Partial<ReviewSnippetsConfig> = {},
): ReviewSnippetsConfig {
  const normalized: ReviewSnippetsConfig = {
    ...DEFAULT_REVIEW_SNIPPETS_CONFIG,
    ...config,
    selectedProductIds: uniqueTrimmedValues(config.selectedProductIds),
    collectionId: config.collectionId?.trim() || undefined,
    customTags: uniqueTrimmedValues(config.customTags),
    textColor: normalizeColorOverride(config.textColor),
    lighterTextColor: normalizeColorOverride(config.lighterTextColor),
    cardColor: normalizeColorOverride(config.cardColor),
    starsColor: normalizeColorOverride(config.starsColor),
    arrowsColor: normalizeColorOverride(config.arrowsColor),
    arrowsBackgroundColor: normalizeColorOverride(config.arrowsBackgroundColor),
  };

  assertIntegerInRange(normalized.maxReviews, 1, 10, "review count");
  assertIntegerInRange(normalized.maxWidth, 320, 2_000, "maximum width");
  assertIntegerInRange(normalized.transitionSpeed, 0, 60, "transition speed");

  return normalized;
}

function normalizeReviewSnippetsContext({
  config: configInput,
  productId,
  shopDomain,
}: {
  config?: Partial<ReviewSnippetsConfig>;
  productId?: string;
  shopDomain: string;
}) {
  const config = normalizeReviewSnippetsConfig(configInput);
  const normalizedProductId = productId
    ? getShopifyNumericId(productId)
    : undefined;
  const normalizedSelectedProductIds = config.selectedProductIds.map((id) =>
    getShopifyNumericId(id),
  );
  const normalizedConfig = {
    ...config,
    selectedProductIds: normalizedSelectedProductIds,
  };

  assertReviewSnippetsSelectionContext(normalizedConfig, normalizedProductId);

  return {
    config: normalizedConfig,
    productId: normalizedProductId,
    shopDomain: normalizeShopDomain(shopDomain),
  };
}

function createReviewSnippetsRequestUrl({
  config,
  productId,
  shopDomain,
}: {
  config: ReviewSnippetsConfig;
  productId?: string;
  shopDomain: string;
}): URL {
  const url = new URL(REVIEW_SNIPPETS_PATH, JUDGE_ME_API);
  url.searchParams.set("v", "2");

  if (
    productId &&
    (config.reviewSelection === "auto" ||
      config.reviewSelection === "current_product")
  ) {
    url.searchParams.set("product_id", productId);
  }

  url.searchParams.set("selection_source", config.reviewSelection);

  if (
    config.collectionId &&
    (config.reviewSelection === "auto" ||
      config.reviewSelection === "current_collection")
  ) {
    url.searchParams.set("collection_id", config.collectionId);
  }

  url.searchParams.set("count", String(config.maxReviews));
  url.searchParams.set(
    "min_star_rating",
    config.minStarRating === "inherit" ? "" : config.minStarRating,
  );

  if (config.filterPinned) url.searchParams.append("tag_filter[]", "pinned");
  if (config.filterFeatured) {
    url.searchParams.append("tag_filter[]", "featured");
  }
  for (const tag of config.customTags) {
    url.searchParams.append("custom_tags[]", tag);
  }
  if (config.reviewSelection === "custom") {
    for (const selectedProductId of config.selectedProductIds) {
      url.searchParams.append("product_ids[]", selectedProductId);
    }
  }

  url.searchParams.set("shop_domain", shopDomain);
  url.searchParams.set("platform", "shopify");
  return url;
}

function normalizeReviewSnippetsPage(
  payload: ReviewSnippetsApiResponse,
  requestUrl: URL,
  maxReviews: number,
): ReviewSnippetsPageData {
  if (!Array.isArray(payload.reviews) || !isJsonObject(payload.settings)) {
    throw new Error("Judge.me returned invalid Review Snippets data.");
  }

  const reviews = payload.reviews.slice(0, maxReviews).map((review) => {
    if (
      !isJsonObject(review) ||
      typeof review.uuid !== "string" ||
      !review.uuid.trim() ||
      typeof review.public_reviewer_name !== "string" ||
      typeof review.body_html !== "string"
    ) {
      throw new Error("Judge.me returned an invalid Review Snippets review.");
    }

    const rating = Number(review.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error("Judge.me returned an invalid Review Snippets rating.");
    }
    assertSafeReviewBody(review.body_html);

    return review;
  });

  return {
    requestUrl: requestUrl.toString(),
    reviews,
    settings: payload.settings,
  };
}

function assertReviewSnippetsSelectionContext(
  config: ReviewSnippetsConfig,
  productId: string | undefined,
): void {
  if (config.reviewSelection === "current_product" && !productId) {
    throw new Error(
      "Judge.me Review Snippets current_product selection requires a product ID.",
    );
  }
  if (config.reviewSelection === "current_collection" && !config.collectionId) {
    throw new Error(
      "Judge.me Review Snippets current_collection selection requires a collection ID.",
    );
  }
  if (
    config.reviewSelection === "custom" &&
    config.selectedProductIds.length === 0
  ) {
    throw new Error(
      "Judge.me Review Snippets custom selection requires product IDs.",
    );
  }
}

function canonicalizeRequestUrl(value: string | URL): string {
  const url = new URL(value);
  const params: Array<[string, string]> = [];
  url.searchParams.forEach((paramValue, paramKey) => {
    params.push([paramKey, paramValue]);
  });
  params.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey
      ? leftValue.localeCompare(rightValue)
      : leftKey.localeCompare(rightKey),
  );
  const search = new URLSearchParams(params);
  return `${url.origin}${url.pathname}?${search.toString()}`;
}

function uniqueTrimmedValues(values: readonly string[] | undefined): string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ];
}

function normalizeColorOverride(value: string | undefined): string {
  return value === undefined ? "" : value.trim();
}

function assertSafeReviewBody(html: string): void {
  if (
    /<script\b/i.test(html) ||
    /\son[a-z][\w:-]*\s*=/i.test(html) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(html)
  ) {
    throw new Error("Judge.me returned executable Review Snippets markup.");
  }
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `Judge.me Review Snippets ${label} must be between ${minimum} and ${maximum}.`,
    );
  }
}

function isJsonObject(
  value: unknown,
): value is Record<string, JudgeMeJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
