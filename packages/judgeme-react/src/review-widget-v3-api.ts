import { normalizeShopDomain } from "./config.js";
import { fetchHappyCustomersPage } from "./happy-customers-api.js";
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

const JUDGE_ME_CDN_API = "https://cdn.judge.me";
const JUDGE_ME_API = "https://api.judge.me";
const REVIEW_WIDGET_PATH = "/reviews/reviews_for_widget";
const SAMPLE_REVIEW_WIDGET_PATH = "/reviews/sample_review_widget_data";

export type ReviewWidgetV3EmptyState =
  "empty_widget" | "hide_widget" | "other_products_reviews";
export type ReviewWidgetV3Source = "cdn" | "disabled-preview";

export interface ReviewWidgetV3Config {
  /** Mirrors the Shopify app block's 200–1200px width control. */
  maxWidth: number;
  /** Adds Judge.me's Store reviews tab when store reviews exist. */
  showStoreReviews: boolean;
  /** Controls the official zero-review behavior. */
  emptyState: ReviewWidgetV3EmptyState;
}

export type ReviewWidgetV3Review = Readonly<Record<string, JudgeMeJsonValue>>;

export interface ReviewWidgetV3Pagination {
  currentPage: number;
  perPage: number;
  totalPages: number;
}

export interface ReviewWidgetV3PageData {
  averageRating: number;
  numberOfQuestions: number;
  numberOfReviews: number;
  otherLanguagePagination: ReviewWidgetV3Pagination;
  otherLanguageReviews: readonly ReviewWidgetV3Review[];
  pagination: ReviewWidgetV3Pagination;
  primaryLanguage: string;
  primaryLanguagePagination: ReviewWidgetV3Pagination;
  primaryLanguageReviews: readonly ReviewWidgetV3Review[];
  /** Validated JSON consumed by Judge.me's current manager. Invalid rows are removed. */
  payload: Readonly<Record<string, JudgeMeJsonValue>>;
  requestUrl: string;
  reviews: readonly ReviewWidgetV3Review[];
  source: ReviewWidgetV3Source;
}

export interface ReviewWidgetV3Data {
  config: ReviewWidgetV3Config;
  enabled: boolean;
  page: ReviewWidgetV3PageData;
  product: {
    handle: string;
    id: string;
    title: string;
  };
  settings: JudgeMeRuntimeSettings;
  shopAggregate: {
    count: number;
    rating: number;
  };
  shopDomain: string;
  shopReviewsCount: number;
  source: ReviewWidgetV3Source;
}

export interface FetchReviewWidgetV3PageOptions {
  fetch?: typeof globalThis.fetch;
  /** Uses Judge.me's official theme-editor sample when this shop returns legacy HTML. */
  previewWhenDisabled?: boolean;
  productId: string;
  shopDomain: string;
  signal?: AbortSignal;
}

export interface FetchReviewWidgetV3Options extends FetchReviewWidgetV3PageOptions {
  config?: Partial<ReviewWidgetV3Config>;
  productHandle: string;
  productTitle: string;
  publicToken: string;
}

export interface CreateReviewWidgetV3DataOptions {
  config?: Partial<ReviewWidgetV3Config>;
  page: ReviewWidgetV3PageData;
  productHandle: string;
  productId: string;
  productTitle: string;
  settings: JudgeMeRuntimeSettings;
  shopAggregate: ReviewWidgetV3Data["shopAggregate"];
  shopDomain: string;
  shopReviewsCount: number;
}

const DEFAULT_REVIEW_WIDGET_V3_CONFIG: ReviewWidgetV3Config = {
  emptyState: "empty_widget",
  maxWidth: 1200,
  showStoreReviews: false,
};

/** Reads the new Review Widget's initial page from Judge.me's tokenless CDN. */
export async function fetchReviewWidgetV3Page({
  fetch: fetchImplementation = globalThis.fetch,
  previewWhenDisabled = false,
  productId,
  shopDomain,
  signal,
}: FetchReviewWidgetV3PageOptions): Promise<ReviewWidgetV3PageData | null> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedProductId = getShopifyNumericId(productId);
  const url = createReviewWidgetRequestUrl(
    normalizedShopDomain,
    normalizedProductId,
  );
  const payload = await fetchJson(fetchImplementation, url, signal);

  if (isLegacyReviewWidgetResponse(payload)) {
    if (!previewWhenDisabled) return null;

    const sampleUrl = createSampleReviewWidgetRequestUrl(normalizedShopDomain);
    const samplePayload = await fetchJson(
      fetchImplementation,
      sampleUrl,
      signal,
    );
    return normalizeReviewWidgetPage(
      samplePayload,
      sampleUrl,
      "disabled-preview",
    );
  }

  return normalizeReviewWidgetPage(payload, url, "cdn");
}

/** Fetches the v3 widget plus the public settings and shop aggregates it needs. */
export async function fetchReviewWidgetV3({
  config,
  fetch: fetchImplementation = globalThis.fetch,
  previewWhenDisabled,
  productHandle,
  productId,
  productTitle,
  publicToken,
  shopDomain,
  signal,
}: FetchReviewWidgetV3Options): Promise<ReviewWidgetV3Data | null> {
  const [page, counter, allReviewsPage] = await Promise.all([
    fetchReviewWidgetV3Page({
      fetch: fetchImplementation,
      previewWhenDisabled,
      productId,
      shopDomain,
      signal,
    }),
    settleOptionalJudgeMeValue(
      () =>
        fetchAllReviewsCounter({
          fetch: fetchImplementation,
          publicToken,
          shopDomain,
          signal,
        }),
      signal,
    ),
    settleOptionalJudgeMeValue(
      () =>
        fetchHappyCustomersPage({
          fetch: fetchImplementation,
          shopDomain,
          signal,
        }),
      signal,
    ),
  ]);

  if (!page) return null;
  const fallbackAggregate = {
    count: page.numberOfReviews,
    rating: page.averageRating,
  };

  return createReviewWidgetV3Data({
    config,
    page,
    productHandle,
    productId,
    productTitle,
    settings: counter?.settings ?? EMPTY_JUDGE_ME_SETTINGS,
    shopAggregate: counter
      ? { count: counter.count, rating: Number(counter.rating) }
      : fallbackAggregate,
    shopDomain,
    shopReviewsCount: allReviewsPage?.numberOfShopReviews ?? 0,
  });
}

/** Combines a v3 page with settings and aggregates already fetched by the route. */
export function createReviewWidgetV3Data({
  config: configInput,
  page,
  productHandle,
  productId,
  productTitle,
  settings,
  shopAggregate,
  shopDomain,
  shopReviewsCount,
}: CreateReviewWidgetV3DataOptions): ReviewWidgetV3Data {
  const config = normalizeReviewWidgetV3Config(configInput);
  const normalizedProductId = getShopifyNumericId(productId);
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const count = normalizeNonNegativeInteger(
    shopAggregate.count,
    "shop review count",
  );
  const rating = normalizeRating(shopAggregate.rating, "shop rating");

  if (!productHandle.trim() || !productTitle.trim()) {
    throw new Error("Judge.me Review Widget v3 requires product metadata.");
  }

  return {
    config,
    enabled: page.source === "cdn",
    page,
    product: {
      handle: productHandle.trim(),
      id: normalizedProductId,
      title: productTitle.trim(),
    },
    settings,
    shopAggregate: { count, rating },
    shopDomain: normalizedShopDomain,
    shopReviewsCount: normalizeNonNegativeInteger(
      shopReviewsCount,
      "store-review count",
    ),
    source: page.source,
  };
}

/** Normalizes the app-block settings that are not present in Judge.me settings. */
export function normalizeReviewWidgetV3Config(
  config: Partial<ReviewWidgetV3Config> = {},
): ReviewWidgetV3Config {
  const normalized = { ...DEFAULT_REVIEW_WIDGET_V3_CONFIG, ...config };

  if (
    !(
      ["empty_widget", "hide_widget", "other_products_reviews"] as const
    ).includes(normalized.emptyState)
  ) {
    throw new Error("Judge.me Review Widget v3 empty state is invalid.");
  }
  if (typeof normalized.showStoreReviews !== "boolean") {
    throw new Error(
      "Judge.me Review Widget v3 store-review setting is invalid.",
    );
  }
  if (
    !Number.isSafeInteger(normalized.maxWidth) ||
    normalized.maxWidth < 200 ||
    normalized.maxWidth > 1200
  ) {
    throw new Error(
      "Judge.me Review Widget v3 maximum width must be between 200 and 1200.",
    );
  }

  return normalized;
}

function createReviewWidgetRequestUrl(
  shopDomain: string,
  productId: string,
): URL {
  const url = new URL(REVIEW_WIDGET_PATH, JUDGE_ME_CDN_API);
  url.searchParams.set("shop_domain", shopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("product_id", productId);
  url.searchParams.set("page", "1");
  return url;
}

function createSampleReviewWidgetRequestUrl(shopDomain: string): URL {
  const url = new URL(SAMPLE_REVIEW_WIDGET_PATH, JUDGE_ME_API);
  url.searchParams.set("shop_domain", shopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("review_type", "product");
  return url;
}

async function fetchJson(
  fetchImplementation: typeof globalThis.fetch,
  url: URL,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Judge.me Review Widget v3 request failed with HTTP ${response.status}.`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Judge.me Review Widget v3 returned invalid JSON.");
  }
}

function isLegacyReviewWidgetResponse(value: unknown): boolean {
  return (
    isUnknownObject(value) &&
    typeof value.html === "string" &&
    !Array.isArray(value.reviews)
  );
}

function normalizeReviewWidgetPage(
  value: unknown,
  requestUrl: URL,
  source: ReviewWidgetV3Source,
): ReviewWidgetV3PageData {
  if (!isJsonObject(value)) {
    throw new Error("Judge.me returned invalid Review Widget v3 data.");
  }

  const rawPayload =
    source === "disabled-preview" ? removeBrokenSampleVideos(value) : value;
  const defaultReviews = normalizeReviews(rawPayload.reviews);
  const primaryLanguageReviews = normalizeReviews(
    rawPayload.primary_language_reviews,
  );
  const otherLanguageReviews = normalizeReviews(
    rawPayload.other_language_reviews,
  );
  const photoGallery = normalizeReviews(rawPayload.photo_gallery);
  const reviews =
    defaultReviews.length > 0
      ? defaultReviews
      : [...primaryLanguageReviews, ...otherLanguageReviews];
  const fallbackPagination: ReviewWidgetV3Pagination = {
    currentPage: 1,
    perPage: Math.max(1, reviews.length),
    totalPages: reviews.length > 0 ? 1 : 0,
  };
  const pagination = normalizePagination(
    rawPayload.pagination ??
      rawPayload.primary_language_pagination ??
      rawPayload.other_language_pagination,
    fallbackPagination,
  );
  const primaryLanguagePagination = normalizePagination(
    rawPayload.primary_language_pagination ?? rawPayload.pagination,
    pagination,
  );
  const otherLanguagePagination = normalizePagination(
    rawPayload.other_language_pagination ?? rawPayload.pagination,
    pagination,
  );
  const averageRating = readRating(
    rawPayload.average_rating,
    calculateAverageReviewRating(reviews),
  );
  const numberOfQuestions = readNonNegativeInteger(
    rawPayload.number_of_questions,
    0,
  );
  const numberOfReviews = readNonNegativeInteger(
    rawPayload.number_of_reviews,
    reviews.length,
  );
  const payload: Record<string, JudgeMeJsonValue> = {
    ...rawPayload,
    average_rating: averageRating,
    number_of_questions: numberOfQuestions,
    number_of_reviews: numberOfReviews,
    other_language_pagination: serializePagination(otherLanguagePagination),
    other_language_reviews: [...otherLanguageReviews],
    pagination: serializePagination(pagination),
    photo_gallery: [...photoGallery],
    primary_language_pagination: serializePagination(
      primaryLanguagePagination,
    ),
    primary_language_reviews: [...primaryLanguageReviews],
    reviews: [...defaultReviews],
  };

  return {
    averageRating,
    numberOfQuestions,
    numberOfReviews,
    otherLanguagePagination,
    otherLanguageReviews,
    pagination,
    payload,
    primaryLanguage:
      typeof rawPayload.primary_language === "string"
        ? rawPayload.primary_language.trim()
        : "",
    primaryLanguagePagination,
    primaryLanguageReviews,
    requestUrl: requestUrl.toString(),
    reviews,
    source,
  };
}

function removeBrokenSampleVideos(
  payload: Record<string, JudgeMeJsonValue>,
): Record<string, JudgeMeJsonValue> {
  return {
    ...payload,
    // Judge.me's current sample points at a removed Vimeo fixture (HTTP 404).
    // Real CDN payloads are left untouched, including working video reviews.
    ...stripVideoIdsFromReviewList(payload, "reviews"),
    ...stripVideoIdsFromReviewList(payload, "primary_language_reviews"),
    ...stripVideoIdsFromReviewList(payload, "other_language_reviews"),
    ...stripVideoIdsFromReviewList(payload, "photo_gallery"),
  };
}

function stripVideoIdsFromReviewList(
  payload: Record<string, JudgeMeJsonValue>,
  key:
    | "other_language_reviews"
    | "photo_gallery"
    | "primary_language_reviews"
    | "reviews",
): Record<string, JudgeMeJsonValue> {
  const value = payload[key];
  if (!Array.isArray(value)) return {};

  return {
    [key]: value.map((review) =>
      isJsonObject(review) ? { ...review, video_external_ids: [] } : review,
    ),
  };
}

function normalizeReviews(value: JudgeMeJsonValue | undefined) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((review) => {
    if (
      !isJsonObject(review) ||
      typeof review.uuid !== "string" ||
      !review.uuid.trim() ||
      typeof review.body_html !== "string"
    ) {
      return [];
    }
    const rating = Number(review.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return [];
    assertSafeReviewBody(review.body_html);
    return [review];
  });
}

function normalizePagination(
  value: JudgeMeJsonValue | undefined,
  fallback: ReviewWidgetV3Pagination,
): ReviewWidgetV3Pagination {
  if (!isJsonObject(value)) return fallback;
  return {
    currentPage: readPositiveInteger(value.current_page, fallback.currentPage),
    perPage: readPositiveInteger(value.per_page, fallback.perPage),
    totalPages: readNonNegativeInteger(value.total_pages, fallback.totalPages),
  };
}

function serializePagination(
  pagination: ReviewWidgetV3Pagination,
): Record<string, JudgeMeJsonValue> {
  return {
    current_page: pagination.currentPage,
    per_page: pagination.perPage,
    total_pages: pagination.totalPages,
  };
}

function calculateAverageReviewRating(
  reviews: readonly ReviewWidgetV3Review[],
): number {
  if (reviews.length === 0) return 0;
  return (
    reviews.reduce((total, review) => total + Number(review.rating), 0) /
    reviews.length
  );
}

function assertSafeReviewBody(html: string): void {
  if (
    /<script\b/i.test(html) ||
    /\son[a-z][\w:-]*\s*=/i.test(html) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(html)
  ) {
    throw new Error("Judge.me returned executable Review Widget v3 markup.");
  }
}

function normalizeRating(value: unknown, label: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 5) {
    throw new Error(`Judge.me returned an invalid Review Widget v3 ${label}.`);
  }
  return normalized;
}

function readRating(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 && normalized <= 5
    ? normalized
    : fallback;
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

function normalizeNonNegativeInteger(value: unknown, label: string): number {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error(`Judge.me returned invalid Review Widget v3 ${label}.`);
  }
  return normalized;
}

function isUnknownObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(
  value: unknown,
): value is Record<string, JudgeMeJsonValue> {
  return isUnknownObject(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JudgeMeJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isUnknownObject(value) && Object.values(value).every(isJsonValue);
}
