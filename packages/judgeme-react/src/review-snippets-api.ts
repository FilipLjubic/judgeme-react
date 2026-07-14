import { normalizeShopDomain } from "./config.js";
import {
  fetchAllReviewsCounter,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";
import { getShopifyNumericId } from "./shopify.js";
import {
  EMPTY_JUDGE_ME_SETTINGS,
  settleOptionalJudgeMeValue,
} from "./resilient-data.js";

const JUDGE_ME_API = "https://api.judge.me";
const JUDGE_ME_CDN_API = "https://cdn.judge.me";
const REVIEW_SNIPPETS_PATH = "/reviews/reviews_for_review_snippet_widget";
const REVIEWS_CAROUSEL_PATH = "/reviews/reviews_for_carousel";

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
  /** The public URL that supplied `reviews`; defaults to `requestUrl`. */
  sourceUrl?: string;
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

interface ReviewSnippetsFallbackResponse {
  reviews?: unknown;
}

type PublicJsonAttempt =
  | { ok: true; payload: unknown }
  | { error: Error; ok: false };

/** Fetches public Review Snippets data without either Judge.me token. */
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
  const requestUrl = createReviewSnippetsRequestUrl(context);
  const primary = await attemptPublicJsonRequest({
    fetchImplementation,
    label: "Review Snippets",
    signal,
    url: requestUrl,
  });

  if (primary.ok) {
    return normalizeReviewSnippetsPage(
      primary.payload as ReviewSnippetsApiResponse,
      requestUrl,
      requestUrl,
      context.config.maxReviews,
    );
  }

  const sourceUrl = createReviewSnippetsFallbackUrl(context);
  const fallback = await attemptPublicJsonRequest({
    fetchImplementation,
    label: "Review Snippets public carousel fallback",
    signal,
    url: sourceUrl,
  });
  if (!fallback.ok) {
    throw new Error(
      `Judge.me Review Snippets public sources failed. Primary: ${primary.error.message} Fallback: ${fallback.error.message}`,
    );
  }

  return normalizeReviewSnippetsFallbackPage(
    fallback.payload as ReviewSnippetsFallbackResponse,
    requestUrl,
    sourceUrl,
    context.config,
  );
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

  return createReviewSnippetsData({
    config,
    page,
    productId,
    settings: counter?.settings ?? EMPTY_JUDGE_ME_SETTINGS,
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

function createReviewSnippetsFallbackUrl({
  config,
  productId,
  shopDomain,
}: {
  config: ReviewSnippetsConfig;
  productId?: string;
  shopDomain: string;
}): URL {
  const url = new URL(REVIEWS_CAROUSEL_PATH, JUDGE_ME_CDN_API);
  const selection = mapReviewSnippetsFallbackSelection(
    config.reviewSelection,
    Boolean(productId),
  );

  url.searchParams.set("reviews_selection", selection);
  url.searchParams.set("carousel_type", "cards");
  url.searchParams.set(
    "star_rating",
    mapReviewSnippetsFallbackRating(config.minStarRating),
  );
  url.searchParams.set(
    "max_reviews",
    String(config.minStarRating === "2" ? 30 : config.maxReviews),
  );
  url.searchParams.set("url", `https://${shopDomain}`);
  url.searchParams.set("shop_domain", shopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("primary_language", "en");
  url.searchParams.set("display_order", "most_recent");

  if (selection === "current_product" && productId) {
    url.searchParams.set("product_ids", productId);
  }
  if (selection === "current_collection" && config.collectionId) {
    url.searchParams.set("collection_id", config.collectionId);
  }
  if (selection === "custom_products") {
    for (const selectedProductId of config.selectedProductIds) {
      url.searchParams.append("product_ids[]", selectedProductId);
    }
  }

  return url;
}

function mapReviewSnippetsFallbackSelection(
  selection: ReviewSnippetsSelection,
  hasProductId: boolean,
): string {
  switch (selection) {
    case "auto":
      return hasProductId ? "current_product" : "all";
    case "current_collection":
    case "current_product":
      return selection;
    case "custom":
      return "custom_products";
    case "product":
      return "product_reviews";
    case "store":
      return "store_reviews";
    default:
      return "all";
  }
}

function mapReviewSnippetsFallbackRating(
  minStarRating: ReviewSnippetsStarRating,
): string {
  switch (minStarRating) {
    case "5":
      return "5_star";
    case "4":
      return "4_to_5_star";
    case "3":
      return "3_to_5_star";
    default:
      return "all";
  }
}

async function attemptPublicJsonRequest({
  fetchImplementation,
  label,
  signal,
  url,
}: {
  fetchImplementation: typeof globalThis.fetch;
  label: string;
  signal?: AbortSignal;
  url: URL;
}): Promise<PublicJsonAttempt> {
  try {
    const response = await fetchImplementation(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) {
      return {
        error: new Error(`${label} request failed with HTTP ${response.status}.`),
        ok: false,
      };
    }

    try {
      return { ok: true, payload: await response.json() };
    } catch {
      return {
        error: new Error(`${label} returned invalid JSON.`),
        ok: false,
      };
    }
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;
    return {
      error:
        error instanceof Error
          ? new Error(`${label} request failed: ${error.message}`)
          : new Error(`${label} request failed.`),
      ok: false,
    };
  }
}

function normalizeReviewSnippetsPage(
  payload: ReviewSnippetsApiResponse,
  requestUrl: URL,
  sourceUrl: URL,
  maxReviews: number,
): ReviewSnippetsPageData {
  const reviews = (Array.isArray(payload.reviews) ? payload.reviews : [])
    .flatMap((review) => {
      if (
        !isJsonObject(review) ||
        typeof review.uuid !== "string" ||
        !review.uuid.trim() ||
        typeof review.public_reviewer_name !== "string" ||
        typeof review.body_html !== "string"
      ) {
        return [];
      }

      const rating = Number(review.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return [];
      assertSafeReviewBody(review.body_html);

      return [review];
    })
    .slice(0, maxReviews);

  return {
    requestUrl: requestUrl.toString(),
    sourceUrl: sourceUrl.toString(),
    reviews,
    settings: isJsonObject(payload.settings) ? payload.settings : {},
  };
}

function normalizeReviewSnippetsFallbackPage(
  payload: ReviewSnippetsFallbackResponse,
  requestUrl: URL,
  sourceUrl: URL,
  config: ReviewSnippetsConfig,
): ReviewSnippetsPageData {
  const minimumRating =
    config.minStarRating === "inherit" ? 1 : Number(config.minStarRating);
  const reviews = (Array.isArray(payload.reviews) ? payload.reviews : [])
    .flatMap((review) => {
      const normalized = normalizeReviewSnippetsFallbackReview(review);
      if (!normalized || Number(normalized.rating) < minimumRating) return [];
      return [normalized];
    })
    .slice(0, config.maxReviews);

  return {
    requestUrl: requestUrl.toString(),
    sourceUrl: sourceUrl.toString(),
    reviews,
    settings: {},
  };
}

function normalizeReviewSnippetsFallbackReview(
  review: unknown,
): ReviewSnippetsReview | undefined {
  if (!isJsonObject(review)) return undefined;

  const uuid = readPublicString(review.uuid);
  const reviewerName =
    readPublicString(review.public_reviewer_name) ||
    readPublicString(review.reviewer_name);
  const rating = Number(review.rating);
  if (
    !uuid ||
    !reviewerName ||
    !Number.isFinite(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return undefined;
  }

  const bodyHtml =
    typeof review.body_html === "string"
      ? review.body_html
      : typeof review.body === "string"
        ? `<p>${escapeHtml(review.body)}</p>`
        : "";
  assertSafeReviewBody(bodyHtml);

  const productName =
    readPublicString(review.product_name) ||
    readPublicString(review.product_title_localized) ||
    readPublicString(review.product_title);

  return {
    uuid,
    rating,
    body_html: bodyHtml,
    public_reviewer_name: reviewerName,
    verified_buyer: review.verified_buyer === true,
    product_name: productName,
    product_variant_title: readPublicString(review.product_variant_title),
    review_image_url: readReviewImageUrl(review),
  };
}

function readReviewImageUrl(
  review: Record<string, JudgeMeJsonValue>,
): string | null {
  const direct = normalizePublicImageUrl(review.review_image_url);
  if (direct) return direct;

  const pictureUrl = readNestedImageUrl(review.picture);
  if (pictureUrl) return pictureUrl;

  if (Array.isArray(review.pictures_urls)) {
    for (const picture of review.pictures_urls) {
      const url = readNestedImageUrl(picture);
      if (url) return url;
    }
  }
  return null;
}

function readNestedImageUrl(value: JudgeMeJsonValue | undefined): string | null {
  if (!isJsonObject(value)) return null;
  const urls = isJsonObject(value.urls) ? value.urls : value;
  return (
    normalizePublicImageUrl(urls.small) ||
    normalizePublicImageUrl(urls.compact) ||
    normalizePublicImageUrl(urls.original) ||
    normalizePublicImageUrl(urls.huge)
  );
}

function normalizePublicImageUrl(value: JudgeMeJsonValue | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readPublicString(value: JudgeMeJsonValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
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
