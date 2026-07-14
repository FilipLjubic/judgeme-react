import type { JudgeMeRuntimeSettings } from "./legacy-api.js";
import type { AiReviewsSummaryData } from "./ai-reviews-summary-api.js";
import type {
  CardsCarouselConfig,
  CardsCarouselData,
} from "./cards-carousel-api.js";
import type { ReviewsGridData } from "./reviews-grid-api.js";
import type { ReviewSnippetsData } from "./review-snippets-api.js";
import type {
  TestimonialsCarouselConfig,
  TestimonialsCarouselData,
} from "./testimonials-carousel-api.js";
import type {
  VideosCarouselConfig,
  VideosCarouselData,
} from "./videos-carousel-api.js";
import type { TrustBadgeData } from "./trust-badge-api.js";
import type { HappyCustomersData } from "./happy-customers-api.js";
import type { ReviewWidgetV3Data } from "./review-widget-v3-api.js";
import { ensureJudgeMeCoreRuntime } from "./legacy-runtime.js";

const JUDGE_ME_API_HOST = "https://api.judge.me";
const JUDGE_ME_CDN_API_HOST = "https://cdn.judge.me/";
const AI_REVIEWS_SUMMARY_ENTRY_KEY = "store-summary-widget/main.js";
const REVIEW_SNIPPETS_ENTRY_KEY = "review-snippet-widget/main.js";
const REVIEWS_GRID_ENTRY_KEY = "reviews-grid-widget/main.js";
const TRUST_BADGE_ENTRY_KEY = "trust-badge/main.js";
const HAPPY_CUSTOMERS_ENTRY_KEY = "all-reviews-widget-v2025/main.js";
const HAPPY_CUSTOMERS_MANAGER_ENTRY_KEY =
  "all-reviews-widget-v2025/AllReviewsWidgetV2025Manager.js";
const REVIEW_WIDGET_V3_ENTRY_KEY = "review-widget/main.js";
const REVIEW_WIDGET_V3_MANAGER_ENTRY_KEY =
  "review-widget/ReviewWidgetManager.js";
const REVIEWS_GRID_ENTRY_FILE = "reviews_grid.js";
const CAROUSEL_LIGHTBOX_ENTRY_KEY = "carousel-lightbox/main.js";
const CAROUSEL_STYLES_FILE = "carousels.css";
const CAROUSEL_RUNTIME_FILE = "carousels.js";
const CAROUSEL_CARDS_FILE = "media_carousel.js";
const CAROUSEL_NAVIGATION_FILE = "video_carousel.js";
const CAROUSEL_TESTIMONIALS_FILE = "testimonials_carousel.js";
const EXACT_RUNTIME_TIMEOUT_MS = 15_000;
const CAROUSEL_PLAY_BUTTON_SVG =
  '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.0457 40 20 40C8.95431 40 0 31.0457 0 20Z" fill="black" fill-opacity="0.36"/><path d="M16 13L28 20L16 27V13Z" fill="white"/></svg>';

interface ViteManifestEntry {
  css?: unknown;
  dynamicImports?: unknown;
  file?: unknown;
  imports?: unknown;
}

type ViteManifest = Record<string, ViteManifestEntry>;

interface ExactJudgeMeRuntime {
  API_HOST?: string;
  CDN_API_HOST?: string;
  CDN_BASE_URL?: string;
  PLATFORM?: string;
  PUBLIC_TOKEN?: string;
  SHOP_DOMAIN?: string;
  data?: Record<string, unknown>;
  debugLog?: (...values: unknown[]) => void;
}

interface CarouselMode {
  carousel_style: string;
  index: number;
  interactionCleanup?: () => void;
  resizeObserver?: ResizeObserver;
  revCount: number;
  reviews:
    | CardsCarouselData["page"]["reviews"]
    | TestimonialsCarouselData["page"]["reviews"]
    | VideosCarouselData["page"]["reviews"];
  root: HTMLElement;
  slideInterval: ReturnType<typeof setInterval> | null;
}

interface CardsCarouselRuntimeConfig extends Record<string, unknown> {
  autoplay_media: string;
  carousel_style: string;
  carousel_type: "cards";
  design_mode: boolean;
  display_order: CardsCarouselConfig["displayOrder"];
  max_reviews: number;
  min_reviews: number;
  no_image_fallback: CardsCarouselConfig["noImageFallback"];
  primary_lang: string;
  reviews_selection: CardsCarouselConfig["reviewSelection"];
  reviews_shown: string;
  show_product_name: string;
  show_review_media: string;
  show_reviewer_name: string;
  show_sample_reviews: boolean;
  star_rating: string;
  stars_color: string;
  transition_speed: number;
}

interface TestimonialsCarouselRuntimeConfig extends Record<string, unknown> {
  carousel_style: string;
  carousel_type: "testimonials";
  design_mode: boolean;
  max_reviews: number;
  min_reviews: number;
  primary_lang: string;
  product_name_text_size: TestimonialsCarouselConfig["productNameTextSize"];
  quote_marks_size: TestimonialsCarouselConfig["quoteMarksSize"];
  reviews_selection: TestimonialsCarouselConfig["reviewSelection"];
  show_sample_reviews: boolean;
  star_rating: TestimonialsCarouselConfig["starRating"];
  stars_color: string;
  stars_size: TestimonialsCarouselConfig["starsSize"];
  transition_speed: number;
  verified_badge_style: "icon" | "text";
}

interface VideosCarouselRuntimeConfig extends Record<string, unknown> {
  autoplay_media: string;
  carousel_style: VideosCarouselConfig["carouselStyle"];
  carousel_type: "videos";
  design_mode: boolean;
  max_reviews: number;
  min_reviews: number;
  primary_lang: string;
  review_type: "all" | "photo_and_video" | "video";
  reviews_selection: VideosCarouselConfig["reviewSelection"];
  show_reviewer_name: string;
  show_sample_reviews: boolean;
  star_rating: VideosCarouselConfig["starRating"];
  stars_color: string;
  stars_size: VideosCarouselConfig["starsSize"];
  transition_speed: number;
}

type CarouselRuntimeConfig =
  | CardsCarouselRuntimeConfig
  | TestimonialsCarouselRuntimeConfig
  | VideosCarouselRuntimeConfig;

interface CarouselUtils {
  attachCarouselLightbox: (
    root: HTMLElement,
    mode: CarouselMode,
    config: CarouselRuntimeConfig,
  ) => void;
  buildCards: (
    root: HTMLElement,
    config: CarouselRuntimeConfig,
    builder: CarouselBuilder,
  ) => void;
  setAverage: (root: HTMLElement, rating: number) => void;
  setStarsColor: (
    root: HTMLElement,
    config: CardsCarouselRuntimeConfig | VideosCarouselRuntimeConfig,
  ) => void;
  setStartIndex: (root: HTMLElement, mode: CarouselMode) => void;
  setVerified: (root: HTMLElement) => void;
  showCard: (root: HTMLElement, mode: CarouselMode) => void;
  updateHeaderText: (root: HTMLElement, config: CarouselRuntimeConfig) => void;
}

type CarouselBuilder = (
  root: HTMLElement,
  config: CarouselRuntimeConfig,
  mode: CarouselMode,
) => void;

interface CarouselElement extends HTMLElement {
  _clickHandler?: EventListener;
  _initialPositioningComplete?: boolean;
  _videoCarouselInitialized?: boolean;
  _videoCarouselInstance?: {
    destroy?: () => void;
    syncActiveCard?: () => void;
  };
}

interface TrustBadgeWidgetManager {
  destroy?: () => void;
}

interface TrustBadgeInitializer {
  widgetManagers?: Map<HTMLElement, TrustBadgeWidgetManager>;
}

interface HappyCustomersWidget {
  app?: {
    unmount?: () => void;
  };
}

interface HappyCustomersWidgetManager {
  initialize: () => Promise<HappyCustomersWidget>;
  widget?: HappyCustomersWidget;
}

type HappyCustomersWidgetManagerConstructor = new (
  container: HTMLElement,
  options: {
    fallbackData: Record<string, unknown>;
    settingsOverrides?: Record<string, unknown>;
  },
) => HappyCustomersWidgetManager;

interface ReviewWidgetV3Widget {
  app?: {
    unmount?: () => void;
  };
}

interface ReviewWidgetV3WidgetManager {
  initialize: () => Promise<ReviewWidgetV3Widget>;
  widget?: ReviewWidgetV3Widget;
}

type ReviewWidgetV3WidgetManagerConstructor = new (
  container: HTMLElement,
) => ReviewWidgetV3WidgetManager;

interface ExactJudgeMeWindow extends Window {
  jdgm?: ExactJudgeMeRuntime;
  judgeme?: ExactJudgeMeRuntime;
  jdgmSettings?: JudgeMeRuntimeSettings;
  jdgmBuildMediaCards?: CarouselBuilder;
  jdgmBuildTestimonialCards?: CarouselBuilder;
  jdgmCarouselMode?: Record<string, CarouselMode>;
  jdgmCarouselUtils?: CarouselUtils;
  jdgmHideArrows?: (
    root: HTMLElement,
    config: CardsCarouselRuntimeConfig,
  ) => void;
  jdgmNextCard?: (blockId: string) => void;
  jdgmPlayButtonSVG?: string;
  jdgmPreviousCard?: (blockId: string) => void;
  jdgmSetCardsWidth?: (
    root: HTMLElement,
    config: CardsCarouselRuntimeConfig,
    reviewCount: number,
  ) => void;
  __trustBadgeInitializer?: TrustBadgeInitializer;
}

export interface InitializeReviewsGridOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: ReviewsGridData;
  publicToken?: string;
}

export interface InitializeAiReviewsSummaryOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: AiReviewsSummaryData;
  publicToken?: string;
}

export interface InitializeReviewSnippetsOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: ReviewSnippetsData;
  publicToken?: string;
}

export interface InitializeCardsCarouselOptions {
  assetBaseUrl: string;
  blockId: string;
  container: HTMLElement;
  data: CardsCarouselData;
  publicToken?: string;
}

export interface InitializeTestimonialsCarouselOptions {
  assetBaseUrl: string;
  blockId: string;
  container: HTMLElement;
  data: TestimonialsCarouselData;
  publicToken?: string;
}

export interface InitializeVideosCarouselOptions {
  assetBaseUrl: string;
  blockId: string;
  container: HTMLElement;
  data: VideosCarouselData;
  publicToken?: string;
}

export interface InitializeTrustBadgeOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: TrustBadgeData;
  publicToken?: string;
}

export interface InitializeHappyCustomersOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: HappyCustomersData;
  publicToken?: string;
}

export interface InitializeReviewWidgetV3Options {
  assetBaseUrl: string;
  container: HTMLElement;
  data: ReviewWidgetV3Data;
  publicToken?: string;
}

let exactRuntimeShopDomain: string | undefined;
let exactRuntimeAssetBaseUrl: string | undefined;
let moduleInstance = 0;
const manifestPromises = new Map<string, Promise<ViteManifest>>();
const stylesheetPromises = new Map<string, Promise<void>>();
const scriptPromises = new Map<string, Promise<void>>();
const modulePromises = new Map<string, Promise<void>>();
const aiReviewsSummaryInitializers = new WeakMap<HTMLElement, Promise<void>>();
let aiReviewsSummaryScanQueue = Promise.resolve();
const reviewSnippetsInitializers = new WeakMap<HTMLElement, Promise<void>>();
const reviewSnippetsResponses = new Map<
  string,
  { payload: string; references: number }
>();
let reviewSnippetsFetchBridgeInstalled = false;
let reviewSnippetsScanQueue = Promise.resolve();
const reviewsGridInitializers = new WeakMap<HTMLElement, Promise<void>>();
const cardsCarouselInitializers = new WeakMap<HTMLElement, Promise<void>>();
const cardsCarouselDisposals = new WeakMap<HTMLElement, number>();
const testimonialsCarouselInitializers = new WeakMap<
  HTMLElement,
  Promise<void>
>();
const testimonialsCarouselDisposals = new WeakMap<HTMLElement, number>();
const videosCarouselInitializers = new WeakMap<HTMLElement, Promise<void>>();
const videosCarouselDisposals = new WeakMap<HTMLElement, number>();
const trustBadgeInitializers = new WeakMap<HTMLElement, Promise<void>>();
const trustBadgeManagers = new WeakMap<HTMLElement, TrustBadgeWidgetManager>();
const trustBadgeDisposals = new WeakMap<HTMLElement, number>();
let trustBadgeScanQueue = Promise.resolve();
const happyCustomersInitializers = new WeakMap<HTMLElement, Promise<void>>();
const happyCustomersManagers = new WeakMap<
  HTMLElement,
  HappyCustomersWidgetManager
>();
const happyCustomersDisposals = new WeakMap<HTMLElement, number>();
const reviewWidgetV3Initializers = new WeakMap<HTMLElement, Promise<void>>();
const reviewWidgetV3Managers = new WeakMap<
  HTMLElement,
  ReviewWidgetV3WidgetManager
>();
const reviewWidgetV3Disposals = new WeakMap<HTMLElement, number>();
const reviewWidgetV3PreviewKeys = new WeakMap<HTMLElement, string>();
const reviewWidgetV3PreviewResponses = new Map<
  string,
  { payload: string; references: number }
>();
let reviewWidgetV3FetchBridgeInstalled = false;

/** Loads Judge.me's deployment-specific AI Reviews Summary module. */
export function initializeAiReviewsSummary(
  options: InitializeAiReviewsSummaryOptions,
): Promise<void> {
  const existing = aiReviewsSummaryInitializers.get(options.container);
  if (existing) return existing;

  const initializer = aiReviewsSummaryScanQueue.then(() =>
    initializeAiReviewsSummaryRoot(options),
  );
  aiReviewsSummaryScanQueue = initializer.catch(() => undefined);
  const guardedInitializer = initializer.catch((error) => {
    aiReviewsSummaryInitializers.delete(options.container);
    throw error;
  });
  aiReviewsSummaryInitializers.set(options.container, guardedInitializer);
  return guardedInitializer;
}

/** Loads Judge.me's deployment-specific Review Snippets module. */
export function initializeReviewSnippets(
  options: InitializeReviewSnippetsOptions,
): Promise<void> {
  if (typeof window !== "undefined") {
    registerReviewSnippetsResponse(options.data);
  }

  const existing = reviewSnippetsInitializers.get(options.container);
  if (existing) return existing;

  const initializer = reviewSnippetsScanQueue.then(() =>
    initializeReviewSnippetsRoot(options),
  );
  reviewSnippetsScanQueue = initializer.catch(() => undefined);
  const guardedInitializer = initializer.catch((error) => {
    reviewSnippetsInitializers.delete(options.container);
    throw error;
  });
  reviewSnippetsInitializers.set(options.container, guardedInitializer);
  return guardedInitializer;
}

/** Releases the preloaded response retained for one mounted snippets root. */
export function releaseReviewSnippetsResponse(data: ReviewSnippetsData): void {
  if (typeof window === "undefined") return;

  const requestKey = canonicalizeReviewSnippetsRequest(data.page.requestUrl);
  const response = reviewSnippetsResponses.get(requestKey);
  if (!response) return;

  if (response.references <= 1) reviewSnippetsResponses.delete(requestKey);
  else response.references -= 1;
}

/** Loads Judge.me's deployment-specific v3 Reviews Grid module for one root. */
export function initializeReviewsGrid(
  options: InitializeReviewsGridOptions,
): Promise<void> {
  const existing = reviewsGridInitializers.get(options.container);
  if (existing) return existing;

  const initializer = initializeReviewsGridRoot(options).catch((error) => {
    reviewsGridInitializers.delete(options.container);
    throw error;
  });
  reviewsGridInitializers.set(options.container, initializer);
  return initializer;
}

/** Loads Judge.me's exact Cards Carousel scripts and v3 lightbox for one root. */
export function initializeCardsCarousel(
  options: InitializeCardsCarouselOptions,
): Promise<void> {
  if (typeof window !== "undefined") {
    const pendingDisposal = cardsCarouselDisposals.get(options.container);
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      cardsCarouselDisposals.delete(options.container);
    }
  }

  const existing = cardsCarouselInitializers.get(options.container);
  if (existing) return existing;

  const initializer = initializeCardsCarouselRoot(options).catch((error) => {
    cardsCarouselInitializers.delete(options.container);
    throw error;
  });
  cardsCarouselInitializers.set(options.container, initializer);
  return initializer;
}

/** Loads Judge.me's exact Testimonials Carousel scripts and v3 lightbox. */
export function initializeTestimonialsCarousel(
  options: InitializeTestimonialsCarouselOptions,
): Promise<void> {
  if (typeof window !== "undefined") {
    const pendingDisposal = testimonialsCarouselDisposals.get(
      options.container,
    );
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      testimonialsCarouselDisposals.delete(options.container);
    }
  }

  const existing = testimonialsCarouselInitializers.get(options.container);
  if (existing) return existing;

  const initializer = initializeTestimonialsCarouselRoot(options).catch(
    (error) => {
      testimonialsCarouselInitializers.delete(options.container);
      throw error;
    },
  );
  testimonialsCarouselInitializers.set(options.container, initializer);
  return initializer;
}

/** Loads Judge.me's exact Videos Carousel scripts and v3 lightbox. */
export function initializeVideosCarousel(
  options: InitializeVideosCarouselOptions,
): Promise<void> {
  if (typeof window !== "undefined") {
    const pendingDisposal = videosCarouselDisposals.get(options.container);
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      videosCarouselDisposals.delete(options.container);
    }
  }

  const existing = videosCarouselInitializers.get(options.container);
  if (existing) return existing;

  const initializer = initializeVideosCarouselRoot(options).catch((error) => {
    videosCarouselInitializers.delete(options.container);
    throw error;
  });
  videosCarouselInitializers.set(options.container, initializer);
  return initializer;
}

/** Loads Judge.me's current v3 Trust Badge module for one SPA root. */
export function initializeTrustBadge(
  options: InitializeTrustBadgeOptions,
): Promise<void> {
  if (typeof window !== "undefined") {
    const pendingDisposal = trustBadgeDisposals.get(options.container);
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      trustBadgeDisposals.delete(options.container);
    }
  }

  const existing = trustBadgeInitializers.get(options.container);
  if (existing) return existing;

  const initializer = trustBadgeScanQueue.then(() =>
    initializeTrustBadgeRoot(options),
  );
  trustBadgeScanQueue = initializer.catch(() => undefined);
  const guardedInitializer = initializer.catch((error) => {
    trustBadgeInitializers.delete(options.container);
    throw error;
  });
  trustBadgeInitializers.set(options.container, guardedInitializer);
  return guardedInitializer;
}

/** Loads Judge.me's current Happy Customers manager for one SPA root. */
export function initializeHappyCustomers(
  options: InitializeHappyCustomersOptions,
): Promise<void> {
  if (typeof window !== "undefined") {
    const pendingDisposal = happyCustomersDisposals.get(options.container);
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      happyCustomersDisposals.delete(options.container);
    }
  }

  const existing = happyCustomersInitializers.get(options.container);
  if (existing) return existing;

  const initializer = initializeHappyCustomersRoot(options).catch((error) => {
    happyCustomersInitializers.delete(options.container);
    throw error;
  });
  happyCustomersInitializers.set(options.container, initializer);
  return initializer;
}

/** Loads Judge.me's current new Review Widget manager for one SPA root. */
export function initializeReviewWidgetV3(
  options: InitializeReviewWidgetV3Options,
): Promise<void> {
  if (typeof window !== "undefined") {
    const pendingDisposal = reviewWidgetV3Disposals.get(options.container);
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      reviewWidgetV3Disposals.delete(options.container);
    }
  }

  const existing = reviewWidgetV3Initializers.get(options.container);
  if (existing) return existing;

  const initializer = initializeReviewWidgetV3Root(options).catch((error) => {
    releaseReviewWidgetV3PreviewResponse(options.container);
    reviewWidgetV3Initializers.delete(options.container);
    throw error;
  });
  reviewWidgetV3Initializers.set(options.container, initializer);
  return initializer;
}

/** Releases root-local observers and timers after an SPA unmount. */
export function disposeCardsCarousel(
  container: HTMLElement,
  blockId: string,
): void {
  if (typeof window === "undefined") return;

  const runtimeWindow = window as ExactJudgeMeWindow;
  const carousel = container as CarouselElement;
  const initializer = cardsCarouselInitializers.get(container);
  const timeoutId = window.setTimeout(() => {
    cardsCarouselDisposals.delete(container);
    const cleanup = () => {
      const mode = runtimeWindow.jdgmCarouselMode?.[blockId];
      if (mode?.root !== container) return;

      mode.resizeObserver?.disconnect();
      if (mode.slideInterval) window.clearInterval(mode.slideInterval);
      mode.interactionCleanup?.();
      carousel._videoCarouselInstance?.destroy?.();
      if (carousel._clickHandler) {
        carousel.removeEventListener("click", carousel._clickHandler);
        delete carousel._clickHandler;
      }
      delete runtimeWindow.jdgmCarouselMode?.[blockId];
      cardsCarouselInitializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  cardsCarouselDisposals.set(container, timeoutId);
}

/** Releases Testimonials Carousel timers and listeners after an SPA unmount. */
export function disposeTestimonialsCarousel(
  container: HTMLElement,
  blockId: string,
): void {
  if (typeof window === "undefined") return;

  const runtimeWindow = window as ExactJudgeMeWindow;
  const carousel = container as CarouselElement;
  const initializer = testimonialsCarouselInitializers.get(container);
  const timeoutId = window.setTimeout(() => {
    testimonialsCarouselDisposals.delete(container);
    const cleanup = () => {
      const mode = runtimeWindow.jdgmCarouselMode?.[blockId];
      if (mode?.root !== container) return;

      if (mode.slideInterval) window.clearInterval(mode.slideInterval);
      mode.interactionCleanup?.();
      if (carousel._clickHandler) {
        carousel.removeEventListener("click", carousel._clickHandler);
        delete carousel._clickHandler;
      }
      delete runtimeWindow.jdgmCarouselMode?.[blockId];
      testimonialsCarouselInitializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  testimonialsCarouselDisposals.set(container, timeoutId);
}

/** Releases Videos Carousel players and listeners after an SPA unmount. */
export function disposeVideosCarousel(
  container: HTMLElement,
  blockId: string,
): void {
  if (typeof window === "undefined") return;

  const runtimeWindow = window as ExactJudgeMeWindow;
  const carousel = container as CarouselElement;
  const initializer = videosCarouselInitializers.get(container);
  const timeoutId = window.setTimeout(() => {
    videosCarouselDisposals.delete(container);
    const cleanup = () => {
      const mode = runtimeWindow.jdgmCarouselMode?.[blockId];
      if (mode?.root !== container) return;

      mode.resizeObserver?.disconnect();
      if (mode.slideInterval) window.clearInterval(mode.slideInterval);
      mode.interactionCleanup?.();
      carousel._videoCarouselInstance?.destroy?.();
      if (carousel._clickHandler) {
        carousel.removeEventListener("click", carousel._clickHandler);
        delete carousel._clickHandler;
      }
      delete runtimeWindow.jdgmCarouselMode?.[blockId];
      videosCarouselInitializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  videosCarouselDisposals.set(container, timeoutId);
}

/** Releases the manager owned by one Trust Badge after an SPA unmount. */
export function disposeTrustBadge(container: HTMLElement): void {
  if (typeof window === "undefined") return;

  const initializer = trustBadgeInitializers.get(container);
  const timeoutId = window.setTimeout(() => {
    trustBadgeDisposals.delete(container);
    const cleanup = () => {
      const manager = trustBadgeManagers.get(container);
      manager?.destroy?.();
      const runtimeWindow = window as ExactJudgeMeWindow;
      runtimeWindow.__trustBadgeInitializer?.widgetManagers?.delete(container);
      trustBadgeManagers.delete(container);
      trustBadgeInitializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  trustBadgeDisposals.set(container, timeoutId);
}

/** Unmounts the Vue app owned by one Happy Customers root. */
export function disposeHappyCustomers(container: HTMLElement): void {
  if (typeof window === "undefined") return;

  const initializer = happyCustomersInitializers.get(container);
  const timeoutId = window.setTimeout(() => {
    happyCustomersDisposals.delete(container);
    const cleanup = () => {
      const manager = happyCustomersManagers.get(container);
      manager?.widget?.app?.unmount?.();
      container.replaceChildren();
      happyCustomersManagers.delete(container);
      happyCustomersInitializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  happyCustomersDisposals.set(container, timeoutId);
}

/** Unmounts the Vue app and preview bridge owned by one v3 Review Widget. */
export function disposeReviewWidgetV3(container: HTMLElement): void {
  if (typeof window === "undefined") return;

  const initializer = reviewWidgetV3Initializers.get(container);
  const timeoutId = window.setTimeout(() => {
    reviewWidgetV3Disposals.delete(container);
    const cleanup = () => {
      const manager = reviewWidgetV3Managers.get(container);
      manager?.widget?.app?.unmount?.();
      container.replaceChildren();
      releaseReviewWidgetV3PreviewResponse(container);
      reviewWidgetV3Managers.delete(container);
      reviewWidgetV3Initializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  reviewWidgetV3Disposals.set(container, timeoutId);
}

/** Moves an initialized Cards Carousel without CSP-unsafe inline handlers. */
export function moveCardsCarousel(
  blockId: string,
  direction: "next" | "previous",
): void {
  if (typeof window === "undefined") return;

  const runtimeWindow = window as ExactJudgeMeWindow;
  if (direction === "next") runtimeWindow.jdgmNextCard?.(blockId);
  else runtimeWindow.jdgmPreviousCard?.(blockId);
}

/** Moves an initialized Testimonials Carousel. */
export function moveTestimonialsCarousel(
  blockId: string,
  direction: "next" | "previous",
): void {
  moveCardsCarousel(blockId, direction);
}

/** Moves an initialized Videos Carousel. */
export function moveVideosCarousel(
  blockId: string,
  direction: "next" | "previous",
): void {
  moveCardsCarousel(blockId, direction);
}

async function initializeAiReviewsSummaryRoot({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeAiReviewsSummaryOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
    runtimeData: {
      storeSummaryWidget: createAiReviewsSummaryBootstrap(data),
    },
  });

  await loadManifestStyles(assetBaseUrl, AI_REVIEWS_SUMMARY_ENTRY_KEY);

  if (!isAiReviewsSummaryReady(container)) {
    const manifest = await getManifest(assetBaseUrl);
    const entryFile = getManifestFile(manifest, AI_REVIEWS_SUMMARY_ENTRY_KEY);
    await loadModule(
      new URL(
        `${entryFile}?judgeme_react_instance=${++moduleInstance}`,
        assetBaseUrl,
      ).toString(),
      "AI Reviews Summary",
    );
    await waitForAiReviewsSummary(container);
  }

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] AI Reviews Summary exact adapter ready",
  );
}

async function initializeReviewSnippetsRoot({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeReviewSnippetsOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });
  await loadManifestStyles(assetBaseUrl, REVIEW_SNIPPETS_ENTRY_KEY);

  if (!isReviewSnippetsReady(container)) {
    const manifest = await getManifest(assetBaseUrl);
    const entryFile = getManifestFile(manifest, REVIEW_SNIPPETS_ENTRY_KEY);
    await loadModule(
      new URL(
        `${entryFile}?judgeme_react_instance=${++moduleInstance}`,
        assetBaseUrl,
      ).toString(),
      "Review Snippets",
    );

    if (data.page.reviews.length > 0) {
      await waitForReviewSnippets(container);
    }
  }

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Review Snippets exact adapter ready",
  );
}

async function initializeReviewsGridRoot({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeReviewsGridOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
    runtimeData: {
      reviewsGridWidget: createReviewsGridBootstrap(data),
    },
  });

  await loadManifestStyles(assetBaseUrl, REVIEWS_GRID_ENTRY_KEY);

  // Judge.me's v3 entry auto-scans the document when the module evaluates and
  // does not expose its manager. A unique query makes later SPA mounts execute
  // a fresh scanner while already-complete roots have their marker removed.
  await loadModule(
    new URL(
      `${REVIEWS_GRID_ENTRY_FILE}?judgeme_react_instance=${++moduleInstance}`,
      assetBaseUrl,
    ).toString(),
    "Reviews Grid",
  );
  await waitForReviewsGrid(container);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Reviews Grid exact adapter ready",
  );
}

async function initializeTrustBadgeRoot({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeTrustBadgeOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });
  await loadManifestStyles(assetBaseUrl, TRUST_BADGE_ENTRY_KEY);

  const manifest = await getManifest(assetBaseUrl);
  const entryFile = getManifestFile(manifest, TRUST_BADGE_ENTRY_KEY);
  await loadModule(
    new URL(
      `${entryFile}?judgeme_react_instance=${++moduleInstance}`,
      assetBaseUrl,
    ).toString(),
    "Trust Badge",
  );
  const manager = await waitForTrustBadge(container);
  trustBadgeManagers.set(container, manager);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Trust Badge exact adapter ready",
  );
}

async function initializeHappyCustomersRoot({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeHappyCustomersOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });
  await loadManifestStyles(assetBaseUrl, HAPPY_CUSTOMERS_ENTRY_KEY);

  const manifest = await getManifest(assetBaseUrl);
  const managerFile = getManifestFile(
    manifest,
    HAPPY_CUSTOMERS_MANAGER_ENTRY_KEY,
  );
  const module = await importExactModule(
    new URL(managerFile, assetBaseUrl).toString(),
    "Happy Customers",
  );
  const Manager = module.AllReviewsWidgetV2025Manager;
  if (typeof Manager !== "function") {
    throw new Error("Judge.me's Happy Customers manager export is missing.");
  }

  const manager = new (Manager as HappyCustomersWidgetManagerConstructor)(
    container,
    { fallbackData: createHappyCustomersBootstrap(data) },
  );
  happyCustomersManagers.set(container, manager);
  await manager.initialize();

  if (!isHappyCustomersReady(container)) {
    throw new Error("Judge.me did not finish initializing Happy Customers.");
  }

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Happy Customers exact adapter ready",
  );
}

async function initializeReviewWidgetV3Root({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeReviewWidgetV3Options): Promise<void> {
  if (typeof window === "undefined") return;

  if (data.source === "disabled-preview") {
    registerReviewWidgetV3PreviewResponse(container, data);
  }

  await ensureJudgeMeCoreRuntime({
    publicToken,
    settings: data.settings,
    shopDomain: data.shopDomain,
  });
  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });
  runtimeWindow.jdgmSettings = {
    ...data.settings,
    ...runtimeWindow.jdgmSettings,
    review_widget_revamp_enabled: true,
  };

  const reviewWidgetData = asRecord(
    runtimeWindow.jdgm?.data?.reviewWidget,
  );
  if (runtimeWindow.jdgm) {
    runtimeWindow.jdgm.data = {
      ...runtimeWindow.jdgm.data,
      reviewWidget: {
        ...reviewWidgetData,
        [data.product.id]: data.page.payload,
      },
    };
    runtimeWindow.judgeme = runtimeWindow.jdgm;
  }

  await loadManifestStyles(assetBaseUrl, REVIEW_WIDGET_V3_ENTRY_KEY);
  const manifest = await getManifest(assetBaseUrl);
  const managerFile = getManifestFile(
    manifest,
    REVIEW_WIDGET_V3_MANAGER_ENTRY_KEY,
  );
  const module = await importExactModule(
    new URL(managerFile, assetBaseUrl).toString(),
    "Review Widget v3",
  );
  const Manager = module.ReviewWidgetManager;
  if (typeof Manager !== "function") {
    throw new Error("Judge.me's Review Widget v3 manager export is missing.");
  }

  const manager = new (Manager as ReviewWidgetV3WidgetManagerConstructor)(
    container,
  );
  reviewWidgetV3Managers.set(container, manager);
  await manager.initialize();

  if (!isReviewWidgetV3Ready(container)) {
    throw new Error("Judge.me did not finish initializing Review Widget v3.");
  }

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Review Widget v3 exact adapter ready",
  );
}

async function initializeCardsCarouselRoot({
  assetBaseUrl,
  blockId,
  container,
  data,
  publicToken,
}: InitializeCardsCarouselOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });
  runtimeWindow.jdgmPlayButtonSVG ??= CAROUSEL_PLAY_BUTTON_SVG;

  await Promise.all([
    loadStylesheet(new URL(CAROUSEL_STYLES_FILE, assetBaseUrl).toString()),
    loadManifestStyles(assetBaseUrl, CAROUSEL_LIGHTBOX_ENTRY_KEY),
  ]);
  await loadScript(
    new URL(CAROUSEL_RUNTIME_FILE, assetBaseUrl).toString(),
    "cards-carousel-runtime",
  );
  await loadScript(
    new URL(CAROUSEL_CARDS_FILE, assetBaseUrl).toString(),
    "cards-carousel-builder",
  );

  const manifest = await getManifest(assetBaseUrl);
  const lightboxFile = getManifestFile(manifest, CAROUSEL_LIGHTBOX_ENTRY_KEY);
  await loadModuleOnce(
    new URL(lightboxFile, assetBaseUrl).toString(),
    "cards-carousel-lightbox",
  );

  const utils = runtimeWindow.jdgmCarouselUtils;
  const buildCards = runtimeWindow.jdgmBuildMediaCards;
  if (!utils || !buildCards) {
    throw new Error("Judge.me's Cards Carousel runtime did not initialize.");
  }

  const config = createCardsCarouselRuntimeConfig(data);
  const mode: CarouselMode = {
    carousel_style: config.carousel_style,
    index: 0,
    resizeObserver: undefined,
    revCount: data.page.reviews.length,
    reviews: data.page.reviews,
    root: container,
    slideInterval: null,
  };
  runtimeWindow.jdgmCarouselMode ??= {};
  runtimeWindow.jdgmCarouselMode[blockId] = mode;

  utils.setAverage(container, data.aggregate.rating);
  utils.setVerified(container);
  utils.updateHeaderText(container, config);
  utils.buildCards(container, config, buildCards);
  utils.attachCarouselLightbox(container, mode, config);
  runtimeWindow.jdgmSetCardsWidth?.(container, config, mode.revCount);

  if (mode.revCount >= config.min_reviews) {
    container.classList.remove("jdgm-hidden");
  }

  utils.setStarsColor(container, config);
  utils.showCard(container, mode);

  if (typeof ResizeObserver !== "undefined" && runtimeWindow.jdgmHideArrows) {
    mode.resizeObserver = new ResizeObserver(() => {
      runtimeWindow.jdgmHideArrows?.(container, config);
    });
    mode.resizeObserver.observe(container);
  }

  await loadUncachedScript(
    new URL(
      `${CAROUSEL_NAVIGATION_FILE}?judgeme_react_instance=${++moduleInstance}`,
      assetBaseUrl,
    ).toString(),
    "cards-carousel-navigation",
  );
  await waitForCardsCarousel(container as CarouselElement, mode.revCount);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Cards Carousel exact adapter ready",
  );
}

async function initializeTestimonialsCarouselRoot({
  assetBaseUrl,
  blockId,
  container,
  data,
  publicToken,
}: InitializeTestimonialsCarouselOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });

  await Promise.all([
    loadStylesheet(new URL(CAROUSEL_STYLES_FILE, assetBaseUrl).toString()),
    loadManifestStyles(assetBaseUrl, CAROUSEL_LIGHTBOX_ENTRY_KEY),
  ]);
  await loadScript(
    new URL(CAROUSEL_RUNTIME_FILE, assetBaseUrl).toString(),
    "testimonials-carousel-runtime",
  );
  await loadScript(
    new URL(CAROUSEL_TESTIMONIALS_FILE, assetBaseUrl).toString(),
    "testimonials-carousel-builder",
  );

  const manifest = await getManifest(assetBaseUrl);
  const lightboxFile = getManifestFile(manifest, CAROUSEL_LIGHTBOX_ENTRY_KEY);
  await loadModuleOnce(
    new URL(lightboxFile, assetBaseUrl).toString(),
    "testimonials-carousel-lightbox",
  );

  const utils = runtimeWindow.jdgmCarouselUtils;
  const buildCards = runtimeWindow.jdgmBuildTestimonialCards;
  if (!utils || !buildCards) {
    throw new Error(
      "Judge.me's Testimonials Carousel runtime did not initialize.",
    );
  }

  const config = createTestimonialsCarouselRuntimeConfig(data);
  const mode: CarouselMode = {
    carousel_style: config.carousel_style,
    index: 0,
    revCount: data.page.reviews.length,
    reviews: data.page.reviews,
    root: container,
    slideInterval: null,
  };
  runtimeWindow.jdgmCarouselMode ??= {};
  runtimeWindow.jdgmCarouselMode[blockId] = mode;

  utils.setAverage(container, data.aggregate.rating);
  utils.setVerified(container);
  utils.updateHeaderText(container, config);
  utils.buildCards(container, config, buildCards);
  utils.attachCarouselLightbox(container, mode, config);
  container.style.setProperty("--slides-count", String(mode.revCount));

  if (mode.revCount >= config.min_reviews) {
    container.classList.remove("jdgm-hidden");
  }

  utils.showCard(container, mode);
  startTestimonialsAutoRotation(
    runtimeWindow,
    container,
    blockId,
    mode,
    config.transition_speed,
  );

  await waitForTestimonialsCarousel(container, mode.revCount);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Testimonials Carousel exact adapter ready",
  );
}

async function initializeVideosCarouselRoot({
  assetBaseUrl,
  blockId,
  container,
  data,
  publicToken,
}: InitializeVideosCarouselOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    settings: data.settings,
    shopDomain: data.shopDomain,
    publicToken,
  });
  runtimeWindow.jdgmPlayButtonSVG ??= CAROUSEL_PLAY_BUTTON_SVG;

  await Promise.all([
    loadStylesheet(new URL(CAROUSEL_STYLES_FILE, assetBaseUrl).toString()),
    loadManifestStyles(assetBaseUrl, CAROUSEL_LIGHTBOX_ENTRY_KEY),
  ]);
  await loadScript(
    new URL(CAROUSEL_RUNTIME_FILE, assetBaseUrl).toString(),
    "videos-carousel-runtime",
  );
  await loadScript(
    new URL(CAROUSEL_CARDS_FILE, assetBaseUrl).toString(),
    "videos-carousel-builder",
  );

  const manifest = await getManifest(assetBaseUrl);
  const lightboxFile = getManifestFile(manifest, CAROUSEL_LIGHTBOX_ENTRY_KEY);
  await loadModuleOnce(
    new URL(lightboxFile, assetBaseUrl).toString(),
    "videos-carousel-lightbox",
  );

  const utils = runtimeWindow.jdgmCarouselUtils;
  const buildCards = runtimeWindow.jdgmBuildMediaCards;
  if (!utils || !buildCards) {
    throw new Error("Judge.me's Videos Carousel runtime did not initialize.");
  }

  const config = createVideosCarouselRuntimeConfig(data);
  const mode: CarouselMode = {
    carousel_style: config.carousel_style,
    index: 0,
    revCount: data.page.reviews.length,
    reviews: data.page.reviews,
    root: container,
    slideInterval: null,
  };
  runtimeWindow.jdgmCarouselMode ??= {};
  runtimeWindow.jdgmCarouselMode[blockId] = mode;

  utils.setAverage(container, data.aggregate.rating);
  utils.setVerified(container);
  utils.updateHeaderText(container, config);
  utils.buildCards(container, config, buildCards);
  utils.attachCarouselLightbox(container, mode, config);
  container.style.setProperty("--slides-count", String(mode.revCount));

  if (mode.revCount >= config.min_reviews) {
    container.classList.remove("jdgm-hidden");
  }

  utils.setStarsColor(container, config);
  utils.setStartIndex(container, mode);
  utils.showCard(container, mode);

  await loadUncachedScript(
    new URL(
      `${CAROUSEL_NAVIGATION_FILE}?judgeme_react_instance=${++moduleInstance}`,
      assetBaseUrl,
    ).toString(),
    "videos-carousel-navigation",
  );
  await waitForVideosCarousel(container as CarouselElement, mode.revCount);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Videos Carousel exact adapter ready",
  );
}

function configureExactRuntime({
  assetBaseUrl,
  settings,
  shopDomain,
  publicToken,
  runtimeData,
}: {
  assetBaseUrl: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  publicToken?: string;
  runtimeData?: Record<string, unknown>;
}): ExactJudgeMeWindow {
  const runtimeWindow = window as ExactJudgeMeWindow;

  if (exactRuntimeShopDomain && exactRuntimeShopDomain !== shopDomain) {
    throw new Error(
      "Judge.me cannot initialize two Shopify stores in one browser document.",
    );
  }

  if (exactRuntimeAssetBaseUrl && exactRuntimeAssetBaseUrl !== assetBaseUrl) {
    throw new Error(
      "Judge.me cannot initialize two v3 extension deployments in one browser document.",
    );
  }

  exactRuntimeShopDomain = shopDomain;
  exactRuntimeAssetBaseUrl = assetBaseUrl;
  runtimeWindow.jdgmSettings ??= settings;

  const runtime: ExactJudgeMeRuntime = {
    ...runtimeWindow.jdgm,
    API_HOST: JUDGE_ME_API_HOST,
    CDN_API_HOST: JUDGE_ME_CDN_API_HOST,
    CDN_BASE_URL: assetBaseUrl,
    PLATFORM: "shopify",
    PUBLIC_TOKEN: publicToken,
    SHOP_DOMAIN: shopDomain,
  };
  runtime.data = {
    ...runtime.data,
    ...runtimeData,
  };
  runtimeWindow.jdgm = runtime;
  runtimeWindow.judgeme = runtime;

  return runtimeWindow;
}

function createHappyCustomersBootstrap(
  data: HappyCustomersData,
): Record<string, unknown> {
  const page = data.page;
  const prefix =
    page.reviewType === "all-reviews"
      ? "all_reviews"
      : page.reviewType === "shop-reviews"
        ? "shop_reviews"
        : "product_reviews";
  const bootstrap: Record<string, unknown> = {
    average_rating: data.aggregate.rating,
    custom_form_filters_and_averages: page.customFormFiltersAndAverages,
    histogram: data.histogram,
    multi_language_sorting_enabled:
      page.reviews.length === 0 &&
      page.primaryLanguage.length > 0 &&
      page.primaryLanguageReviews.length + page.otherLanguageReviews.length > 0,
    number_of_product_reviews: page.numberOfProductReviews,
    number_of_reviews:
      page.reviewType === "all-reviews" ? page.pagination.totalCount : 0,
    number_of_shop_reviews: page.numberOfShopReviews,
  };

  bootstrap[prefix] = page.reviews;
  bootstrap[`${prefix}_pagination`] = createHappyCustomersPagination(
    page.pagination,
  );
  bootstrap[`${prefix}_primary_language_reviews`] = page.primaryLanguageReviews;
  bootstrap[`${prefix}_primary_language_pagination`] =
    createHappyCustomersPagination(page.primaryLanguagePagination);
  bootstrap[`${prefix}_other_language_reviews`] = page.otherLanguageReviews;
  bootstrap[`${prefix}_other_language_pagination`] =
    createHappyCustomersPagination(page.otherLanguagePagination);
  return bootstrap;
}

function createHappyCustomersPagination(
  pagination: HappyCustomersData["page"]["pagination"],
): Record<string, number> {
  return {
    current_page: pagination.currentPage,
    per_page: pagination.perPage,
    total_count: pagination.totalCount,
    total_pages: pagination.totalPages,
  };
}

function createCardsCarouselRuntimeConfig(
  data: CardsCarouselData,
): CardsCarouselRuntimeConfig {
  const config = data.config;

  return {
    autoplay_media: "false",
    carousel_style: "default",
    carousel_type: "cards",
    collection_id: config.collectionId,
    design_mode: false,
    display_order: config.displayOrder,
    max_reviews: config.maxReviews,
    min_reviews: 1,
    no_image_fallback: config.noImageFallback,
    platform: "shopify",
    primary_lang: config.primaryLanguage,
    product_id: data.productId,
    product_ids: config.selectedProductIds,
    reviews_selection: config.reviewSelection,
    reviews_shown: String(config.reviewsShownDesktop),
    show_product_name: String(config.showProductName),
    show_review_media: String(config.showReviewMedia),
    show_reviewer_name: String(config.showReviewerName),
    show_sample_reviews: false,
    shop_aggregates: { reviewCount: data.aggregate.count },
    star_rating: config.starRating,
    stars_color: config.starsColor,
    transition_speed: config.transitionSpeed,
    url: `https://${data.shopDomain}`,
  };
}

function createTestimonialsCarouselRuntimeConfig(
  data: TestimonialsCarouselData,
): TestimonialsCarouselRuntimeConfig {
  const config = data.config;

  return {
    carousel_style: "default",
    carousel_type: "testimonials",
    collection_id: config.collectionId,
    design_mode: false,
    max_reviews: config.maxReviews,
    min_reviews: 1,
    platform: "shopify",
    primary_lang: config.primaryLanguage,
    product_id: data.productId,
    product_ids: config.selectedProductIds,
    product_name_text_size: config.productNameTextSize,
    quote_marks_size: config.quoteMarksSize,
    reviews_selection: config.reviewSelection,
    show_sample_reviews: false,
    shop_aggregates: { reviewCount: data.aggregate.count },
    star_rating: config.starRating,
    stars_color: config.starsAndQuoteMarksColor,
    stars_size: config.starsSize,
    transition_speed: config.transitionSpeed,
    url: `https://${data.shopDomain}`,
    verified_badge_style: config.verifiedReviewer === "badge" ? "icon" : "text",
  };
}

function createVideosCarouselRuntimeConfig(
  data: VideosCarouselData,
): VideosCarouselRuntimeConfig {
  const config = data.config;
  const reviewType = {
    "videos-only": "video",
    "photos-and-videos": "photo_and_video",
    "any-review": "all",
  } as const;

  return {
    autoplay_media: String(config.autoplayMedia),
    carousel_style: config.carouselStyle,
    carousel_type: "videos",
    collection_id: config.collectionId,
    design_mode: false,
    max_reviews: config.maxReviews,
    min_reviews: config.reviewType === "videos-only" ? 3 : 1,
    platform: "shopify",
    primary_lang: config.primaryLanguage,
    product_id: data.productId,
    product_ids: config.selectedProductIds,
    review_type: reviewType[config.reviewType],
    reviews_selection: config.reviewSelection,
    show_reviewer_name: String(config.showReviewerName),
    show_sample_reviews: false,
    shop_aggregates: { reviewCount: data.aggregate.count },
    star_rating: config.starRating,
    stars_color: config.starsColor,
    stars_size: config.starsSize,
    transition_speed: config.transitionSpeed,
    url: `https://${data.shopDomain}`,
  };
}

function startTestimonialsAutoRotation(
  runtimeWindow: ExactJudgeMeWindow,
  container: HTMLElement,
  blockId: string,
  mode: CarouselMode,
  transitionSpeed: number,
): void {
  if (transitionSpeed <= 0 || mode.revCount <= 1) return;

  let pointerInside = false;
  let focusInside = false;
  const stop = () => {
    if (mode.slideInterval) window.clearInterval(mode.slideInterval);
    mode.slideInterval = null;
  };
  const start = () => {
    if (pointerInside || focusInside || mode.slideInterval) return;
    mode.slideInterval = window.setInterval(() => {
      runtimeWindow.jdgmNextCard?.(blockId);
    }, transitionSpeed * 1_000);
  };
  const handleMouseEnter = () => {
    pointerInside = true;
    stop();
  };
  const handleMouseLeave = () => {
    pointerInside = false;
    start();
  };
  const handleFocusIn = () => {
    focusInside = true;
    stop();
  };
  const handleFocusOut = (event: FocusEvent) => {
    if (container.contains(event.relatedTarget as Node | null)) return;
    focusInside = false;
    start();
  };

  container.addEventListener("mouseenter", handleMouseEnter);
  container.addEventListener("mouseleave", handleMouseLeave);
  container.addEventListener("focusin", handleFocusIn);
  container.addEventListener("focusout", handleFocusOut);
  mode.interactionCleanup = () => {
    stop();
    container.removeEventListener("mouseenter", handleMouseEnter);
    container.removeEventListener("mouseleave", handleMouseLeave);
    container.removeEventListener("focusin", handleFocusIn);
    container.removeEventListener("focusout", handleFocusOut);
  };
  start();
}

function createReviewsGridBootstrap(
  data: ReviewsGridData,
): Record<string, unknown> {
  const page = {
    current_page: data.page.currentPage,
    per_page: data.page.perPage,
    reviews: data.page.reviews,
    total_count: data.page.totalCount,
    total_pages: data.page.totalPages,
  };
  const selectionData: Record<string, unknown> = {};

  switch (data.config.reviewSelection) {
    case "all":
      selectionData.all_reviews = page;
      break;
    case "featured_reviews":
      selectionData.featured_reviews = page;
      break;
    case "product_reviews":
      selectionData.product_reviews = page;
      break;
    case "store_reviews":
      selectionData.store_reviews = page;
      break;
  }

  return {
    ...selectionData,
    average_rating: data.aggregate.rating,
    metafield_updated_at: null,
    number_of_reviews: data.aggregate.count,
  };
}

function createAiReviewsSummaryBootstrap(
  data: AiReviewsSummaryData,
): Record<string, unknown> {
  return {
    average_rating: data.payload.averageRating,
    number_of_reviews: data.payload.reviewCount,
    ai_summary_text: data.payload.summaryText,
    ai_summary_translations: data.payload.summaryTranslations,
    keywords: data.payload.keywords.map((keyword) => ({ ...keyword })),
  };
}

function registerReviewWidgetV3PreviewResponse(
  container: HTMLElement,
  data: ReviewWidgetV3Data,
): void {
  if (reviewWidgetV3PreviewKeys.has(container)) return;

  const key = createReviewWidgetV3PreviewKey(
    data.shopDomain,
    data.product.id,
  );
  const existing = reviewWidgetV3PreviewResponses.get(key);
  reviewWidgetV3PreviewResponses.set(key, {
    payload: JSON.stringify(data.page.payload),
    references: (existing?.references ?? 0) + 1,
  });
  reviewWidgetV3PreviewKeys.set(container, key);
  installReviewWidgetV3FetchBridge();
}

function releaseReviewWidgetV3PreviewResponse(container: HTMLElement): void {
  const key = reviewWidgetV3PreviewKeys.get(container);
  if (!key) return;

  const response = reviewWidgetV3PreviewResponses.get(key);
  if (response) {
    if (response.references <= 1) reviewWidgetV3PreviewResponses.delete(key);
    else response.references -= 1;
  }
  reviewWidgetV3PreviewKeys.delete(container);
}

function installReviewWidgetV3FetchBridge(): void {
  if (reviewWidgetV3FetchBridgeInstalled) return;

  const originalFetch = window.fetch.bind(window);
  const bridgedFetch: typeof window.fetch = async (input, init) => {
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");

    if (method.toUpperCase() === "GET") {
      const requestUrl =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : String(input);

      try {
        const url = new URL(requestUrl, window.location.href);
        if (
          url.origin === JUDGE_ME_CDN_API_HOST.slice(0, -1) &&
          url.pathname === "/reviews/reviews_for_widget"
        ) {
          const key = createReviewWidgetV3PreviewKey(
            url.searchParams.get("shop_domain") ?? "",
            url.searchParams.get("product_id") ?? "",
          );
          const response = reviewWidgetV3PreviewResponses.get(key);
          if (response) {
            return new Response(response.payload, {
              status: 200,
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json; charset=utf-8",
                "X-JudgeMe-React-Preview": "true",
              },
            });
          }
        }
      } catch {
        // Non-URL inputs are delegated to the browser's original fetch.
      }
    }

    return originalFetch(input, init);
  };

  window.fetch = bridgedFetch;
  reviewWidgetV3FetchBridgeInstalled = true;
}

function createReviewWidgetV3PreviewKey(
  shopDomain: string,
  productId: string,
): string {
  return `${shopDomain.trim().toLowerCase()}:${productId.trim()}`;
}

function registerReviewSnippetsResponse(data: ReviewSnippetsData): void {
  const requestKey = canonicalizeReviewSnippetsRequest(data.page.requestUrl);
  const existing = reviewSnippetsResponses.get(requestKey);
  const payload = JSON.stringify({
    reviews: data.page.reviews,
    settings: data.page.settings,
  });
  reviewSnippetsResponses.set(requestKey, {
    payload,
    references: (existing?.references ?? 0) + 1,
  });

  if (reviewSnippetsFetchBridgeInstalled) return;

  const originalFetch = window.fetch.bind(window);
  const bridgedFetch: typeof window.fetch = async (input, init) => {
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");

    if (method.toUpperCase() === "GET") {
      const requestUrl =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : String(input);

      try {
        const response = reviewSnippetsResponses.get(
          canonicalizeReviewSnippetsRequest(requestUrl),
        );
        if (response) {
          return new Response(response.payload, {
            status: 200,
            headers: {
              "Cache-Control": "max-age=1200, public",
              "Content-Type": "application/json; charset=utf-8",
              "X-JudgeMe-React-Preloaded": "true",
            },
          });
        }
      } catch {
        // Non-URL inputs are delegated to the browser's original fetch.
      }
    }

    return originalFetch(input, init);
  };

  window.fetch = bridgedFetch;
  reviewSnippetsFetchBridgeInstalled = true;
}

function canonicalizeReviewSnippetsRequest(value: string): string {
  const url = new URL(value, window.location.href);
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

async function loadManifestStyles(
  assetBaseUrl: string,
  entryKey: string,
): Promise<void> {
  const manifest = await getManifest(assetBaseUrl);
  const cssFiles = collectManifestCss(manifest, entryKey);
  await Promise.all(
    cssFiles.map((file) =>
      loadStylesheet(new URL(file, assetBaseUrl).toString()),
    ),
  );
}

function getManifest(assetBaseUrl: string): Promise<ViteManifest> {
  const existing = manifestPromises.get(assetBaseUrl);
  if (existing) return existing;

  const promise = fetch(new URL("manifest.json", assetBaseUrl), {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Judge.me v3 manifest request failed with HTTP ${response.status}.`,
        );
      }

      const manifest = (await response.json()) as unknown;
      if (!isManifest(manifest)) {
        throw new Error("Judge.me returned an invalid v3 asset manifest.");
      }

      return manifest;
    })
    .catch((error) => {
      manifestPromises.delete(assetBaseUrl);
      throw error;
    });
  manifestPromises.set(assetBaseUrl, promise);
  return promise;
}

function collectManifestCss(
  manifest: ViteManifest,
  entryKey: string,
): string[] {
  const visited = new Set<string>();
  const css = new Set<string>();

  const visit = (key: string) => {
    if (visited.has(key)) return;
    visited.add(key);

    const entry = manifest[key];
    if (!entry) return;

    for (const file of getStringArray(entry.css)) css.add(file);
    for (const dependency of [
      ...getStringArray(entry.imports),
      ...getStringArray(entry.dynamicImports),
    ]) {
      visit(dependency);
    }
  };

  visit(entryKey);

  if (visited.size === 1 && !manifest[entryKey]) {
    throw new Error(`Judge.me v3 manifest is missing ${entryKey}.`);
  }

  return [...css];
}

function getManifestFile(manifest: ViteManifest, entryKey: string): string {
  const file = manifest[entryKey]?.file;

  if (typeof file !== "string" || !file) {
    throw new Error(`Judge.me v3 manifest is missing ${entryKey}.`);
  }

  return file;
}

function loadStylesheet(url: string): Promise<void> {
  const existing = stylesheetPromises.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const existingLink = Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        "link[data-judgeme-react-exact-style]",
      ),
    ).find((link) => link.href === url);

    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.dataset.judgemeReactExactStyle = "true";
    link.rel = "stylesheet";
    link.href = url;
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => reject(new Error(`Judge.me v3 stylesheet failed to load: ${url}`)),
      { once: true },
    );
    document.head.appendChild(link);
  }).catch((error) => {
    stylesheetPromises.delete(url);
    throw error;
  });
  stylesheetPromises.set(url, promise);
  return promise;
}

function loadScript(url: string, label: string): Promise<void> {
  const existing = scriptPromises.get(url);
  if (existing) return existing;

  const promise = loadUncachedScript(url, label).catch((error) => {
    scriptPromises.delete(url);
    throw error;
  });
  scriptPromises.set(url, promise);
  return promise;
}

function loadUncachedScript(url: string, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.judgemeReactExactScript = label;
    script.src = url;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Judge.me's ${label} script failed to load.`));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function loadModuleOnce(url: string, label: string): Promise<void> {
  const existing = modulePromises.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.judgemeReactExactModule = label;
    script.type = "module";
    script.src = url;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Judge.me's ${label} module failed to load.`));
      },
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error) => {
    modulePromises.delete(url);
    throw error;
  });
  modulePromises.set(url, promise);
  return promise;
}

function loadModule(url: string, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.judgemeReactExactModule = label;
    script.type = "module";
    script.src = url;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Judge.me's ${label} module failed to load.`));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });
}

async function importExactModule(
  url: string,
  label: string,
): Promise<Record<string, unknown>> {
  try {
    return (await import(/* @vite-ignore */ url)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Judge.me's ${label} module failed to load.`, {
      cause: error,
    });
  }
}

function waitForReviewSnippets(container: HTMLElement): Promise<void> {
  if (isReviewSnippetsReady(container)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      settled = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve();
    };
    const observer = new MutationObserver(() => {
      if (isReviewSnippetsReady(container)) settle();
    });
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    const timeoutId = window.setTimeout(() => {
      if (isReviewSnippetsReady(container)) {
        settle();
      } else {
        settle(
          new Error("Judge.me did not finish initializing Review Snippets."),
        );
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function waitForAiReviewsSummary(container: HTMLElement): Promise<void> {
  if (isAiReviewsSummaryReady(container)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      settled = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve();
    };
    const observer = new MutationObserver(() => {
      if (isAiReviewsSummaryReady(container)) settle();
    });
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    const timeoutId = window.setTimeout(() => {
      if (isAiReviewsSummaryReady(container)) {
        settle();
      } else {
        settle(
          new Error("Judge.me did not finish initializing AI Reviews Summary."),
        );
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function waitForReviewsGrid(container: HTMLElement): Promise<void> {
  if (isReviewsGridReady(container)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      settled = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve();
    };
    const observer = new MutationObserver(() => {
      if (isReviewsGridReady(container)) {
        settle();
      }
    });
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    const timeoutId = window.setTimeout(() => {
      if (isReviewsGridReady(container)) {
        settle();
      } else {
        settle(new Error("Judge.me did not finish initializing Reviews Grid."));
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function waitForTrustBadge(
  container: HTMLElement,
): Promise<TrustBadgeWidgetManager> {
  const readyManager = getTrustBadgeManager(container);
  if (readyManager) return Promise.resolve(readyManager);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      const manager = getTrustBadgeManager(container);
      if (!error && !manager) return;

      settled = true;
      observer.disconnect();
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve(manager as TrustBadgeWidgetManager);
    };
    const check = () => {
      if (getTrustBadgeManager(container)) settle();
    };
    const observer = new MutationObserver(check);
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    const intervalId = window.setInterval(check, 50);
    const timeoutId = window.setTimeout(() => {
      if (getTrustBadgeManager(container)) {
        settle();
      } else {
        settle(new Error("Judge.me did not finish initializing Trust Badge."));
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function waitForCardsCarousel(
  container: CarouselElement,
  reviewCount: number,
): Promise<void> {
  if (isCardsCarouselReady(container, reviewCount)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      settled = true;
      observer.disconnect();
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (isCardsCarouselReady(container, reviewCount)) settle();
    };
    const observer = new MutationObserver(check);
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    const intervalId = window.setInterval(check, 50);
    const timeoutId = window.setTimeout(() => {
      if (isCardsCarouselReady(container, reviewCount)) {
        settle();
      } else {
        settle(
          new Error("Judge.me did not finish initializing Cards Carousel."),
        );
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function waitForVideosCarousel(
  container: CarouselElement,
  reviewCount: number,
): Promise<void> {
  if (isVideosCarouselReady(container, reviewCount)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      settled = true;
      observer.disconnect();
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (isVideosCarouselReady(container, reviewCount)) settle();
    };
    const observer = new MutationObserver(check);
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    const intervalId = window.setInterval(check, 50);
    const timeoutId = window.setTimeout(() => {
      if (isVideosCarouselReady(container, reviewCount)) {
        settle();
      } else {
        settle(
          new Error("Judge.me did not finish initializing Videos Carousel."),
        );
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function waitForTestimonialsCarousel(
  container: HTMLElement,
  reviewCount: number,
): Promise<void> {
  if (isTestimonialsCarouselReady(container, reviewCount)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;

      settled = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);

      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (isTestimonialsCarouselReady(container, reviewCount)) settle();
    };
    const observer = new MutationObserver(check);
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    const timeoutId = window.setTimeout(() => {
      if (isTestimonialsCarouselReady(container, reviewCount)) {
        settle();
      } else {
        settle(
          new Error(
            "Judge.me did not finish initializing Testimonials Carousel.",
          ),
        );
      }
    }, EXACT_RUNTIME_TIMEOUT_MS);
  });
}

function isAiReviewsSummaryReady(container: HTMLElement): boolean {
  return (
    container.classList.contains("jdgm-widget-revamp") &&
    container.querySelector(".jm-store-summary") !== null
  );
}

function isReviewSnippetsReady(container: HTMLElement): boolean {
  return (
    container.querySelector(".jdgm-rev-snippet-widget-v2__inner") !== null &&
    container.querySelector(".jdgm-rev-snippet-card") !== null
  );
}

function isReviewsGridReady(container: HTMLElement): boolean {
  return (
    container.classList.contains("jdgm-widget-revamp") &&
    container.childElementCount > 0
  );
}

function isHappyCustomersReady(container: HTMLElement): boolean {
  return (
    container.classList.contains("jdgm-widget-revamp") &&
    container.childElementCount > 0
  );
}

function isReviewWidgetV3Ready(container: HTMLElement): boolean {
  return (
    container.classList.contains("jdgm-widget-revamp") &&
    container.querySelector(".jm-review-widget") !== null
  );
}

function getTrustBadgeManager(
  container: HTMLElement,
): TrustBadgeWidgetManager | undefined {
  if (
    container.dataset.mounted !== "true" ||
    container.querySelector(".jdgm-trust-badge") === null
  ) {
    return undefined;
  }

  return (
    window as ExactJudgeMeWindow
  ).__trustBadgeInitializer?.widgetManagers?.get(container);
}

function isCardsCarouselReady(
  container: CarouselElement,
  reviewCount: number,
): boolean {
  return (
    container._videoCarouselInitialized === true &&
    (reviewCount === 0 ||
      (container.querySelector(".jdgm-card") !== null &&
        container._initialPositioningComplete === true))
  );
}

function isVideosCarouselReady(
  container: CarouselElement,
  reviewCount: number,
): boolean {
  return (
    container._videoCarouselInitialized === true &&
    container._videoCarouselInstance !== undefined &&
    (reviewCount === 0 ||
      container.querySelector(".jdgm-media-card.active") !== null)
  );
}

function isTestimonialsCarouselReady(
  container: HTMLElement,
  reviewCount: number,
): boolean {
  if (reviewCount === 0) return true;

  return (
    !container.classList.contains("jdgm-hidden") &&
    container.querySelectorAll(".jdgm-testimonial").length === reviewCount &&
    container.querySelector(".jdgm-testimonial.active") !== null
  );
}

function isManifest(value: unknown): value is ViteManifest {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
