import { normalizeShopDomain } from "./config.js";
import { getShopifyNumericId } from "./shopify.js";

const JUDGE_ME_WIDGET_API = "https://judge.me/api/v1/widgets";

export type JudgeMeJsonValue =
  | boolean
  | number
  | string
  | null
  | JudgeMeJsonValue[]
  | { [key: string]: JudgeMeJsonValue };

export type JudgeMeRuntimeSettings = Readonly<Record<string, JudgeMeJsonValue>>;

export interface LegacyProductWidgetMarkup {
  /** Shopify's numeric product ID, which Judge.me calls the external ID. */
  productId: string;
  /** Judge.me-owned markup returned by the public Widget API. */
  html: string;
}

export interface LegacyShopWidgetMarkup {
  /** Judge.me-owned shop-level markup returned by the public Widget API. */
  html: string;
}

export interface LegacyWidgetResources {
  /** Dashboard-generated CSS from Judge.me's settings and HTML miracle payloads. */
  styles: string;
  /** Dashboard settings consumed by Judge.me's browser runtime. */
  settings: JudgeMeRuntimeSettings;
}

export interface LegacyReviewWidgetData
  extends LegacyProductWidgetMarkup, LegacyWidgetResources {}

export interface StarRatingBadgeData
  extends LegacyProductWidgetMarkup, LegacyWidgetResources {}

export interface ReviewsCarouselData
  extends LegacyShopWidgetMarkup, LegacyWidgetResources {}

export interface AllReviewsCounterMarkup extends LegacyShopWidgetMarkup {
  /** Total published product and shop reviews across the store. */
  count: number;
  /** Average rating across the store, serialized as Judge.me returns it. */
  rating: string;
}

export interface AllReviewsCounterData
  extends AllReviewsCounterMarkup, LegacyWidgetResources {}

export interface VerifiedReviewsCounterMarkup extends LegacyShopWidgetMarkup {
  /** Total published reviews that Judge.me currently treats as verified. */
  count: number;
}

export interface VerifiedReviewsCounterData
  extends VerifiedReviewsCounterMarkup, LegacyWidgetResources {}

export type AllReviewsWidgetReviewType = "product-reviews" | "shop-reviews";

export interface AllReviewsWidgetMarkup extends LegacyShopWidgetMarkup {
  /** The review stream rendered into the server response. */
  initialReviewType: AllReviewsWidgetReviewType;
}

export interface AllReviewsWidgetData
  extends AllReviewsWidgetMarkup, LegacyWidgetResources {}

export type FloatingReviewsTabSource =
  "reviews-tab" | "all-reviews-page-fallback";

export interface FloatingReviewsTabMarkup extends LegacyShopWidgetMarkup {
  /** Whether Judge.me supplied the tab or the Free-plan fallback built it. */
  source: FloatingReviewsTabSource;
}

export interface FloatingReviewsTabData
  extends FloatingReviewsTabMarkup, LegacyWidgetResources {}

/** A request-efficient payload for rendering both product widgets together. */
export interface LegacyProductWidgetsData {
  resources: LegacyWidgetResources;
  reviewWidget: LegacyProductWidgetMarkup;
  starRatingBadge: LegacyProductWidgetMarkup;
}

/** A request-efficient payload for the implemented product and shop widgets. */
export interface LegacyStorefrontWidgetsData extends LegacyProductWidgetsData {
  allReviewsCounter: AllReviewsCounterMarkup;
  allReviewsWidget: AllReviewsWidgetMarkup;
  floatingReviewsTab: FloatingReviewsTabMarkup;
  reviewsCarousel: LegacyShopWidgetMarkup;
  /** `null` until the store meets Judge.me's verified-review eligibility. */
  verifiedReviewsCounter: VerifiedReviewsCounterMarkup | null;
}

export interface FetchLegacyReviewWidgetOptions {
  /** The permanent `*.myshopify.com` domain. */
  shopDomain: string;
  /** Judge.me public Widget API token. */
  publicToken: string;
  /** A Shopify GraphQL GID or numeric product ID. */
  productId: string;
  /** Cancels all Widget API requests when the route request is aborted. */
  signal?: AbortSignal;
  /** Injectable for tests and non-standard runtimes. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
}

export type FetchStarRatingBadgeOptions = FetchLegacyReviewWidgetOptions;
export type FetchLegacyProductWidgetsOptions = FetchLegacyReviewWidgetOptions;
export type FetchLegacyStorefrontWidgetsOptions =
  FetchLegacyReviewWidgetOptions;

export interface FetchReviewsCarouselOptions {
  /** The permanent `*.myshopify.com` domain. */
  shopDomain: string;
  /** Judge.me public Widget API token. */
  publicToken: string;
  /** Cancels all Widget API requests when the route request is aborted. */
  signal?: AbortSignal;
  /** Injectable for tests and non-standard runtimes. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
}

export interface FetchAllReviewsWidgetOptions extends FetchReviewsCarouselOptions {
  /** Overrides the dashboard-configured first Product Reviews or Shop Reviews tab. */
  initialReviewType?: AllReviewsWidgetReviewType;
}

export type FetchFloatingReviewsTabOptions = FetchReviewsCarouselOptions;
export type FetchAllReviewsCounterOptions = FetchReviewsCarouselOptions;
export type FetchVerifiedReviewsCounterOptions = FetchReviewsCarouselOptions;

interface ProductReviewResponse {
  product_external_id: number | string;
  widget: string;
}

interface PreviewBadgeResponse {
  product_external_id: number | string;
  badge: string;
}

interface FeaturedCarouselResponse {
  featured_carousel: string;
}

interface AllReviewsCountResponse {
  all_reviews_count: number | string;
}

interface AllReviewsRatingResponse {
  all_reviews_rating: number | string;
}

interface VerifiedBadgeResponse {
  verified_badge: null | string;
}

interface ReviewsTabResponse {
  page?: number | string;
  reviews_tab: null | string | { html?: unknown };
}

interface AllReviewsPageResponse {
  all_reviews: string;
  all_reviews_header: string;
}

interface AllReviewsPageMarkup {
  headerHtml: string;
  reviewType: AllReviewsWidgetReviewType;
  reviewsHtml: string;
}

interface SettingsResponse {
  settings: string;
}

interface HtmlMiracleResponse {
  html_miracle: string;
}

interface LegacyRequestContext {
  commonParams: Record<string, string>;
  fetchImplementation: typeof globalThis.fetch;
  productId: string;
  signal?: AbortSignal;
}

interface LegacyShopRequestContext {
  commonParams: Record<string, string>;
  fetchImplementation: typeof globalThis.fetch;
  signal?: AbortSignal;
}

/**
 * Fetches the complete legacy Review Widget payload from Judge.me's public API.
 *
 * This is safe to call in a Hydrogen loader: only the public token is used. The
 * returned data is serializable and can be passed directly to React.
 */
export async function fetchLegacyReviewWidget({
  shopDomain,
  publicToken,
  productId,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchLegacyReviewWidgetOptions): Promise<LegacyReviewWidgetData> {
  const context = createLegacyRequestContext({
    shopDomain,
    publicToken,
    productId,
    signal,
    fetchImplementation,
  });

  const [reviewWidget, resources] = await Promise.all([
    fetchReviewWidgetMarkup(context),
    fetchLegacyWidgetResources(context),
  ]);

  return { ...reviewWidget, ...resources };
}

/** Fetches the configured product Star Rating Badge from the public Widget API. */
export async function fetchStarRatingBadge({
  shopDomain,
  publicToken,
  productId,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchStarRatingBadgeOptions): Promise<StarRatingBadgeData> {
  const context = createLegacyRequestContext({
    shopDomain,
    publicToken,
    productId,
    signal,
    fetchImplementation,
  });

  const [starRatingBadge, resources] = await Promise.all([
    fetchStarRatingBadgeMarkup(context),
    fetchLegacyWidgetResources(context),
  ]);

  return { ...starRatingBadge, ...resources };
}

/** Fetches the configured classic Reviews Carousel from the public Widget API. */
export async function fetchReviewsCarousel({
  shopDomain,
  publicToken,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchReviewsCarouselOptions): Promise<ReviewsCarouselData> {
  const context = createLegacyShopRequestContext({
    shopDomain,
    publicToken,
    signal,
    fetchImplementation,
  });

  const [reviewsCarousel, resources] = await Promise.all([
    fetchReviewsCarouselMarkup(context),
    fetchLegacyWidgetResources(context),
  ]);

  return { ...reviewsCarousel, ...resources };
}

/** Fetches the configured store-wide rating and review-count badge. */
export async function fetchAllReviewsCounter({
  shopDomain,
  publicToken,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchAllReviewsCounterOptions): Promise<AllReviewsCounterData> {
  const context = createLegacyShopRequestContext({
    shopDomain,
    publicToken,
    signal,
    fetchImplementation,
  });

  const [countResponse, ratingResponse, resources] = await Promise.all([
    fetchWidgetEndpoint<AllReviewsCountResponse>(
      "all_reviews_count",
      context.commonParams,
      context.fetchImplementation,
      context.signal,
    ),
    fetchWidgetEndpoint<AllReviewsRatingResponse>(
      "all_reviews_rating",
      context.commonParams,
      context.fetchImplementation,
      context.signal,
    ),
    fetchLegacyWidgetResources(context),
  ]);
  const count = normalizeAllReviewsCount(countResponse.all_reviews_count);
  const rating = normalizeAllReviewsRating(ratingResponse.all_reviews_rating);

  return {
    ...createAllReviewsCounterMarkup({ count, rating }, resources.settings),
    ...resources,
  };
}

/**
 * Fetches Judge.me's exact Verified Reviews Counter markup. Ineligible stores
 * return `null`; Judge.me currently requires at least 20 verified reviews.
 */
export async function fetchVerifiedReviewsCounter({
  shopDomain,
  publicToken,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchVerifiedReviewsCounterOptions): Promise<VerifiedReviewsCounterData | null> {
  const context = createLegacyShopRequestContext({
    shopDomain,
    publicToken,
    signal,
    fetchImplementation,
  });

  const [verifiedReviewsCounter, resources] = await Promise.all([
    fetchVerifiedReviewsCounterMarkup(context),
    fetchLegacyWidgetResources(context),
  ]);

  return verifiedReviewsCounter
    ? { ...verifiedReviewsCounter, ...resources }
    : null;
}

/** Fetches the legacy All Reviews Widget, also called Happy Customers. */
export async function fetchAllReviewsWidget({
  shopDomain,
  publicToken,
  initialReviewType,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchAllReviewsWidgetOptions): Promise<AllReviewsWidgetData> {
  const context = createLegacyShopRequestContext({
    shopDomain,
    publicToken,
    signal,
    fetchImplementation,
  });
  const resourcesPromise = fetchLegacyWidgetResources(context);
  const pagePromise = initialReviewType
    ? fetchAllReviewsPageMarkup(context, initialReviewType)
    : resourcesPromise.then(({ settings }) =>
        fetchAllReviewsPageMarkup(context, getInitialAllReviewsType(settings)),
      );
  const [page, resources] = await Promise.all([pagePromise, resourcesPromise]);

  return {
    ...createAllReviewsWidgetMarkup(page, resources.settings),
    ...resources,
  };
}

/**
 * Fetches the configured Floating Reviews Tab. Stores without the Awesome-plan
 * tab fall back to the public All Reviews Page payload.
 */
export async function fetchFloatingReviewsTab({
  shopDomain,
  publicToken,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchFloatingReviewsTabOptions): Promise<FloatingReviewsTabData> {
  const context = createLegacyShopRequestContext({
    shopDomain,
    publicToken,
    signal,
    fetchImplementation,
  });

  const [reviewsTab, resources] = await Promise.all([
    fetchReviewsTabResponse(context),
    fetchLegacyWidgetResources(context),
  ]);
  const floatingReviewsTab = await resolveFloatingReviewsTabMarkup(
    context,
    reviewsTab,
    resources.settings,
  );

  return { ...floatingReviewsTab, ...resources };
}

/**
 * Fetches the Review Widget and Star Rating Badge with one shared settings/CSS
 * request pair. Prefer this over two standalone calls when rendering both.
 */
export async function fetchLegacyProductWidgets({
  shopDomain,
  publicToken,
  productId,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchLegacyProductWidgetsOptions): Promise<LegacyProductWidgetsData> {
  const context = createLegacyRequestContext({
    shopDomain,
    publicToken,
    productId,
    signal,
    fetchImplementation,
  });

  const [reviewWidget, starRatingBadge, resources] = await Promise.all([
    fetchReviewWidgetMarkup(context),
    fetchStarRatingBadgeMarkup(context),
    fetchLegacyWidgetResources(context),
  ]);

  return { resources, reviewWidget, starRatingBadge };
}

/**
 * Fetches every currently implemented legacy storefront widget with one shared
 * settings/CSS request pair. Prefer this on routes that render all seven.
 */
export async function fetchLegacyStorefrontWidgets({
  shopDomain,
  publicToken,
  productId,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchLegacyStorefrontWidgetsOptions): Promise<LegacyStorefrontWidgetsData> {
  const context = createLegacyRequestContext({
    shopDomain,
    publicToken,
    productId,
    signal,
    fetchImplementation,
  });

  const resourcesPromise = fetchLegacyWidgetResources(context);
  const allReviewsPagePromise = resourcesPromise.then(({ settings }) =>
    fetchAllReviewsPageMarkup(context, getInitialAllReviewsType(settings)),
  );
  const [
    reviewWidget,
    starRatingBadge,
    reviewsCarousel,
    reviewsTab,
    verifiedReviewsCounter,
    resources,
    allReviewsPage,
  ] = await Promise.all([
    fetchReviewWidgetMarkup(context),
    fetchStarRatingBadgeMarkup(context),
    fetchReviewsCarouselMarkup(context),
    fetchReviewsTabResponse(context),
    fetchVerifiedReviewsCounterMarkup(context),
    resourcesPromise,
    allReviewsPagePromise,
  ]);
  const floatingReviewsTab = await resolveFloatingReviewsTabMarkup(
    context,
    reviewsTab,
    resources.settings,
    allReviewsPage,
  );
  const allReviewsStats = readAllReviewsStats(allReviewsPage.headerHtml);

  return {
    allReviewsCounter: createAllReviewsCounterMarkup(
      {
        count: normalizeAllReviewsCount(allReviewsStats.allReviews),
        rating: normalizeAllReviewsRating(allReviewsStats.averageRating),
      },
      resources.settings,
    ),
    allReviewsWidget: createAllReviewsWidgetMarkup(
      allReviewsPage,
      resources.settings,
    ),
    floatingReviewsTab,
    resources,
    reviewWidget,
    reviewsCarousel,
    starRatingBadge,
    verifiedReviewsCounter,
  };
}

function createLegacyRequestContext({
  shopDomain,
  publicToken,
  productId,
  signal,
  fetchImplementation,
}: {
  shopDomain: string;
  publicToken: string;
  productId: string;
  signal?: AbortSignal;
  fetchImplementation: typeof globalThis.fetch;
}): LegacyRequestContext {
  const context = createLegacyShopRequestContext({
    shopDomain,
    publicToken,
    signal,
    fetchImplementation,
  });
  const normalizedProductId = getShopifyNumericId(productId);

  return {
    ...context,
    productId: normalizedProductId,
  };
}

function createLegacyShopRequestContext({
  shopDomain,
  publicToken,
  signal,
  fetchImplementation,
}: {
  shopDomain: string;
  publicToken: string;
  signal?: AbortSignal;
  fetchImplementation: typeof globalThis.fetch;
}): LegacyShopRequestContext {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedPublicToken = publicToken.trim();

  if (!normalizedPublicToken) {
    throw new Error("Judge.me requires a public Widget API token.");
  }

  if (!fetchImplementation) {
    throw new Error("Judge.me requires a fetch implementation.");
  }

  return {
    commonParams: {
      shop_domain: normalizedShopDomain,
      api_token: normalizedPublicToken,
    },
    fetchImplementation,
    signal,
  };
}

async function fetchReviewWidgetMarkup(
  context: LegacyRequestContext,
): Promise<LegacyProductWidgetMarkup> {
  const response = await fetchWidgetEndpoint<ProductReviewResponse>(
    "product_review",
    { ...context.commonParams, external_id: context.productId },
    context.fetchImplementation,
    context.signal,
  );

  return normalizeProductWidgetMarkup({
    expectedProductId: context.productId,
    html: response.widget,
    label: "Review Widget",
    responseProductId: response.product_external_id,
  });
}

async function fetchStarRatingBadgeMarkup(
  context: LegacyRequestContext,
): Promise<LegacyProductWidgetMarkup> {
  const response = await fetchWidgetEndpoint<PreviewBadgeResponse>(
    "preview_badge",
    { ...context.commonParams, external_id: context.productId },
    context.fetchImplementation,
    context.signal,
  );

  return normalizeProductWidgetMarkup({
    expectedProductId: context.productId,
    html: response.badge,
    label: "Star Rating Badge",
    responseProductId: response.product_external_id,
  });
}

async function fetchReviewsCarouselMarkup(
  context: LegacyShopRequestContext,
): Promise<LegacyShopWidgetMarkup> {
  const response = await fetchWidgetEndpoint<FeaturedCarouselResponse>(
    "featured_carousel",
    context.commonParams,
    context.fetchImplementation,
    context.signal,
  );

  if (typeof response.featured_carousel !== "string") {
    throw new Error("Judge.me returned an invalid Reviews Carousel.");
  }

  assertSafeWidgetMarkup(response.featured_carousel, "Reviews Carousel");

  return { html: response.featured_carousel };
}

async function fetchVerifiedReviewsCounterMarkup(
  context: LegacyShopRequestContext,
): Promise<VerifiedReviewsCounterMarkup | null> {
  const response = await fetchWidgetEndpoint<VerifiedBadgeResponse>(
    "verified_badge",
    context.commonParams,
    context.fetchImplementation,
    context.signal,
  );

  if (response.verified_badge === null) return null;
  if (typeof response.verified_badge !== "string") {
    throw new Error("Judge.me returned an invalid Verified Reviews Counter.");
  }

  assertSafeWidgetMarkup(
    response.verified_badge,
    "Verified Reviews Counter",
  );

  const countMatch = response.verified_badge.match(
    /class=["'][^"']*\bjdgm-verified-badge__total\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  );
  const serializedCount = countMatch?.[1]
    ?.replace(/<[^>]*>/g, "")
    .replace(/[\s,]/g, "");
  const count = Number(serializedCount);

  if (!serializedCount || !Number.isSafeInteger(count) || count < 0) {
    throw new Error(
      "Judge.me returned an invalid Verified Reviews Counter count.",
    );
  }

  return { count, html: response.verified_badge };
}

async function fetchReviewsTabResponse(
  context: LegacyShopRequestContext,
): Promise<ReviewsTabResponse> {
  return fetchWidgetEndpoint<ReviewsTabResponse>(
    "reviews_tab",
    { ...context.commonParams, page: "1", per_page: "5" },
    context.fetchImplementation,
    context.signal,
  );
}

async function resolveFloatingReviewsTabMarkup(
  context: LegacyShopRequestContext,
  response: ReviewsTabResponse,
  settings: JudgeMeRuntimeSettings,
  prefetchedPage?: AllReviewsPageMarkup,
): Promise<FloatingReviewsTabMarkup> {
  const exactHtml = getReviewsTabHtml(response.reviews_tab);

  if (exactHtml !== null) {
    assertSafeWidgetMarkup(exactHtml, "Floating Reviews Tab");
    return {
      html: normalizeExactFloatingReviewsTabMarkup(exactHtml, settings),
      source: "reviews-tab",
    };
  }

  const fallback =
    prefetchedPage ??
    (await fetchAllReviewsPageMarkup(
      context,
      getInitialAllReviewsType(settings),
    ));

  return {
    html: createFloatingReviewsTabFallback({
      headerHtml: fallback.headerHtml,
      reviewType: fallback.reviewType,
      reviewsHtml: fallback.reviewsHtml,
      settings,
    }),
    source: "all-reviews-page-fallback",
  };
}

async function fetchAllReviewsPageMarkup(
  context: LegacyShopRequestContext,
  reviewType: AllReviewsWidgetReviewType,
): Promise<AllReviewsPageMarkup> {
  const response = await fetchWidgetEndpoint<AllReviewsPageResponse>(
    "all_reviews_page",
    { ...context.commonParams, page: "1", review_type: reviewType },
    context.fetchImplementation,
    context.signal,
  );

  if (
    typeof response.all_reviews !== "string" ||
    typeof response.all_reviews_header !== "string"
  ) {
    throw new Error("Judge.me returned an invalid All Reviews Page.");
  }

  assertSafeWidgetMarkup(response.all_reviews, "All Reviews Page reviews");
  assertSafeWidgetMarkup(
    response.all_reviews_header,
    "All Reviews Page header",
  );

  return {
    headerHtml: response.all_reviews_header,
    reviewType,
    reviewsHtml: response.all_reviews,
  };
}

function createAllReviewsCounterMarkup(
  {
    count,
    rating,
  }: {
    count: number;
    rating: string;
  },
  settings: JudgeMeRuntimeSettings,
): AllReviewsCounterMarkup {
  const style = settings.all_reviews_text_style === "text" ? "text" : "branded";
  const showStars =
    style === "branded" ||
    settings.show_stars_for_all_reviews_text_badge === true;
  const ratingLabel = formatAllReviewsRating(rating);
  const defaultText =
    style === "branded"
      ? `${ratingLabel} out of 5 stars based on ${count} reviews`
      : `Customers rate us ${ratingLabel}/5 based on ${count} reviews.`;
  const configuredTemplate = getStringSetting(
    settings,
    style === "branded"
      ? "all_reviews_text_badge_text_branded_style"
      : "all_reviews_text_badge_text",
    defaultText,
  );
  const text = renderAllReviewsCounterText(
    configuredTemplate,
    ratingLabel,
    count,
    defaultText,
  );
  const locale = getStringSetting(settings, "locale", "en");
  const ratingMarkup = `<span class="jdgm-all-reviews-rating" data-score="${escapeHtml(rating)}" role="img" aria-label="${escapeHtml(`${ratingLabel} out of 5 stars`)}"${showStars ? "" : ' style="display:none"'}></span>`;
  const configuredUrl = getStringSetting(
    settings,
    "all_reviews_text_badge_url",
    "",
  );
  const shouldLink =
    settings.is_all_reviews_text_badge_a_link === true &&
    isSafeWidgetNavigationUrl(configuredUrl);
  const textContent = shouldLink
    ? `<a href="${escapeHtml(configuredUrl)}">${escapeHtml(text)}</a>`
    : escapeHtml(text);
  const textMarkup = `<span class="jdgm-all-reviews-text__text" data-score="${escapeHtml(rating)}" data-number-of-reviews="${count}" data-locale="${escapeHtml(locale)}">${textContent}</span>`;

  return {
    count,
    html: `<div class="jdgm-widget jdgm-all-reviews-text jdgm-all-reviews-text--style-${style}" data-judgeme-react-show-stars="${showStars}">${ratingMarkup}${textMarkup}</div>`,
    rating,
  };
}

function normalizeAllReviewsCount(value: unknown): number {
  const count =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Judge.me returned an invalid All Reviews count.");
  }

  return count;
}

function normalizeAllReviewsRating(value: unknown): string {
  const serialized = String(value ?? "").trim();
  const rating = Number(serialized);

  if (!serialized || !Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("Judge.me returned an invalid All Reviews rating.");
  }

  return serialized;
}

function formatAllReviewsRating(rating: string): string {
  return Number(rating).toFixed(1);
}

function renderAllReviewsCounterText(
  template: string,
  rating: string,
  count: number,
  fallback: string,
): string {
  const rendered = template
    .replace(
      /\{\{\s*(?:shop\.metafields\.judgeme\.)?all_reviews_rating(?:\s*\|\s*round\s*:\s*1)?\s*\}\}/gi,
      rating,
    )
    .replace(
      /\{\{\s*(?:shop\.metafields\.judgeme\.)?all_reviews_count\s*\}\}/gi,
      String(count),
    );

  return /\{[{%]|[%}]\}/.test(rendered) ? fallback : rendered;
}

function isSafeWidgetNavigationUrl(value: string): boolean {
  if (!value.trim()) return false;

  try {
    const url = new URL(value, "https://judgeme-react.invalid");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createAllReviewsWidgetMarkup(
  page: AllReviewsPageMarkup,
  settings: JudgeMeRuntimeSettings,
): AllReviewsWidgetMarkup {
  const stats = readAllReviewsStats(page.headerHtml);
  const productLabel = getStringSetting(
    settings,
    "widget_product_reviews_subtab_text",
    "Product Reviews",
  );
  const shopLabel = getStringSetting(
    settings,
    "widget_shop_reviews_subtab_text",
    "Shop Reviews",
  );
  const loadMoreLabel = getStringSetting(
    settings,
    "all_reviews_page_load_more_text",
    "Load More Reviews",
  );
  const subtabs = [
    createAllReviewsSubtab({
      active: page.reviewType === "product-reviews",
      count: stats.productReviews,
      label: productLabel,
      reviewType: "product-reviews",
    }),
    createAllReviewsSubtab({
      active: page.reviewType === "shop-reviews",
      count: stats.shopReviews,
      label: shopLabel,
      reviewType: "shop-reviews",
    }),
  ];
  const reviewCount = countReviewMarkup(page.reviewsHtml);
  const expectedReviewCount = Number(
    page.reviewType === "shop-reviews"
      ? stats.shopReviews
      : stats.productReviews,
  );
  const pageSize = reviewCount || Number(stats.perPage);
  const loadMode =
    settings.all_reviews_page_load_reviews_on === "scroll"
      ? "scroll"
      : "button_click";
  const allReviewsLoaded =
    reviewCount === 0 ||
    (Number.isFinite(expectedReviewCount) &&
      reviewCount >= expectedReviewCount);
  const loadMoreClass =
    loadMode === "scroll" || allReviewsLoaded ? " jdgm-hidden" : "";

  if (page.reviewType === "shop-reviews") subtabs.reverse();

  return {
    html: [
      `<section class="jdgm-widget jdgm-all-reviews-widget" data-all-reviews-loaded="${allReviewsLoaded}" data-initial-review-type="${page.reviewType}" data-load-mode="${loadMode}" data-page="1" data-page-size="${pageSize}" data-review-type="${page.reviewType}">`,
      page.headerHtml,
      `<div class="jdgm-subtab" data-judgeme-react-subtab="true">${subtabs.join("")}</div>`,
      `<div class="jdgm-all-reviews__body" data-current-page="1">${page.reviewsHtml}</div>`,
      '<div class="jdgm-spinner" style="display:none"></div>',
      `<div class="jdgm-all-reviews__footer"><div class="jdgm-all-reviews-page__load-more-wrapper${loadMoreClass}"><button type="button" class="jdgm-all-reviews-page__load-more jdgm-btn jdgm-btn--solid" data-page="2">${escapeHtml(loadMoreLabel)}</button></div><div data-judgeme-react-load-sentinel="true" aria-hidden="true" style="height:1px"></div></div>`,
      "</section>",
    ].join(""),
    initialReviewType: page.reviewType,
  };
}

function getInitialAllReviewsType(
  settings: JudgeMeRuntimeSettings,
): AllReviewsWidgetReviewType {
  return settings.widget_first_sub_tab === "shop-reviews"
    ? "shop-reviews"
    : "product-reviews";
}

function getReviewsTabHtml(
  value: ReviewsTabResponse["reviews_tab"],
): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.html === "string") {
    return value.html;
  }

  throw new Error("Judge.me returned an invalid Floating Reviews Tab.");
}

function normalizeExactFloatingReviewsTabMarkup(
  html: string,
  settings: JudgeMeRuntimeSettings,
): string {
  if (/class=["'][^"']*\bjdgm-revs-tab\b[^"']*["']/i.test(html)) {
    return html;
  }

  if (!/class=["'][^"']*\bjdgm-revs-tab__wrapper\b[^"']*["']/i.test(html)) {
    throw new Error("Judge.me returned incomplete Floating Reviews Tab markup.");
  }

  const stats = readReviewsTabStats(html);
  const buttonLabel = getStringSetting(
    settings,
    "floating_tab_button_name",
    "Reviews",
  );
  const title = getStringSetting(
    settings,
    "floating_tab_title",
    "Customer Reviews",
  );
  const buttonStyle =
    settings.floating_tab_tab_style === "stars" ? "stars" : "text";
  const tabLabel =
    buttonStyle === "stars"
      ? createFloatingTabRating(stats.averageRating)
      : escapeHtml(buttonLabel);
  const mobileStyles = settings.floating_tab_hide_mobile_install_preference
    ? "<style>@media(max-width:768px){.jdgm-revs-tab-btn{display:none!important}}</style>"
    : "";

  // The current reviews_tab endpoint can return only the drawer wrapper. The
  // Shopify app embed supplies this missing trigger/header shell in Liquid.
  return [
    '<section class="jdgm-widget jdgm-revs-tab" data-judgeme-react-source="reviews-tab">',
    mobileStyles,
    `<div class="jdgm-revs-tab-btn btn" data-style="${buttonStyle}" position="bottom" tabindex="0" role="button" aria-label="Open Judge.me reviews">${tabLabel}</div>`,
    `<div class="jdgm-revs-tab__header"><a class="jdgm-close-ico" tabindex="0" role="button" aria-label="Close Judge.me reviews"></a><h3 class="jdgm-revs-tab__title">${escapeHtml(title)}</h3><div class="jdgm-revs-tab__url"><div class="jdgm-all-reviews-rating" data-score="${stats.averageRating}"></div><span class="jdgm-all-reviews-count">${stats.allReviews}</span> reviews</div></div>`,
    html,
    "</section>",
  ].join("");
}

function readReviewsTabStats(html: string): {
  allReviews: string;
  averageRating: string;
} {
  const productReviews = Number(
    readNumericHtmlAttribute(html, "data-number-of-product-reviews", "0"),
  );
  const shopReviews = Number(
    readNumericHtmlAttribute(html, "data-number-of-shop-reviews", "0"),
  );
  let frequencyTotal = 0;
  let ratingTotal = 0;

  for (const match of html.matchAll(
    /<[^>]+class=["'][^"']*\bjdgm-histogram__row\b[^"']*["'][^>]*>/gi,
  )) {
    const rating = Number(readNumericHtmlAttribute(match[0], "data-rating", "0"));
    const frequency = Number(
      readNumericHtmlAttribute(match[0], "data-frequency", "0"),
    );
    ratingTotal += rating * frequency;
    frequencyTotal += frequency;
  }

  return {
    allReviews: String(productReviews + shopReviews),
    averageRating:
      frequencyTotal > 0 ? (ratingTotal / frequencyTotal).toFixed(2) : "0",
  };
}

function createFloatingReviewsTabFallback({
  headerHtml,
  reviewType,
  reviewsHtml,
  settings,
}: {
  headerHtml: string;
  reviewType: "product-reviews" | "shop-reviews";
  reviewsHtml: string;
  settings: JudgeMeRuntimeSettings;
}): string {
  const stats = readAllReviewsStats(headerHtml);
  const productLabel = getStringSetting(
    settings,
    "widget_product_reviews_subtab_text",
    "Product Reviews",
  );
  const shopLabel = getStringSetting(
    settings,
    "widget_shop_reviews_subtab_text",
    "Shop Reviews",
  );
  const buttonLabel = getStringSetting(
    settings,
    "floating_tab_button_name",
    "Reviews",
  );
  const title = getStringSetting(
    settings,
    "floating_tab_title",
    "Customer Reviews",
  );
  const loadMoreLabel = getStringSetting(
    settings,
    "all_reviews_page_load_more_text",
    "Load More Reviews",
  );
  const buttonStyle =
    settings.floating_tab_tab_style === "stars" ? "stars" : "text";
  const tabLabel =
    buttonStyle === "stars"
      ? createFloatingTabRating(stats.averageRating)
      : escapeHtml(buttonLabel);
  const mobileStyles = settings.floating_tab_hide_mobile_install_preference
    ? "<style>@media(max-width:768px){.jdgm-revs-tab-btn{display:none!important}}</style>"
    : "";
  const subtabs = [
    createAllReviewsSubtab({
      active: reviewType === "product-reviews",
      count: stats.productReviews,
      label: productLabel,
      reviewType: "product-reviews",
    }),
    createAllReviewsSubtab({
      active: reviewType === "shop-reviews",
      count: stats.shopReviews,
      label: shopLabel,
      reviewType: "shop-reviews",
    }),
  ];
  const reviewCount = countReviewMarkup(reviewsHtml);
  const pageSize = reviewCount || Number(stats.perPage);

  if (reviewType === "shop-reviews") subtabs.reverse();

  return [
    `<section class="jdgm-widget jdgm-revs-tab" data-judgeme-react-source="all-reviews-page-fallback" data-review-type="${reviewType}" data-page="1" data-page-size="${pageSize}">`,
    mobileStyles,
    `<div class="jdgm-revs-tab-btn btn" data-style="${buttonStyle}" position="bottom" tabindex="0" role="button" aria-label="Open Judge.me reviews">${tabLabel}</div>`,
    `<div class="jdgm-revs-tab__header"><a class="jdgm-close-ico" tabindex="0" role="button" aria-label="Close Judge.me reviews"></a><h3 class="jdgm-revs-tab__title">${escapeHtml(title)}</h3><div class="jdgm-revs-tab__url"><div class="jdgm-all-reviews-rating" data-score="${stats.averageRating}"></div><span class="jdgm-all-reviews-count">${stats.allReviews}</span> reviews</div></div>`,
    '<section class="jdgm-revs-tab__wrapper">',
    '<div class="jdgm-mask"></div><div class="jdgm-revs-tab__main"><div class="jdgm-revs-tab__content">',
    `<div class="jdgm-revs-tab__content-header" data-number-of-product-reviews="${stats.productReviews}" data-number-of-shop-reviews="${stats.shopReviews}">${headerHtml}</div>`,
    `<div class="jdgm-subtab">${subtabs.join("")}</div>`,
    `<div class="jdgm-revs-tab__content-body"><div class="jdgm-revs-tab__reviews">${reviewsHtml}</div><div class="jdgm-spinner jdgm-revs-tab__spinner" style="display:none"></div><div class="jdgm-paginate" data-per-page="${stats.perPage}"><button type="button" class="jdgm-paginate__load-more" data-page="2">${escapeHtml(loadMoreLabel)}</button></div></div>`,
    "</div></div></section></section>",
  ].join("");
}

function createAllReviewsSubtab({
  active,
  count,
  label,
  reviewType,
}: {
  active: boolean;
  count: string;
  label: string;
  reviewType: AllReviewsWidgetReviewType;
}): string {
  return `<span class="jdgm-subtab__name${active ? " jdgm--active" : ""}" data-tabname="${reviewType}" role="button" tabindex="0">${escapeHtml(label)} (<span class="jdgm-subtab__count">${count}</span>)</span>`;
}

function createFloatingTabRating(averageRating: string): string {
  return `<div class="jdgm-stars" data-score="${averageRating}"></div><div class="jdgm-rating">${averageRating}</div>`;
}

function readAllReviewsStats(headerHtml: string): {
  allReviews: string;
  averageRating: string;
  perPage: string;
  productReviews: string;
  shopReviews: string;
} {
  return {
    allReviews: readNumericHtmlAttribute(
      headerHtml,
      "data-number-of-reviews",
      "0",
    ),
    averageRating: readNumericHtmlAttribute(
      headerHtml,
      "data-average-rating",
      "0",
    ),
    perPage: readNumericHtmlAttribute(headerHtml, "data-per-page", "25"),
    productReviews: readNumericHtmlAttribute(
      headerHtml,
      "data-number-of-product-reviews",
      "0",
    ),
    shopReviews: readNumericHtmlAttribute(
      headerHtml,
      "data-number-of-shop-reviews",
      "0",
    ),
  };
}

function countReviewMarkup(html: string): number {
  return (html.match(/class=["'][^"']*\bjdgm-rev\b[^"']*["']/gi) ?? []).length;
}

function readNumericHtmlAttribute(
  html: string,
  attribute: string,
  fallback: string,
): string {
  const match = html.match(
    new RegExp(`${attribute}\\s*=\\s*["']([0-9]+(?:\\.[0-9]+)?)["']`, "i"),
  );

  return match?.[1] ?? fallback;
}

function getStringSetting(
  settings: JudgeMeRuntimeSettings,
  name: string,
  fallback: string,
): string {
  const value = settings[name];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

async function fetchLegacyWidgetResources(
  context: LegacyShopRequestContext,
): Promise<LegacyWidgetResources> {
  const [settings, htmlMiracle] = await Promise.all([
    fetchWidgetEndpoint<SettingsResponse>(
      "settings",
      context.commonParams,
      context.fetchImplementation,
      context.signal,
    ),
    fetchWidgetEndpoint<HtmlMiracleResponse>(
      "html_miracle",
      context.commonParams,
      context.fetchImplementation,
      context.signal,
    ),
  ]);

  if (
    typeof settings.settings !== "string" ||
    typeof htmlMiracle.html_miracle !== "string"
  ) {
    throw new Error("Judge.me returned an invalid widget settings payload.");
  }

  return {
    settings: createLegacyRuntimeSettings(
      parseRuntimeSettings(settings.settings),
    ),
    styles: [
      ...extractStyleContents(settings.settings),
      ...extractStyleContents(htmlMiracle.html_miracle),
    ].join("\n"),
  };
}

function normalizeProductWidgetMarkup({
  expectedProductId,
  html,
  label,
  responseProductId,
}: {
  expectedProductId: string;
  html: unknown;
  label: string;
  responseProductId: unknown;
}): LegacyProductWidgetMarkup {
  if (
    typeof html !== "string" ||
    String(responseProductId) !== expectedProductId
  ) {
    throw new Error(`Judge.me returned an invalid product ${label}.`);
  }

  assertSafeWidgetMarkup(html, label);

  return { productId: expectedProductId, html };
}

function createLegacyRuntimeSettings(
  settings: JudgeMeRuntimeSettings,
): JudgeMeRuntimeSettings {
  return {
    ...settings,
    // The public product_review endpoint returns legacy markup even when the
    // store uses Judge.me's new Review Widget in Shopify. This flag makes the
    // public loader initialize that legacy DOM contract instead of skipping it.
    review_widget_revamp_enabled: false,
  };
}

async function fetchWidgetEndpoint<T>(
  endpoint: string,
  params: Record<string, string>,
  fetchImplementation: typeof globalThis.fetch,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(`${JUDGE_ME_WIDGET_API}/${endpoint}`);

  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me ${endpoint} request failed with HTTP ${response.status}.`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`Judge.me ${endpoint} returned invalid JSON.`);
  }
}

function parseRuntimeSettings(settingsHtml: string): JudgeMeRuntimeSettings {
  const assignmentIndex = settingsHtml.indexOf("window.jdgmSettings");
  const scriptStart = settingsHtml.lastIndexOf("<script", assignmentIndex);
  const scriptOpeningEnd = settingsHtml.indexOf(">", scriptStart);
  const scriptEnd = settingsHtml.indexOf("</script>", assignmentIndex);
  const jsonStart = settingsHtml.indexOf("{", assignmentIndex);

  if (
    assignmentIndex < 0 ||
    scriptStart < 0 ||
    scriptOpeningEnd < 0 ||
    scriptEnd < 0 ||
    jsonStart < 0 ||
    jsonStart > scriptEnd ||
    !settingsHtml
      .slice(scriptStart, scriptOpeningEnd)
      .includes("jdgm-settings-script")
  ) {
    throw new Error("Judge.me settings did not contain jdgmSettings JSON.");
  }

  const serializedSettings = settingsHtml
    .slice(jsonStart, scriptEnd)
    .trim()
    .replace(/;\s*$/, "");

  try {
    const value: unknown = JSON.parse(serializedSettings);

    if (!isJsonObject(value)) {
      throw new Error();
    }

    return value;
  } catch {
    throw new Error("Judge.me returned invalid jdgmSettings JSON.");
  }
}

function extractStyleContents(html: string): string[] {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1],
  );
}

function assertSafeWidgetMarkup(html: string, label: string): void {
  if (
    /<script\b/i.test(html) ||
    /\son[a-z][\w:-]*\s*=/i.test(html) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(html)
  ) {
    throw new Error(`Judge.me returned executable ${label} markup.`);
  }
}

function isJsonObject(
  value: unknown,
): value is Record<string, JudgeMeJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
