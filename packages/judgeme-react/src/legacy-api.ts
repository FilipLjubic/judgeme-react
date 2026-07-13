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

export type JudgeMeRuntimeSettings = Readonly<
  Record<string, JudgeMeJsonValue>
>;

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
  extends LegacyProductWidgetMarkup,
    LegacyWidgetResources {}

export interface StarRatingBadgeData
  extends LegacyProductWidgetMarkup,
    LegacyWidgetResources {}

export interface ReviewsCarouselData
  extends LegacyShopWidgetMarkup,
    LegacyWidgetResources {}

export type FloatingReviewsTabSource =
  | "reviews-tab"
  | "all-reviews-page-fallback";

export interface FloatingReviewsTabMarkup extends LegacyShopWidgetMarkup {
  /** Whether Judge.me supplied the tab or the Free-plan fallback built it. */
  source: FloatingReviewsTabSource;
}

export interface FloatingReviewsTabData
  extends FloatingReviewsTabMarkup,
    LegacyWidgetResources {}

/** A request-efficient payload for rendering both product widgets together. */
export interface LegacyProductWidgetsData {
  resources: LegacyWidgetResources;
  reviewWidget: LegacyProductWidgetMarkup;
  starRatingBadge: LegacyProductWidgetMarkup;
}

/** A request-efficient payload for the implemented product and shop widgets. */
export interface LegacyStorefrontWidgetsData extends LegacyProductWidgetsData {
  floatingReviewsTab: FloatingReviewsTabMarkup;
  reviewsCarousel: LegacyShopWidgetMarkup;
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
export type FetchLegacyStorefrontWidgetsOptions = FetchLegacyReviewWidgetOptions;

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

export type FetchFloatingReviewsTabOptions = FetchReviewsCarouselOptions;

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

interface ReviewsTabResponse {
  page?: number | string;
  reviews_tab: null | string | {html?: unknown};
}

interface AllReviewsPageResponse {
  all_reviews: string;
  all_reviews_header: string;
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

  return {...reviewWidget, ...resources};
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

  return {...starRatingBadge, ...resources};
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

  return {...reviewsCarousel, ...resources};
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

  return {...floatingReviewsTab, ...resources};
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

  return {resources, reviewWidget, starRatingBadge};
}

/**
 * Fetches every currently implemented legacy storefront widget with one shared
 * settings/CSS request pair. Prefer this on routes that render all four.
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

  const [
    reviewWidget,
    starRatingBadge,
    reviewsCarousel,
    reviewsTab,
    resources,
  ] = await Promise.all([
    fetchReviewWidgetMarkup(context),
    fetchStarRatingBadgeMarkup(context),
    fetchReviewsCarouselMarkup(context),
    fetchReviewsTabResponse(context),
    fetchLegacyWidgetResources(context),
  ]);
  const floatingReviewsTab = await resolveFloatingReviewsTabMarkup(
    context,
    reviewsTab,
    resources.settings,
  );

  return {
    floatingReviewsTab,
    resources,
    reviewWidget,
    reviewsCarousel,
    starRatingBadge,
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
    {...context.commonParams, external_id: context.productId},
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
    {...context.commonParams, external_id: context.productId},
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

  return {html: response.featured_carousel};
}

async function fetchReviewsTabResponse(
  context: LegacyShopRequestContext,
): Promise<ReviewsTabResponse> {
  return fetchWidgetEndpoint<ReviewsTabResponse>(
    "reviews_tab",
    {...context.commonParams, page: "1", per_page: "5"},
    context.fetchImplementation,
    context.signal,
  );
}

async function resolveFloatingReviewsTabMarkup(
  context: LegacyShopRequestContext,
  response: ReviewsTabResponse,
  settings: JudgeMeRuntimeSettings,
): Promise<FloatingReviewsTabMarkup> {
  const exactHtml = getReviewsTabHtml(response.reviews_tab);

  if (exactHtml !== null) {
    assertSafeWidgetMarkup(exactHtml, "Floating Reviews Tab");
    return {html: exactHtml, source: "reviews-tab"};
  }

  const reviewType =
    settings.widget_first_sub_tab === "shop-reviews"
      ? "shop-reviews"
      : "product-reviews";
  const fallback = await fetchWidgetEndpoint<AllReviewsPageResponse>(
    "all_reviews_page",
    {...context.commonParams, page: "1", review_type: reviewType},
    context.fetchImplementation,
    context.signal,
  );

  if (
    typeof fallback.all_reviews !== "string" ||
    typeof fallback.all_reviews_header !== "string"
  ) {
    throw new Error("Judge.me returned an invalid All Reviews Page fallback.");
  }

  assertSafeWidgetMarkup(fallback.all_reviews, "All Reviews Page reviews");
  assertSafeWidgetMarkup(
    fallback.all_reviews_header,
    "All Reviews Page header",
  );

  return {
    html: createFloatingReviewsTabFallback({
      headerHtml: fallback.all_reviews_header,
      reviewType,
      reviewsHtml: fallback.all_reviews,
      settings,
    }),
    source: "all-reviews-page-fallback",
  };
}

function getReviewsTabHtml(value: ReviewsTabResponse["reviews_tab"]): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.html === "string") {
    return value.html;
  }

  throw new Error("Judge.me returned an invalid Floating Reviews Tab.");
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
    createFloatingTabSubtab({
      active: reviewType === "product-reviews",
      count: stats.productReviews,
      label: productLabel,
      reviewType: "product-reviews",
    }),
    createFloatingTabSubtab({
      active: reviewType === "shop-reviews",
      count: stats.shopReviews,
      label: shopLabel,
      reviewType: "shop-reviews",
    }),
  ];

  if (reviewType === "shop-reviews") subtabs.reverse();

  return [
    `<section class="jdgm-widget jdgm-revs-tab" data-judgeme-react-source="all-reviews-page-fallback" data-review-type="${reviewType}" data-page="1">`,
    mobileStyles,
    `<div class="jdgm-revs-tab-btn btn" data-style="${buttonStyle}" position="bottom" tabindex="0" role="button" aria-label="Open Judge.me reviews">${tabLabel}</div>`,
    `<div class="jdgm-revs-tab__header"><a class="jdgm-close-ico" tabindex="0" role="button" aria-label="Close Judge.me reviews"></a><h3 class="jdgm-revs-tab__title">${escapeHtml(title)}</h3><div class="jdgm-revs-tab__url"><div class="jdgm-all-reviews-rating" data-score="${stats.averageRating}"></div><span class="jdgm-all-reviews-count">${stats.allReviews}</span> reviews</div></div>`,
    '<section class="jdgm-revs-tab__wrapper">',
    '<div class="jdgm-mask"></div><div class="jdgm-revs-tab__main"><div class="jdgm-revs-tab__content">',
    `<div class="jdgm-revs-tab__content-header" data-number-of-product-reviews="${stats.productReviews}" data-number-of-shop-reviews="${stats.shopReviews}">${headerHtml}</div>`,
    `<div class="jdgm-subtab">${subtabs.join("")}</div>`,
    `<div class="jdgm-revs-tab__content-body"><div class="jdgm-revs-tab__reviews">${reviewsHtml}</div><div class="jdgm-spinner jdgm-revs-tab__spinner" style="display:none"></div><div class="jdgm-paginate" data-per-page="25"><button type="button" class="jdgm-paginate__load-more" data-page="2">${escapeHtml(loadMoreLabel)}</button></div></div>`,
    '</div></div></section></section>',
  ].join("");
}

function createFloatingTabSubtab({
  active,
  count,
  label,
  reviewType,
}: {
  active: boolean;
  count: string;
  label: string;
  reviewType: "product-reviews" | "shop-reviews";
}): string {
  return `<span class="jdgm-subtab__name${active ? " jdgm--active" : ""}" data-tabname="${reviewType}" tabindex="0">${escapeHtml(label)} (<span class="jdgm-subtab__count">${count}</span>)</span>`;
}

function createFloatingTabRating(averageRating: string): string {
  return `<div class="jdgm-stars" data-score="${averageRating}"></div><div class="jdgm-rating">${averageRating}</div>`;
}

function readAllReviewsStats(headerHtml: string): {
  allReviews: string;
  averageRating: string;
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

  return {productId: expectedProductId, html};
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
