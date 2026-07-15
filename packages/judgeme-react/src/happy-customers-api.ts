import { normalizeShopDomain } from "./config.js";
import {
  fetchAllReviewsWidget,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";
import {
  settleOptionalJudgeMeValue,
  summarizeRatedRecords,
} from "./resilient-data.js";

const JUDGE_ME_CDN_API = "https://cdn.judge.me";
const HAPPY_CUSTOMERS_PATH = "/reviews/all_reviews_js_based";

export type HappyCustomersReviewSource = "all" | "product" | "store";
export type HappyCustomersReviewType =
  "all-reviews" | "product-reviews" | "shop-reviews";
export type HappyCustomersShowFirst = "product" | "store";
export type HappyCustomersEmptyState = "empty_widget" | "show_widget";
export type HappyCustomersSource = "cdn-fallback" | "disabled-preview";

export interface HappyCustomersConfig {
  reviewSource: HappyCustomersReviewSource;
  showFirst: HappyCustomersShowFirst;
  showAllReviewsInSameTab: boolean;
  emptyState: HappyCustomersEmptyState;
  maxWidth: number;
}

export type HappyCustomersReview = Readonly<Record<string, JudgeMeJsonValue>>;

export interface HappyCustomersPagination {
  currentPage: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface HappyCustomersPageData {
  customFormFiltersAndAverages: JudgeMeJsonValue;
  numberOfProductReviews: number;
  numberOfShopReviews: number;
  otherLanguagePagination: HappyCustomersPagination;
  otherLanguageReviews: readonly HappyCustomersReview[];
  pagination: HappyCustomersPagination;
  primaryLanguage: string;
  primaryLanguagePagination: HappyCustomersPagination;
  primaryLanguageReviews: readonly HappyCustomersReview[];
  requestUrl: string;
  reviewType: HappyCustomersReviewType;
  reviews: readonly HappyCustomersReview[];
}

export interface HappyCustomersHistogramRow {
  frequency: number;
  percentage: number;
  rating: number;
}

export interface HappyCustomersData {
  aggregate: {
    count: number;
    rating: number;
  };
  config: HappyCustomersConfig;
  enabled: boolean;
  histogram: readonly HappyCustomersHistogramRow[];
  page: HappyCustomersPageData;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  source: HappyCustomersSource;
  /** Shared dashboard CSS used by Judge.me's exact runtime and icon fonts. */
  styles?: string;
}

export interface FetchHappyCustomersPageOptions {
  config?: Partial<HappyCustomersConfig>;
  fetch?: typeof globalThis.fetch;
  shopDomain: string;
  signal?: AbortSignal;
}

export interface FetchHappyCustomersOptions extends FetchHappyCustomersPageOptions {
  previewWhenDisabled?: boolean;
  publicToken: string;
}

export interface CreateHappyCustomersDataOptions {
  aggregate: HappyCustomersData["aggregate"];
  config?: Partial<HappyCustomersConfig>;
  legacyHtml: string;
  page: HappyCustomersPageData;
  previewWhenDisabled?: boolean;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  styles?: string;
}

const DEFAULT_HAPPY_CUSTOMERS_CONFIG: HappyCustomersConfig = {
  reviewSource: "all",
  showFirst: "product",
  showAllReviewsInSameTab: false,
  emptyState: "empty_widget",
  maxWidth: 1200,
};

interface HappyCustomersApiResponse {
  custom_form_filters_and_averages?: unknown;
  number_of_product_reviews?: unknown;
  number_of_shop_reviews?: unknown;
  other_language_pagination?: unknown;
  other_language_reviews?: unknown;
  pagination?: unknown;
  primary_language?: unknown;
  primary_language_pagination?: unknown;
  primary_language_reviews?: unknown;
  reviews?: unknown;
}

/** Fetches the current Happy Customers page from Judge.me's tokenless CDN. */
export async function fetchHappyCustomersPage({
  config: configInput,
  fetch: fetchImplementation = globalThis.fetch,
  shopDomain,
  signal,
}: FetchHappyCustomersPageOptions): Promise<HappyCustomersPageData> {
  const config = normalizeHappyCustomersConfig(configInput);
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const reviewType = getInitialReviewType(config);
  const url = createHappyCustomersRequestUrl(normalizedShopDomain, reviewType);
  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me Happy Customers request failed with HTTP ${response.status}.`,
    );
  }

  let payload: HappyCustomersApiResponse;
  try {
    payload = (await response.json()) as HappyCustomersApiResponse;
  } catch {
    throw new Error("Judge.me Happy Customers returned invalid JSON.");
  }

  return normalizeHappyCustomersPage(payload, url, reviewType);
}

/** Fetches a standalone Happy Customers payload with shared legacy resources. */
export async function fetchHappyCustomers({
  config,
  fetch: fetchImplementation = globalThis.fetch,
  previewWhenDisabled,
  publicToken,
  shopDomain,
  signal,
}: FetchHappyCustomersOptions): Promise<HappyCustomersData | null> {
  const [page, legacyWidget] = await Promise.all([
    fetchHappyCustomersPage({
      config,
      fetch: fetchImplementation,
      shopDomain,
      signal,
    }),
    settleOptionalJudgeMeValue(
      () =>
        fetchAllReviewsWidget({
          fetch: fetchImplementation,
          publicToken,
          shopDomain,
          signal,
        }),
      signal,
    ),
  ]);
  const pageReviews = [
    ...page.reviews,
    ...page.primaryLanguageReviews,
    ...page.otherLanguageReviews,
  ];
  let aggregate = summarizeRatedRecords(
    pageReviews,
    page.numberOfProductReviews + page.numberOfShopReviews,
  );
  if (legacyWidget) {
    try {
      aggregate = readLegacyAggregate(legacyWidget.html);
    } catch {
      // The CDN page still contains enough data to mount the widget.
    }
  }
  const settings =
    legacyWidget?.settings ??
    ({ all_reviews_widget_v2025_enabled: true } as const);

  return createHappyCustomersData({
    aggregate,
    config,
    legacyHtml: legacyWidget?.html ?? "",
    page,
    previewWhenDisabled,
    settings,
    shopDomain,
    styles: legacyWidget?.styles,
  });
}

/** Combines one CDN page with settings and aggregates already fetched nearby. */
export function createHappyCustomersData({
  aggregate,
  config: configInput,
  legacyHtml,
  page,
  previewWhenDisabled = false,
  settings,
  shopDomain,
  styles,
}: CreateHappyCustomersDataOptions): HappyCustomersData | null {
  const config = normalizeHappyCustomersConfig(configInput);
  const expectedReviewType = getInitialReviewType(config);

  if (page.reviewType !== expectedReviewType) {
    throw new Error("Judge.me returned mismatched Happy Customers data.");
  }

  const count = normalizeNonNegativeInteger(aggregate.count, "review count");
  const rating = Number(aggregate.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("Judge.me returned an invalid Happy Customers rating.");
  }

  const enabled = readBooleanSetting(settings.all_reviews_widget_v2025_enabled);
  if (!enabled && !previewWhenDisabled) return null;

  return {
    aggregate: { count, rating },
    config,
    enabled,
    histogram: readLegacyHistogram(legacyHtml, count),
    page,
    settings,
    shopDomain: normalizeShopDomain(shopDomain),
    source: enabled ? "cdn-fallback" : "disabled-preview",
    styles,
  };
}

/** Normalizes the Happy Customers controls owned by Shopify's app block. */
export function normalizeHappyCustomersConfig(
  config: Partial<HappyCustomersConfig> = {},
): HappyCustomersConfig {
  const normalized = { ...DEFAULT_HAPPY_CUSTOMERS_CONFIG, ...config };

  if (
    !(["all", "product", "store"] as const).includes(normalized.reviewSource)
  ) {
    throw new Error("Judge.me Happy Customers review source is invalid.");
  }
  if (!(["product", "store"] as const).includes(normalized.showFirst)) {
    throw new Error("Judge.me Happy Customers first tab is invalid.");
  }
  if (
    !(["empty_widget", "show_widget"] as const).includes(normalized.emptyState)
  ) {
    throw new Error("Judge.me Happy Customers empty state is invalid.");
  }
  if (typeof normalized.showAllReviewsInSameTab !== "boolean") {
    throw new Error("Judge.me Happy Customers tab mode is invalid.");
  }
  if (
    !Number.isSafeInteger(normalized.maxWidth) ||
    normalized.maxWidth < 200 ||
    normalized.maxWidth > 1200
  ) {
    throw new Error(
      "Judge.me Happy Customers maximum width must be between 200 and 1200.",
    );
  }

  return normalized;
}

function getInitialReviewType(
  config: HappyCustomersConfig,
): HappyCustomersReviewType {
  if (config.reviewSource === "product") return "product-reviews";
  if (config.reviewSource === "store") return "shop-reviews";
  if (config.showAllReviewsInSameTab) return "all-reviews";
  return config.showFirst === "store" ? "shop-reviews" : "product-reviews";
}

function createHappyCustomersRequestUrl(
  shopDomain: string,
  reviewType: HappyCustomersReviewType,
): URL {
  const url = new URL(HAPPY_CUSTOMERS_PATH, JUDGE_ME_CDN_API);
  url.searchParams.set("shop_domain", shopDomain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("widget_type", "all-reviews-widget-v2025");
  url.searchParams.set("page", "1");
  if (reviewType !== "product-reviews") {
    url.searchParams.set("review_type", reviewType);
  }
  return url;
}

function normalizeHappyCustomersPage(
  payload: HappyCustomersApiResponse,
  requestUrl: URL,
  reviewType: HappyCustomersReviewType,
): HappyCustomersPageData {
  const reviews = normalizeReviews(payload.reviews);
  const primaryLanguageReviews = normalizeReviews(
    payload.primary_language_reviews,
  );
  const otherLanguageReviews = normalizeReviews(payload.other_language_reviews);
  const fallbackReviewCount = Math.max(
    reviews.length,
    primaryLanguageReviews.length + otherLanguageReviews.length,
  );
  const fallbackPagination: HappyCustomersPagination = {
    currentPage: 1,
    perPage: Math.max(1, fallbackReviewCount),
    totalCount: fallbackReviewCount,
    totalPages: fallbackReviewCount > 0 ? 1 : 0,
  };
  const pagination = normalizePagination(payload.pagination, fallbackPagination);

  return {
    customFormFiltersAndAverages: normalizeJsonValue(
      payload.custom_form_filters_and_averages,
    ),
    numberOfProductReviews: readNonNegativeInteger(
      payload.number_of_product_reviews,
      reviewType === "product-reviews" ? pagination.totalCount : 0,
    ),
    numberOfShopReviews: readNonNegativeInteger(
      payload.number_of_shop_reviews,
      reviewType === "shop-reviews" ? pagination.totalCount : 0,
    ),
    otherLanguagePagination: normalizePagination(
      payload.other_language_pagination,
      pagination,
    ),
    otherLanguageReviews,
    pagination,
    primaryLanguage:
      typeof payload.primary_language === "string"
        ? payload.primary_language.trim()
        : "",
    primaryLanguagePagination: normalizePagination(
      payload.primary_language_pagination,
      pagination,
    ),
    primaryLanguageReviews,
    requestUrl: requestUrl.toString(),
    reviewType,
    reviews,
  };
}

function normalizeReviews(value: unknown): readonly HappyCustomersReview[] {
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
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return [];
    }
    assertSafeReviewBody(review.body_html);
    return [review];
  });
}

function normalizePagination(
  value: unknown,
  fallback: HappyCustomersPagination,
): HappyCustomersPagination {
  if (!isJsonObject(value)) return fallback;

  return {
    currentPage: readPositiveInteger(value.current_page, fallback.currentPage),
    perPage: readPositiveInteger(value.per_page, fallback.perPage),
    totalCount: readNonNegativeInteger(value.total_count, fallback.totalCount),
    totalPages: readNonNegativeInteger(value.total_pages, fallback.totalPages),
  };
}

function readLegacyAggregate(html: string): HappyCustomersData["aggregate"] {
  const header = html.match(
    /class=(['"])[^'"<>]*\bjdgm-all-reviews__header\b[^'"<>]*\1[^>]*>/i,
  )?.[0];
  const count = header
    ? readDataNumber(header, "number-of-reviews")
    : undefined;
  const rating = header ? readDataNumber(header, "average-rating") : undefined;

  if (count === undefined || rating === undefined) {
    throw new Error("Judge.me returned incomplete Happy Customers aggregates.");
  }
  return { count, rating };
}

function readLegacyHistogram(
  html: string,
  totalCount: number,
): HappyCustomersHistogramRow[] {
  const rows = new Map<number, HappyCustomersHistogramRow>();
  const rowPattern =
    /<[^>]+class=(['"])[^'"<>]*\bjdgm-histogram__row\b[^'"<>]*\1[^>]*>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const row = match[0];
    const rating = readDataNumber(row, "rating");
    const frequency = readDataNumber(row, "frequency");
    if (
      rating === undefined ||
      !Number.isSafeInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      frequency === undefined ||
      !Number.isSafeInteger(frequency) ||
      frequency < 0
    ) {
      continue;
    }

    const reportedPercentage = readDataNumber(row, "percentage");
    const percentage =
      reportedPercentage === undefined
        ? totalCount > 0
          ? Math.round((frequency / totalCount) * 100)
          : 0
        : Math.max(0, Math.min(100, reportedPercentage));
    rows.set(rating, { frequency, percentage, rating });
  }

  return [5, 4, 3, 2, 1].map(
    (rating) => rows.get(rating) ?? { frequency: 0, percentage: 0, rating },
  );
}

function readDataNumber(html: string, name: string): number | undefined {
  const match = html.match(
    new RegExp(`\\bdata-${name}\\s*=\\s*(['"])([^'"]+)\\1`, "i"),
  );
  if (!match) return undefined;
  const value = Number(match[2]);
  return Number.isFinite(value) ? value : undefined;
}

function readBooleanSetting(value: JudgeMeJsonValue | undefined): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function assertSafeReviewBody(html: string): void {
  if (
    /<script\b/i.test(html) ||
    /\son[a-z][\w:-]*\s*=/i.test(html) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(html)
  ) {
    throw new Error("Judge.me returned executable Happy Customers markup.");
  }
}

function normalizeJsonValue(value: unknown): JudgeMeJsonValue {
  if (value === undefined) return null;
  return isJsonValue(value) ? value : null;
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
  if (typeof value !== "object") return false;
  return Object.values(value).every(isJsonValue);
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

function normalizeNonNegativeInteger(value: unknown, label: string): number {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error(`Judge.me returned invalid Happy Customers ${label}.`);
  }
  return normalized;
}
