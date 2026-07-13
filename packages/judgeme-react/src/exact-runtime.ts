import type { JudgeMeRuntimeSettings } from "./legacy-api.js";
import type {
  CardsCarouselConfig,
  CardsCarouselData,
} from "./cards-carousel-api.js";
import type { ReviewsGridData } from "./reviews-grid-api.js";

const JUDGE_ME_API_HOST = "https://api.judge.me";
const JUDGE_ME_CDN_API_HOST = "https://cdn.judge.me/";
const REVIEWS_GRID_ENTRY_KEY = "reviews-grid-widget/main.js";
const REVIEWS_GRID_ENTRY_FILE = "reviews_grid.js";
const CAROUSEL_LIGHTBOX_ENTRY_KEY = "carousel-lightbox/main.js";
const CAROUSEL_STYLES_FILE = "carousels.css";
const CAROUSEL_RUNTIME_FILE = "carousels.js";
const CAROUSEL_CARDS_FILE = "media_carousel.js";
const CAROUSEL_NAVIGATION_FILE = "video_carousel.js";
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

interface CardsCarouselMode {
  carousel_style: string;
  index: number;
  resizeObserver?: ResizeObserver;
  revCount: number;
  reviews: CardsCarouselData["page"]["reviews"];
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

interface CardsCarouselUtils {
  attachCarouselLightbox: (
    root: HTMLElement,
    mode: CardsCarouselMode,
    config: CardsCarouselRuntimeConfig,
  ) => void;
  buildCards: (
    root: HTMLElement,
    config: CardsCarouselRuntimeConfig,
    builder: CardsCarouselBuilder,
  ) => void;
  setAverage: (root: HTMLElement, rating: number) => void;
  setStarsColor: (
    root: HTMLElement,
    config: CardsCarouselRuntimeConfig,
  ) => void;
  setVerified: (root: HTMLElement) => void;
  showCard: (root: HTMLElement, mode: CardsCarouselMode) => void;
  updateHeaderText: (
    root: HTMLElement,
    config: CardsCarouselRuntimeConfig,
  ) => void;
}

type CardsCarouselBuilder = (
  root: HTMLElement,
  config: CardsCarouselRuntimeConfig,
  mode: CardsCarouselMode,
) => void;

interface CardsCarouselElement extends HTMLElement {
  _initialPositioningComplete?: boolean;
  _videoCarouselInitialized?: boolean;
  _videoCarouselInstance?: { destroy?: () => void };
}

interface ExactJudgeMeWindow extends Window {
  jdgm?: ExactJudgeMeRuntime;
  judgeme?: ExactJudgeMeRuntime;
  jdgmSettings?: JudgeMeRuntimeSettings;
  jdgmBuildMediaCards?: CardsCarouselBuilder;
  jdgmCarouselMode?: Record<string, CardsCarouselMode>;
  jdgmCarouselUtils?: CardsCarouselUtils;
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
}

export interface InitializeReviewsGridOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: ReviewsGridData;
  publicToken?: string;
}

export interface InitializeCardsCarouselOptions {
  assetBaseUrl: string;
  blockId: string;
  container: HTMLElement;
  data: CardsCarouselData;
  publicToken?: string;
}

let exactRuntimeShopDomain: string | undefined;
let exactRuntimeAssetBaseUrl: string | undefined;
let moduleInstance = 0;
const manifestPromises = new Map<string, Promise<ViteManifest>>();
const stylesheetPromises = new Map<string, Promise<void>>();
const scriptPromises = new Map<string, Promise<void>>();
const modulePromises = new Map<string, Promise<void>>();
const reviewsGridInitializers = new WeakMap<HTMLElement, Promise<void>>();
const cardsCarouselInitializers = new WeakMap<HTMLElement, Promise<void>>();
const cardsCarouselDisposals = new WeakMap<HTMLElement, number>();

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

/** Releases root-local observers and timers after an SPA unmount. */
export function disposeCardsCarousel(
  container: HTMLElement,
  blockId: string,
): void {
  if (typeof window === "undefined") return;

  const runtimeWindow = window as ExactJudgeMeWindow;
  const carousel = container as CardsCarouselElement;
  const initializer = cardsCarouselInitializers.get(container);
  const timeoutId = window.setTimeout(() => {
    cardsCarouselDisposals.delete(container);
    const cleanup = () => {
      const mode = runtimeWindow.jdgmCarouselMode?.[blockId];
      if (mode?.root !== container) return;

      mode.resizeObserver?.disconnect();
      if (mode.slideInterval) window.clearInterval(mode.slideInterval);
      carousel._videoCarouselInstance?.destroy?.();
      delete runtimeWindow.jdgmCarouselMode?.[blockId];
      cardsCarouselInitializers.delete(container);
    };

    if (initializer) void initializer.then(cleanup, cleanup);
    else cleanup();
  }, 0);

  cardsCarouselDisposals.set(container, timeoutId);
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
  );
  await waitForReviewsGrid(container);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Reviews Grid exact adapter ready",
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
  const mode: CardsCarouselMode = {
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
  await waitForCardsCarousel(container as CardsCarouselElement, mode.revCount);

  container.removeAttribute("data-entry-point");
  runtimeWindow.jdgm?.debugLog?.(
    "[judgeme-react] Cards Carousel exact adapter ready",
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

function loadModule(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.judgemeReactExactModule = "reviews-grid";
    script.type = "module";
    script.src = url;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error("Judge.me's v3 Reviews Grid module failed to load."));
      },
      { once: true },
    );
    document.head.appendChild(script);
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

function waitForCardsCarousel(
  container: CardsCarouselElement,
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

function isReviewsGridReady(container: HTMLElement): boolean {
  return (
    container.classList.contains("jdgm-widget-revamp") &&
    container.childElementCount > 0
  );
}

function isCardsCarouselReady(
  container: CardsCarouselElement,
  reviewCount: number,
): boolean {
  return (
    container._videoCarouselInitialized === true &&
    (reviewCount === 0 ||
      (container.querySelector(".jdgm-card") !== null &&
        container._initialPositioningComplete === true))
  );
}

function isManifest(value: unknown): value is ViteManifest {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
