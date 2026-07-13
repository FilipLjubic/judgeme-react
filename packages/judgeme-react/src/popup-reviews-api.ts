import { normalizeShopDomain } from "./config.js";
import {
  fetchCardsCarouselPage,
  type CardsCarouselReview,
} from "./cards-carousel-api.js";
import {
  fetchAllReviewsCounter,
  type JudgeMeJsonValue,
  type JudgeMeRuntimeSettings,
} from "./legacy-api.js";

export type PopupReviewsSelection =
  "featured" | "recent-five-star" | "recent-five-star-with-pictures";

export type PopupReviewsImageMode = "disabled" | "product" | "review";
export type PopupReviewsPosition =
  "bottom_left" | "bottom_right" | "top_left" | "top_right";

export type PopupReviewsPageType =
  | "auto"
  | "cart"
  | "collection"
  | "home"
  | "list-collections"
  | "other"
  | "product";

export interface PopupReviewsConfig {
  selection: PopupReviewsSelection;
  roundBorderStyle: boolean;
  showTitle: boolean;
  showBody: boolean;
  showReviewer: boolean;
  showProduct: boolean;
  imageMode: PopupReviewsImageMode;
  showOnHomePage: boolean;
  showOnProductPage: boolean;
  showOnCollectionPage: boolean;
  showOnCartPage: boolean;
  position: PopupReviewsPosition;
  firstReviewDelaySeconds: number;
  durationSeconds: number;
  intervalSeconds: number;
  reviewCount: number;
  hideOnMobile: boolean;
  starColor: string;
}

export interface PopupReview {
  id: string;
  title: string;
  body: string;
  rating: number;
  reviewerName: string;
  productTitle: string;
  productHandle?: string;
  productUrl?: string;
  reviewPictureUrl?: string;
  productPictureUrl?: string;
}

export interface PopupReviewsPageData {
  reviews: readonly PopupReview[];
  selection: PopupReviewsSelection;
}

export interface PopupReviewsData {
  config: PopupReviewsConfig;
  page: PopupReviewsPageData;
  shopDomain: string;
}

export interface FetchPopupReviewsPageOptions {
  shopDomain: string;
  settings: JudgeMeRuntimeSettings;
  /** Optional Storefront-API image URLs keyed by product handle. */
  productImageUrlsByHandle?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchPopupReviewsOptions extends Omit<
  FetchPopupReviewsPageOptions,
  "settings"
> {
  publicToken: string;
}

export interface CreatePopupReviewsDataOptions {
  page: PopupReviewsPageData;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

const DEFAULT_POPUP_REVIEWS_CONFIG: PopupReviewsConfig = {
  selection: "recent-five-star-with-pictures",
  roundBorderStyle: true,
  showTitle: true,
  showBody: true,
  showReviewer: false,
  showProduct: true,
  imageMode: "review",
  showOnHomePage: true,
  showOnProductPage: true,
  showOnCollectionPage: true,
  showOnCartPage: true,
  position: "bottom_left",
  firstReviewDelaySeconds: 5,
  durationSeconds: 5,
  intervalSeconds: 5,
  reviewCount: 5,
  hideOnMobile: true,
  starColor: "#108474",
};

/** Fetches the configured public reviews used by Judge.me's popup embed. */
export async function fetchPopupReviewsPage({
  shopDomain,
  settings,
  productImageUrlsByHandle,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchPopupReviewsPageOptions): Promise<PopupReviewsPageData> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const config = normalizePopupReviewsConfig(settings);
  const isFeatured = config.selection === "featured";
  const prefersPictures = config.selection === "recent-five-star-with-pictures";
  const page = await fetchCardsCarouselPage({
    shopDomain: normalizedShopDomain,
    config: {
      reviewSelection: isFeatured ? "featured_reviews" : "all",
      starRating: isFeatured ? "all" : "5",
      displayOrder: prefersPictures ? "media_first" : "most_recent",
      // The popup can display at most 15 reviews. Asking for the carousel
      // endpoint's 30-card maximum gives picture-first selection room before
      // this adapter applies the dashboard count.
      maxReviews: prefersPictures ? 30 : config.reviewCount,
    },
    signal,
    fetch: fetchImplementation,
  });
  const reviews = page.reviews
    .map((review, index) =>
      normalizePopupReview({
        index,
        productImageUrlsByHandle,
        review,
        shopDomain: normalizedShopDomain,
      }),
    )
    .filter((review): review is PopupReview => review !== null)
    .slice(0, config.reviewCount);

  return { reviews, selection: config.selection };
}

/** Fetches popup settings plus its public review feed. */
export async function fetchPopupReviews({
  shopDomain,
  publicToken,
  productImageUrlsByHandle,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchPopupReviewsOptions): Promise<PopupReviewsData> {
  const resources = await fetchAllReviewsCounter({
    shopDomain,
    publicToken,
    signal,
    fetch: fetchImplementation,
  });
  const page = await fetchPopupReviewsPage({
    shopDomain,
    settings: resources.settings,
    productImageUrlsByHandle,
    signal,
    fetch: fetchImplementation,
  });

  return createPopupReviewsData({
    page,
    settings: resources.settings,
    shopDomain,
  });
}

/** Combines a popup feed with settings already fetched by another widget. */
export function createPopupReviewsData({
  page,
  settings,
  shopDomain,
}: CreatePopupReviewsDataOptions): PopupReviewsData {
  const config = normalizePopupReviewsConfig(settings);

  if (page.selection !== config.selection) {
    throw new Error("Judge.me returned a mismatched Pop-up Reviews selection.");
  }

  return {
    config,
    page: {
      reviews: page.reviews.slice(0, config.reviewCount),
      selection: page.selection,
    },
    shopDomain: normalizeShopDomain(shopDomain),
  };
}

/** Maps Judge.me's dashboard-generated popup settings to a stable React shape. */
export function normalizePopupReviewsConfig(
  settings: JudgeMeRuntimeSettings,
): PopupReviewsConfig {
  const showPictures = readBooleanSetting(
    settings,
    "popup_widget_show_pictures",
    DEFAULT_POPUP_REVIEWS_CONFIG.imageMode !== "disabled",
  );
  const useReviewPicture = readBooleanSetting(
    settings,
    "popup_widget_use_review_picture",
    true,
  );

  return {
    selection: normalizeSelection(settings.popup_widget_review_selection),
    roundBorderStyle: readBooleanSetting(
      settings,
      "popup_widget_round_border_style",
      DEFAULT_POPUP_REVIEWS_CONFIG.roundBorderStyle,
    ),
    showTitle: readBooleanSetting(
      settings,
      "popup_widget_show_title",
      DEFAULT_POPUP_REVIEWS_CONFIG.showTitle,
    ),
    showBody: readBooleanSetting(
      settings,
      "popup_widget_show_body",
      DEFAULT_POPUP_REVIEWS_CONFIG.showBody,
    ),
    showReviewer: readBooleanSetting(
      settings,
      "popup_widget_show_reviewer",
      DEFAULT_POPUP_REVIEWS_CONFIG.showReviewer,
    ),
    showProduct: readBooleanSetting(
      settings,
      "popup_widget_show_product",
      DEFAULT_POPUP_REVIEWS_CONFIG.showProduct,
    ),
    imageMode: !showPictures
      ? "disabled"
      : useReviewPicture
        ? "review"
        : "product",
    showOnHomePage: readBooleanSetting(
      settings,
      "popup_widget_show_on_home_page",
      DEFAULT_POPUP_REVIEWS_CONFIG.showOnHomePage,
    ),
    showOnProductPage: readBooleanSetting(
      settings,
      "popup_widget_show_on_product_page",
      DEFAULT_POPUP_REVIEWS_CONFIG.showOnProductPage,
    ),
    showOnCollectionPage: readBooleanSetting(
      settings,
      "popup_widget_show_on_collection_page",
      DEFAULT_POPUP_REVIEWS_CONFIG.showOnCollectionPage,
    ),
    showOnCartPage: readBooleanSetting(
      settings,
      "popup_widget_show_on_cart_page",
      DEFAULT_POPUP_REVIEWS_CONFIG.showOnCartPage,
    ),
    position: normalizePosition(settings.popup_widget_position),
    firstReviewDelaySeconds: readNumberSetting(
      settings,
      "popup_widget_first_review_delay",
      DEFAULT_POPUP_REVIEWS_CONFIG.firstReviewDelaySeconds,
      0,
      300,
    ),
    durationSeconds: readNumberSetting(
      settings,
      "popup_widget_duration",
      DEFAULT_POPUP_REVIEWS_CONFIG.durationSeconds,
      1,
      300,
    ),
    intervalSeconds: readNumberSetting(
      settings,
      "popup_widget_interval",
      DEFAULT_POPUP_REVIEWS_CONFIG.intervalSeconds,
      0,
      300,
    ),
    reviewCount: readNumberSetting(
      settings,
      "popup_widget_review_count",
      DEFAULT_POPUP_REVIEWS_CONFIG.reviewCount,
      1,
      15,
    ),
    hideOnMobile: readBooleanSetting(
      settings,
      "popup_widget_hide_on_mobile",
      DEFAULT_POPUP_REVIEWS_CONFIG.hideOnMobile,
    ),
    starColor:
      readColorSetting(settings.widget_star_color) ??
      readColorSetting(settings.badge_star_color) ??
      DEFAULT_POPUP_REVIEWS_CONFIG.starColor,
  };
}

function normalizePopupReview({
  index,
  productImageUrlsByHandle,
  review,
  shopDomain,
}: {
  index: number;
  productImageUrlsByHandle?: Readonly<Record<string, string>>;
  review: CardsCarouselReview;
  shopDomain: string;
}): PopupReview | null {
  const id = readString(review.uuid) || `popup-review-${index}`;
  const rating = readFiniteNumber(review.rating);

  if (rating === undefined || rating < 1 || rating > 5) return null;

  const productUrlWithUtm = readString(review.product_url_with_utm);
  const directProductUrl = readString(review.product_url);
  const rawProductUrl = getProductHandle(productUrlWithUtm)
    ? productUrlWithUtm
    : directProductUrl || productUrlWithUtm;
  const productHandle = getProductHandle(rawProductUrl);
  const productUrl = normalizeProductUrl(rawProductUrl, shopDomain);
  const reviewPictureUrl = getReviewPictureUrl(review);
  const productPictureUrl =
    getSafeHttpsUrl(
      productHandle ? productImageUrlsByHandle?.[productHandle] : undefined,
    ) ?? getSafeHttpsUrl(readString(review.product_variant_image_url));

  return {
    id,
    title: readString(review.title) ?? "",
    body: readString(review.body) ?? "",
    rating,
    reviewerName: readString(review.reviewer_name) ?? "",
    productTitle:
      readString(review.product_title_localized) ??
      readString(review.product_title) ??
      "",
    productHandle,
    productUrl,
    reviewPictureUrl,
    productPictureUrl,
  };
}

function getReviewPictureUrl(review: CardsCarouselReview): string | undefined {
  const pictures = Array.isArray(review.pictures_urls)
    ? review.pictures_urls
    : [];
  const firstPicture = pictures[0];
  const firstPictureUrl = getResponsiveImageUrl(firstPicture);

  if (firstPictureUrl) return firstPictureUrl;

  const picture = readObject(review.picture);
  return getResponsiveImageUrl(picture?.urls);
}

function getResponsiveImageUrl(value: JudgeMeJsonValue | undefined) {
  const urls = readObject(value);

  return (
    getSafeHttpsUrl(readString(urls?.compact)) ??
    getSafeHttpsUrl(readString(urls?.small)) ??
    getSafeHttpsUrl(readString(urls?.huge)) ??
    getSafeHttpsUrl(readString(urls?.original))
  );
}

function normalizeSelection(value: JudgeMeJsonValue | undefined) {
  const selection = readString(value)?.toLowerCase() ?? "";

  if (!selection) return DEFAULT_POPUP_REVIEWS_CONFIG.selection;

  if (
    selection.includes("manual") ||
    selection.includes("feature") ||
    selection.includes("choose")
  ) {
    return "featured" satisfies PopupReviewsSelection;
  }

  if (selection.includes("picture")) {
    return "recent-five-star-with-pictures" satisfies PopupReviewsSelection;
  }

  if (selection.includes("automatic") || selection.includes("recent")) {
    return "recent-five-star" satisfies PopupReviewsSelection;
  }

  return DEFAULT_POPUP_REVIEWS_CONFIG.selection;
}

function normalizePosition(
  value: JudgeMeJsonValue | undefined,
): PopupReviewsPosition {
  return value === "bottom_left" ||
    value === "bottom_right" ||
    value === "top_left" ||
    value === "top_right"
    ? value
    : DEFAULT_POPUP_REVIEWS_CONFIG.position;
}

function normalizeProductUrl(
  value: string | undefined,
  shopDomain: string,
): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value, `https://${shopDomain}`);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }

    return url.hostname === shopDomain
      ? `${url.pathname}${url.search}${url.hash}`
      : url.toString();
  } catch {
    return undefined;
  }
}

function getProductHandle(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value, "https://store.myshopify.com");
    const match = url.pathname.match(/^\/products\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function getSafeHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function readObject(
  value: JudgeMeJsonValue | undefined,
): Readonly<Record<string, JudgeMeJsonValue>> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

function readString(value: JudgeMeJsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFiniteNumber(
  value: JudgeMeJsonValue | undefined,
): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readBooleanSetting(
  settings: JudgeMeRuntimeSettings,
  key: string,
  fallback: boolean,
): boolean {
  const value = settings[key];

  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function readNumberSetting(
  settings: JudgeMeRuntimeSettings,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = readFiniteNumber(settings[key]);

  if (value === undefined) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function readColorSetting(value: JudgeMeJsonValue | undefined) {
  const color = readString(value);

  if (
    !color ||
    color.length > 64 ||
    color.includes(";") ||
    color.includes("{") ||
    color.includes("}")
  ) {
    return undefined;
  }

  return color;
}
