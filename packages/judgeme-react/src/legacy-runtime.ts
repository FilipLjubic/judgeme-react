import type {
  AllReviewsWidgetReviewType,
  FloatingReviewsTabSource,
  JudgeMeRuntimeSettings,
} from "./legacy-api.js";

const JUDGE_ME_CDN_HOST = "https://cdnwidget.judge.me/";
const JUDGE_ME_API_HOST = "https://api.judge.me";
const JUDGE_ME_LOADER_URL = `${JUDGE_ME_CDN_HOST}loader.js`;
const JUDGE_ME_PUBLIC_IMAGE_HOST =
  "https://judgeme-public-images.imgix.net/judgeme/";
const RUNTIME_SCRIPT_SELECTOR = "script[data-judgeme-react-runtime]";
const SETUP_CLASS = "jdgm--done-setup";
const SETUP_WIDGET_CLASS = "jdgm--done-setup-widget";
const RUNTIME_TIMEOUT_MS = 15_000;

interface JudgeMeRuntime {
  API_HOST?: string;
  AllReviewsPage?: new (...args: unknown[]) => unknown;
  CDN_HOST?: string;
  JM_PUBLIC_IMAGE_URL?: string;
  PLATFORM?: string;
  PUBLIC_TOKEN?: string;
  SHOP_DOMAIN?: string;
  WIDGET_REBRANDING_ENABLED?: boolean;
  $?: ((value: unknown) => JudgeMeRuntimeCollection) & {
    magnificPopup?: {
      close?: () => void;
      open?: (...args: unknown[]) => void;
    };
  };
  _transformJsonData?: (
    root: JudgeMeRuntimeCollection,
    page?: unknown,
  ) => void;
  _customizeReviewWidget?: (root: unknown) => void;
  _renderAndSetupReviewForm?: (root: unknown) => void;
  _setupFormsSubmit?: (root: unknown) => void;
  _setupLoadReviewsEventsFor?: (root: unknown) => void;
  _setupQuestionsForm?: (root: unknown) => void;
  _renderVerifiedByJudgeme?: (
    root: unknown,
    monochrome: boolean,
    compact: boolean,
    rebranded: boolean,
    widgetRebrandingEnabled?: boolean,
  ) => void;
  _renderVerifiedJudgeme?: (
    root: unknown,
    color: string | undefined,
    compact: boolean,
    monochrome: boolean,
  ) => void;
  buildStarsFor?: (root: unknown) => void;
  caches?: {
    $revWidgets?: unknown;
  };
  customizeBadges?: () => void;
  customizeReviews?: () => void;
  initializeWidgets?: (root?: unknown) => void;
  initializeCarousel?: () => void;
  loadCSS?: (url: string) => unknown;
  _loadSvg?: (
    root: unknown,
    imageHost: string,
    svgHost: string,
    monochrome?: boolean,
    lazy?: boolean,
  ) => unknown;
  loadScript?: (url: string) => unknown;
  setupMediaGallery?: (root: unknown) => void;
  templates?: {
    ugcMediaGridPopup?: (...args: unknown[]) => string;
  };
  widgetPath?: (asset: string) => string;
}

interface JudgeMeRuntimeCollection {
  data?: (name: string) => unknown;
}

interface JudgeMeWindow extends Window {
  jdgm?: JudgeMeRuntime;
  jdgmSettings?: JudgeMeRuntimeSettings;
}

let runtimeShopDomain: string | undefined;
let loaderPromise: Promise<void> | undefined;
let ugcMediaGridSequence = 0;
const floatingTabDisposers = new WeakMap<HTMLElement, () => void>();
const allReviewsWidgetDisposers = new WeakMap<HTMLElement, () => void>();
const medalsTimers = new WeakMap<HTMLElement, number>();

export interface InitializeLegacyReviewWidgetOptions {
  container: HTMLElement;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeStarRatingBadgeOptions {
  container: HTMLElement;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeReviewsCarouselOptions {
  container: HTMLElement;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeAllReviewsCounterOptions {
  container: HTMLElement;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeVerifiedReviewsCounterOptions {
  container: HTMLElement;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeJudgeMeMedalsOptions {
  container: HTMLElement;
  /** Prevents a stale React effect from mutating a remounted widget. */
  isCurrent?: () => boolean;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeUgcMediaGridOptions {
  container: HTMLElement;
  /** Prevents a stale React effect from mutating a remounted grid. */
  isCurrent?: () => boolean;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

export interface InitializeFloatingReviewsTabOptions {
  container: HTMLElement;
  /** Prevents a stale React effect from binding after its cleanup ran. */
  isCurrent?: () => boolean;
  position: "bottom" | "left" | "right";
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  source: FloatingReviewsTabSource;
}

export interface InitializeAllReviewsWidgetOptions {
  container: HTMLElement;
  initialReviewType: AllReviewsWidgetReviewType;
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

/** Loads Judge.me's public runtime once, then initializes one SSR widget root. */
export async function initializeLegacyReviewWidget({
  container,
  publicToken,
  settings,
  shopDomain,
}: InitializeLegacyReviewWidgetOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  await initializeContainer(runtimeWindow, container);
  await waitForWidgetSetup(container);
}

/** Loads Judge.me's public runtime once, then initializes one product badge. */
export async function initializeStarRatingBadge({
  container,
  publicToken,
  settings,
  shopDomain,
}: InitializeStarRatingBadgeOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  await waitFor(
    () => isBadgeRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's Star Rating Badge initializer did not become ready.",
  );

  runtimeWindow.jdgm?.customizeBadges?.();
  await waitForBadgeSetup(container);
}

/** Loads Judge.me's secondary-widget bundle and initializes one carousel. */
export async function initializeReviewsCarousel({
  container,
  publicToken,
  settings,
  shopDomain,
}: InitializeReviewsCarouselOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  await waitFor(
    () =>
      isCarouselSetup(container) ||
      typeof runtimeWindow.jdgm?.initializeCarousel === "function",
    "Judge.me's Reviews Carousel initializer did not become ready.",
  );

  if (!isCarouselSetup(container)) {
    // widget/others.js schedules its own first-document initialization as soon
    // as it exposes initializeCarousel. Let that callback win before invoking
    // the global initializer for a carousel inserted by client navigation.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  if (!isCarouselSetup(container)) {
    runtimeWindow.jdgm?.initializeCarousel?.();
  }

  await waitForCarouselSetup(container);
}

/** Loads Judge.me's secondary bundle and initializes one store-wide counter. */
export async function initializeAllReviewsCounter({
  container,
  publicToken,
  settings,
  shopDomain,
}: InitializeAllReviewsCounterOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  if (!isAllReviewsCounterRuntimeReady(runtimeWindow.jdgm)) {
    await waitFor(
      () => isSecondaryWidgetLoaderReady(runtimeWindow.jdgm),
      "Judge.me's secondary-widget loader did not become ready.",
    );
    runtimeWindow.jdgm?.loadScript?.(`${JUDGE_ME_CDN_HOST}widget/others.js`);
  }
  await waitFor(
    () => isAllReviewsCounterRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's All Reviews Counter initializer did not become ready.",
  );

  // Give the bundle's first-document callback a chance to apply its own
  // dashboard transformations before repairing an SPA-mounted root.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

  const root = container.querySelector<HTMLElement>(".jdgm-all-reviews-text");
  const runtime = runtimeWindow.jdgm;

  if (!root || !runtime || !isAllReviewsCounterRuntimeReady(runtime)) {
    throw new Error("Judge.me did not return an All Reviews Counter root.");
  }

  prepareAllReviewsCounterMarkup(root, settings, runtime);
  root.dataset.judgemeReactSetup = "true";
}

/** Loads Judge.me's secondary bundle and initializes one verified counter. */
export async function initializeVerifiedReviewsCounter({
  container,
  publicToken,
  settings,
  shopDomain,
}: InitializeVerifiedReviewsCounterOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  if (!isVerifiedReviewsCounterRuntimeReady(runtimeWindow.jdgm)) {
    await waitFor(
      () => isSecondaryWidgetLoaderReady(runtimeWindow.jdgm),
      "Judge.me's secondary-widget loader did not become ready.",
    );
    runtimeWindow.jdgm?.loadScript?.(`${JUDGE_ME_CDN_HOST}widget/others.js`);
  }
  await waitFor(
    () => isVerifiedReviewsCounterRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's Verified Reviews Counter initializer did not become ready.",
  );

  // Let the bundle's initial document-ready scan win. If this root arrived via
  // SPA navigation, reproduce that scan for the newly mounted counter only.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

  const root = container.querySelector<HTMLElement>(".jdgm-verified-badge");
  const runtime = runtimeWindow.jdgm;

  if (!root || !runtime || !isVerifiedReviewsCounterRuntimeReady(runtime)) {
    throw new Error("Judge.me did not return a Verified Reviews Counter root.");
  }

  if (!isVerifiedReviewsCounterStyled(root)) {
    prepareVerifiedReviewsCounterMarkup(root, settings, runtime);
  }

  await waitFor(
    () => isVerifiedReviewsCounterPrepared(root),
    "Judge.me did not finish initializing the Verified Reviews Counter.",
  );
  root.dataset.judgemeReactSetup = "true";
}

/** Loads Judge.me's public medal helpers and initializes one exact widget. */
export async function initializeJudgeMeMedals({
  container,
  isCurrent,
  publicToken,
  settings,
  shopDomain,
}: InitializeJudgeMeMedalsOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  await waitFor(
    () => isSecondaryWidgetLoaderReady(runtimeWindow.jdgm),
    "Judge.me's Medals dependency loader did not become ready.",
  );

  // The component temporarily masks the three classes scanned by loader.js.
  // This lets the public bundles expose their helpers without starting the
  // untracked global autoplay interval used by their document-wide scan.
  const dependencyRuntime = runtimeWindow.jdgm;
  dependencyRuntime?.loadScript?.(`${JUDGE_ME_CDN_HOST}widget/others.js`);
  dependencyRuntime?.loadScript?.(`${JUDGE_ME_CDN_HOST}widget/media.js`);
  if (dependencyRuntime?.widgetPath) {
    dependencyRuntime.loadCSS?.(dependencyRuntime.widgetPath("media.css"));
  }

  await waitFor(
    () => isJudgeMeMedalsRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's Medals helpers did not become ready.",
  );

  if (isCurrent && !isCurrent()) return;

  restorePendingMedalsClasses(container);
  const root = container.querySelector<HTMLElement>(".jdgm-medals-wrapper");
  const runtime = runtimeWindow.jdgm;

  if (!root || !runtime || !isJudgeMeMedalsRuntimeReady(runtime)) {
    throw new Error("Judge.me did not return a Medals root.");
  }

  prepareJudgeMeMedalsMarkup(container, root, settings, runtime);
  await waitFor(
    () => isJudgeMeMedalsPrepared(root),
    "Judge.me did not finish initializing Medals.",
  );

  if (isCurrent && !isCurrent()) {
    disposeJudgeMeMedals(container);
    return;
  }

  root.classList.remove("jdgm-hidden");
  root.dataset.judgemeReactSetup = "true";
}

/** Stops the component-scoped mobile medal rotation timer. */
export function disposeJudgeMeMedals(container: HTMLElement): void {
  const timer = medalsTimers.get(container);
  if (timer !== undefined && typeof window !== "undefined") {
    window.clearInterval(timer);
  }
  medalsTimers.delete(container);
}

/** Loads Judge.me's public UGC transformers and gallery for one SPA root. */
export async function initializeUgcMediaGrid({
  container,
  isCurrent,
  publicToken,
  settings,
  shopDomain,
}: InitializeUgcMediaGridOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  await waitFor(
    () => isSecondaryWidgetLoaderReady(runtimeWindow.jdgm),
    "Judge.me's UGC Media Grid dependency loader did not become ready.",
  );

  // The component masks both selector classes while these document-scanning
  // bundles load. We then apply their public transformer to this root only.
  const dependencyRuntime = runtimeWindow.jdgm;
  dependencyRuntime?.loadScript?.(`${JUDGE_ME_CDN_HOST}widget/others.js`);
  dependencyRuntime?.loadScript?.(`${JUDGE_ME_CDN_HOST}widget/media.js`);
  if (dependencyRuntime?.widgetPath) {
    dependencyRuntime.loadCSS?.(dependencyRuntime.widgetPath("media.css"));
  }

  await waitFor(
    () => isUgcMediaGridRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's UGC Media Grid helpers did not become ready.",
  );

  if (isCurrent && !isCurrent()) return;

  restorePendingUgcMediaGridClasses(container);
  const root = container.querySelector<HTMLElement>(
    ".jdgm-ugc-media-wrapper",
  );
  const grid = root?.querySelector<HTMLElement>(".jdgm-ugc-media");
  const runtime = runtimeWindow.jdgm;

  if (!root || !grid || !runtime || !isUgcMediaGridRuntimeReady(runtime)) {
    throw new Error("Judge.me did not return a UGC Media Grid root.");
  }

  grid.dataset.loaded = "true";
  grid.dataset.id ||= `ugc-media-react-${++ugcMediaGridSequence}`;
  if (grid.querySelector(".jdgm-ugc-media-data")) {
    runtime._transformJsonData(runtime.$(grid));
  }

  root.style.removeProperty("display");
  grid.style.removeProperty("display");
  root.classList.remove("jdgm-hidden");

  await waitFor(
    () => isUgcMediaGridPrepared(root),
    "Judge.me did not finish initializing UGC Media Grid.",
  );

  if (isCurrent && !isCurrent()) {
    disposeUgcMediaGrid(container);
    return;
  }

  root.dataset.judgemeReactSetup = "true";
}

/** Closes a grid-owned lightbox before React removes its source elements. */
export function disposeUgcMediaGrid(_container: HTMLElement): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const runtime = (window as JudgeMeWindow).jdgm;
  if (document.querySelector(".jdgm-gallery-popup__ugc-media")) {
    runtime?.$?.magnificPopup?.close?.();
  }
  document.body.classList.remove("jm-mfp-is-open");
}

/** Stops Judge.me's per-carousel auto-slide timer before React removes it. */
export function disposeReviewsCarousel(container: HTMLElement): void {
  if (typeof window === "undefined") return;

  const carousel = container.querySelector(".jdgm-carousel");
  const runtime = (window as JudgeMeWindow).jdgm;

  if (!carousel || typeof runtime?.$ !== "function") return;

  const timer = runtime.$(carousel).data?.("auto-slider");

  if (typeof timer === "number") {
    window.clearInterval(timer);
  }
}

/** Loads Judge.me's review helpers and binds one SPA-safe All Reviews Widget. */
export async function initializeAllReviewsWidget({
  container,
  initialReviewType,
  publicToken,
  settings,
  shopDomain,
}: InitializeAllReviewsWidgetOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  // The public arp.js bundle otherwise attaches its own cache-server paging
  // callbacks. Keep its DOM customization, but route paging through the Free-
  // plan Widget API so SPA and initial-document behavior use one contract.
  runtimeWindow.jdgmSettings = {
    ...runtimeWindow.jdgmSettings,
    all_reviews_page_load_reviews_on: "button_click",
  };

  await loadRuntimeScript();
  await waitFor(
    () =>
      isReviewStreamRuntimeReady(runtimeWindow.jdgm) &&
      typeof runtimeWindow.jdgm.AllReviewsPage === "function",
    "Judge.me's All Reviews Widget initializer did not become ready.",
  );
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

  const root = container.querySelector<HTMLElement>(".jdgm-all-reviews-widget");
  const runtime = runtimeWindow.jdgm;

  if (!root || !runtime || !isReviewStreamRuntimeReady(runtime)) {
    throw new Error("Judge.me did not return an All Reviews Widget root.");
  }

  prepareAllReviewsWidgetMarkup(root, initialReviewType, settings, runtime);
  bindAllReviewsWidgetLifecycle(root, runtime, {
    publicToken,
    shopDomain,
  });
  root.dataset.judgemeReactSetup = "true";
}

/** Removes React-owned All Reviews Widget listeners before unmounting. */
export function disposeAllReviewsWidget(container: HTMLElement): void {
  allReviewsWidgetDisposers.get(container)?.();
  allReviewsWidgetDisposers.delete(container);
}

/** Loads Judge.me's review helpers and binds one SPA-safe floating tab. */
export async function initializeFloatingReviewsTab({
  container,
  isCurrent,
  position,
  publicToken,
  settings,
  shopDomain,
  source,
}: InitializeFloatingReviewsTabOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureRuntime({
    publicToken,
    settings,
    shopDomain,
  });

  await loadRuntimeScript();
  await waitFor(
    () => isFloatingTabRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's Floating Reviews Tab initializer did not become ready.",
  );

  if (isCurrent && !isCurrent()) return;

  const root = container.querySelector<HTMLElement>(".jdgm-revs-tab");
  const runtime = runtimeWindow.jdgm;

  if (!root || !runtime || !isFloatingTabRuntimeReady(runtime)) {
    throw new Error("Judge.me did not return a Floating Reviews Tab root.");
  }

  prepareFloatingTabMarkup(root, position, settings, runtime);
  bindFloatingTabLifecycle(root, settings, runtime, {
    publicToken,
    shopDomain,
    source,
  });
  root.dataset.judgemeReactSetup = "true";
}

/** Removes React-owned listeners and releases the document scroll lock. */
export function disposeFloatingReviewsTab(container: HTMLElement): void {
  if (typeof document === "undefined") return;

  floatingTabDisposers.get(container)?.();
  floatingTabDisposers.delete(container);
  document.body.classList.remove("jdgm-lock-scroll");
}

function configureRuntime({
  publicToken,
  settings,
  shopDomain,
}: {
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}): JudgeMeWindow {
  const runtimeWindow = window as JudgeMeWindow;

  if (runtimeShopDomain && runtimeShopDomain !== shopDomain) {
    throw new Error(
      "Judge.me cannot initialize two Shopify stores in one browser document.",
    );
  }

  runtimeShopDomain = shopDomain;
  // Judge.me normalizes this object after loading. Preserve that enriched
  // version across SPA navigation and Vite HMR instead of replacing it with
  // the raw server payload on every component effect.
  runtimeWindow.jdgmSettings ??= settings;
  runtimeWindow.jdgm = {
    ...runtimeWindow.jdgm,
    API_HOST: JUDGE_ME_API_HOST,
    CDN_HOST: JUDGE_ME_CDN_HOST,
    PLATFORM: "shopify",
    PUBLIC_TOKEN: publicToken,
    SHOP_DOMAIN: shopDomain,
  };

  return runtimeWindow;
}

function loadRuntimeScript(): Promise<void> {
  const runtimeWindow = window as JudgeMeWindow;

  if (runtimeWindow.jdgm?.initializeWidgets) {
    return Promise.resolve();
  }

  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      RUNTIME_SCRIPT_SELECTOR,
    );
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => resolve();
    const handleError = () => {
      loaderPromise = undefined;
      reject(new Error("Judge.me's browser runtime failed to load."));
    };

    if (existingScript) {
      // A previous package instance or HMR cycle may have inserted the loader.
      // The next phase polls for its public initializer, so no load event is
      // required here.
      resolve();
      return;
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    script.async = true;
    script.dataset.judgemeReactRuntime = "legacy-review-widget";
    script.src = JUDGE_ME_LOADER_URL;
    document.head.appendChild(script);
  });

  return loaderPromise;
}

async function initializeContainer(
  runtimeWindow: JudgeMeWindow,
  container: HTMLElement,
): Promise<void> {
  if (isReviewWidgetSetup(container)) return;

  await waitFor(
    () =>
      isReviewWidgetSetup(container) ||
      isReviewDependencyLoaderReady(runtimeWindow.jdgm),
    "Judge.me's widget initializer did not become ready.",
  );

  // On the first document load, Judge.me's own ready callback normally wins
  // this race and initializes the SSR marker. Do not require lazy form/media
  // methods that the runtime may release again after completing that setup.
  if (isReviewWidgetSetup(container)) return;

  loadReviewRuntimeDependencies(runtimeWindow.jdgm);

  await waitFor(
    () =>
      isReviewWidgetSetup(container) ||
      isReviewRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's Review Widget dependencies did not become ready.",
  );

  if (isReviewWidgetSetup(container)) return;

  const runtime = runtimeWindow.jdgm;

  if (!runtime?.initializeWidgets || !runtime.$) return;

  runtime.initializeWidgets(runtime.$(container));
}

function isReviewDependencyLoaderReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is Required<
  Pick<JudgeMeRuntime, "$" | "initializeWidgets" | "loadScript" | "widgetPath">
> &
  JudgeMeRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime.initializeWidgets === "function" &&
    typeof runtime.loadScript === "function" &&
    typeof runtime.widgetPath === "function",
  );
}

function loadReviewRuntimeDependencies(runtime: JudgeMeRuntime | undefined) {
  if (!isReviewDependencyLoaderReady(runtime)) return;

  runtime.loadScript(`${JUDGE_ME_CDN_HOST}widget/form.js`);
  runtime.loadScript(`${JUDGE_ME_CDN_HOST}widget/media.js`);
  runtime.loadCSS?.(runtime.widgetPath("form.css"));
  runtime.loadCSS?.(runtime.widgetPath("media.css"));
}

function isReviewRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is Required<
  Pick<
    JudgeMeRuntime,
    | "$"
    | "_customizeReviewWidget"
    | "_renderAndSetupReviewForm"
    | "_setupFormsSubmit"
    | "_setupLoadReviewsEventsFor"
    | "_setupQuestionsForm"
    | "customizeReviews"
    | "initializeWidgets"
    | "setupMediaGallery"
  >
> &
  JudgeMeRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime._customizeReviewWidget === "function" &&
    typeof runtime._renderAndSetupReviewForm === "function" &&
    typeof runtime._setupFormsSubmit === "function" &&
    typeof runtime._setupLoadReviewsEventsFor === "function" &&
    typeof runtime._setupQuestionsForm === "function" &&
    typeof runtime.customizeReviews === "function" &&
    typeof runtime.initializeWidgets === "function" &&
    typeof runtime.setupMediaGallery === "function",
  );
}

function isBadgeRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is Required<
  Pick<JudgeMeRuntime, "$" | "caches" | "customizeBadges">
> &
  JudgeMeRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    runtime.caches?.$revWidgets &&
    typeof runtime.customizeBadges === "function",
  );
}

function isSecondaryWidgetLoaderReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is Required<Pick<JudgeMeRuntime, "$" | "loadScript">> &
  JudgeMeRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime.loadScript === "function",
  );
}

type AllReviewsCounterRuntime = Required<
  Pick<JudgeMeRuntime, "$" | "buildStarsFor">
> &
  JudgeMeRuntime;

function isAllReviewsCounterRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is AllReviewsCounterRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime.buildStarsFor === "function",
  );
}

type VerifiedReviewsCounterRuntime = Required<
  Pick<JudgeMeRuntime, "$" | "_loadSvg">
> &
  JudgeMeRuntime;

type JudgeMeMedalsRuntime = Required<
  Pick<
    JudgeMeRuntime,
    "$" | "_loadSvg" | "_renderVerifiedByJudgeme" | "buildStarsFor"
  >
> &
  JudgeMeRuntime;

type UgcMediaGridRuntime = Required<
  Pick<
    JudgeMeRuntime,
    "$" | "_transformJsonData" | "loadCSS" | "loadScript" | "templates"
  >
> &
  JudgeMeRuntime;

function isVerifiedReviewsCounterRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is VerifiedReviewsCounterRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime._loadSvg === "function",
  );
}

function isJudgeMeMedalsRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is JudgeMeMedalsRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime._loadSvg === "function" &&
    typeof runtime._renderVerifiedByJudgeme === "function" &&
    typeof runtime.buildStarsFor === "function",
  );
}

function isUgcMediaGridRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is UgcMediaGridRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime._transformJsonData === "function" &&
    typeof runtime.loadCSS === "function" &&
    typeof runtime.loadScript === "function" &&
    typeof runtime.templates?.ugcMediaGridPopup === "function" &&
    typeof runtime.$.magnificPopup?.open === "function",
  );
}

function restorePendingUgcMediaGridClasses(container: HTMLElement): void {
  container
    .querySelector<HTMLElement>(".jdgm-react-ugc-media-wrapper-pending")
    ?.classList.replace(
      "jdgm-react-ugc-media-wrapper-pending",
      "jdgm-ugc-media-wrapper",
    );
  container
    .querySelector<HTMLElement>(".jdgm-react-ugc-media-pending")
    ?.classList.replace(
      "jdgm-react-ugc-media-pending",
      "jdgm-ugc-media",
    );
}

function isUgcMediaGridPrepared(root: HTMLElement): boolean {
  const thumbnails = root.querySelectorAll(".jdgm-ugc-media__thumbnail");
  return thumbnails.length > 0 && !root.querySelector(".jdgm-ugc-media-data");
}

function restorePendingMedalsClasses(container: HTMLElement): void {
  const root = container.querySelector<HTMLElement>(
    ".jdgm-react-medals-wrapper-pending",
  );
  root?.classList.replace(
    "jdgm-react-medals-wrapper-pending",
    "jdgm-medals-wrapper",
  );

  container
    .querySelector<HTMLElement>(".jdgm-react-medals-pending")
    ?.classList.replace("jdgm-react-medals-pending", "jdgm-medals");
  container
    .querySelectorAll<HTMLElement>(".jdgm-react-medal-image-pending")
    .forEach((image) =>
      image.classList.replace(
        "jdgm-react-medal-image-pending",
        "jdgm-medal__image",
      ),
    );
}

function prepareJudgeMeMedalsMarkup(
  container: HTMLElement,
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
  runtime: JudgeMeMedalsRuntime,
): void {
  disposeJudgeMeMedals(container);

  const medals = root.querySelector<HTMLElement>(".jdgm-medals");
  const ratingStars = root.querySelector<HTMLElement>(
    ".jdgm-rating__stars",
  );
  const medalImages = Array.from(
    root.querySelectorAll<HTMLElement>(".jdgm-medal__image"),
  );

  if (!medals || !ratingStars || medalImages.length === 0) {
    throw new Error("Judge.me returned incomplete Medals markup.");
  }

  const monochrome =
    settings.medals_widget_use_monochromatic_version === true;
  const rebranded = runtime.WIDGET_REBRANDING_ENABLED === true;
  const publicImageHost = normalizeRuntimeAssetHost(
    runtime.JM_PUBLIC_IMAGE_URL,
    JUDGE_ME_PUBLIC_IMAGE_HOST,
  );
  const colorImageHost = `${publicImageHost}${rebranded ? "medals-v2-2025-rebranding/" : "medals-v2/"}`;
  const monochromeImageHost = `${publicImageHost}${
    rebranded ? "medals-mono-2025-rebranding/" : "medals-mono/"
  }`;

  for (const image of medalImages) {
    const assetPath = image.dataset.url;
    if (!assetPath || !/^[a-z0-9._/-]+$/i.test(assetPath)) {
      throw new Error("Judge.me returned an invalid Medals asset path.");
    }

    runtime._loadSvg(
      runtime.$(image),
      colorImageHost,
      monochromeImageHost,
      monochrome,
    );
  }

  prepareJudgeMeMedalsLinks(medals, settings);

  if (!ratingStars.querySelector(".jdgm-star")) {
    runtime.buildStarsFor(runtime.$(ratingStars));
  }
  runtime._renderVerifiedByJudgeme(
    runtime.$(root),
    monochrome,
    true,
    false,
    rebranded,
  );

  root.classList.toggle("jdgm-medals-wrapper--rebranding", rebranded);
  if (rebranded) prepareJudgeMeMedalsSeparator(root);
  if (monochrome) prepareJudgeMeMedalsColors(root, settings);
  prepareJudgeMeMedalsResponsiveLayout(container, root);
}

function prepareJudgeMeMedalsLinks(
  medals: HTMLElement,
  settings: JudgeMeRuntimeSettings,
): void {
  const configuredUrl = medals.dataset.link;
  const shouldLink =
    settings.can_be_branded === true &&
    typeof configuredUrl === "string" &&
    isSafeNavigationUrl(configuredUrl);

  medals.querySelectorAll<HTMLAnchorElement>(".jdgm-medal").forEach((link) => {
    if (shouldLink) {
      link.href = configuredUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  });
}

function prepareJudgeMeMedalsColors(
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
): void {
  if (root.querySelector("[data-judgeme-react-medals-colors]")) return;

  const background = getRuntimeColor(settings.medals_widget_background_color);
  const elements = getRuntimeColor(settings.medals_widget_elements_color);
  if (!background || !elements) return;

  const style = document.createElement("style");
  style.dataset.judgemeReactMedalsColors = "true";
  style.textContent = [
    `.jdgm-medals-wrapper.jdgm-widget { background-color: ${background} !important; color: ${elements} !important; }`,
    `.jdgm-medals-wrapper .jdgm-verified-wrapper { border-color: ${elements} !important; }`,
    `.jdgm-medal__value, .jdgm-medals-wrapper .jdgm-star { color: ${elements} !important; }`,
    `.jdgm-medals-wrapper .jdgm-svg__mono svg path, .jdgm-medals-wrapper .jdgm-svg__mono svg circle { fill: ${elements}; }`,
  ].join("\n");
  root.prepend(style);
}

function prepareJudgeMeMedalsSeparator(root: HTMLElement): void {
  if (root.querySelector(".jdgm-medals-separator")) return;

  const medals = root.querySelector<HTMLElement>(".jdgm-medals");
  const verified = root.querySelector<HTMLElement>(".jdgm-verified-wrapper");
  if (!medals || !verified) return;

  const separator = document.createElement("div");
  separator.className = "jdgm-medals-separator";
  separator.setAttribute("aria-hidden", "true");
  (verified.compareDocumentPosition(medals) & Node.DOCUMENT_POSITION_FOLLOWING
    ? verified
    : medals
  ).after(separator);
}

function prepareJudgeMeMedalsResponsiveLayout(
  container: HTMLElement,
  root: HTMLElement,
): void {
  const availableWidth =
    container.getBoundingClientRect().width ||
    container.parentElement?.getBoundingClientRect().width ||
    window.innerWidth;
  if (availableWidth >= 680) return;

  root.classList.add("jdgm-medals-wrapper--small");
  const medals = root.querySelector<HTMLElement>(".jdgm-medals");
  const rating = root.querySelector<HTMLElement>(".jdgm-rating");
  const verifiedBy = root.querySelector<HTMLElement>(".jdgm-verified-by");
  const medalContainer = root.querySelector<HTMLElement>(
    ".jdgm-medals__container",
  );
  const medalCount = root.querySelectorAll(".jdgm-medal-wrapper").length;

  if (!medals || !medalContainer || medalCount === 0) return;

  if (rating) medals.before(rating);
  if (verifiedBy) medals.after(verifiedBy);
  medalContainer.style.width = `${96 * medalCount}px`;

  if (medalCount <= 3) return;

  let currentSlide = 1;
  const totalSlides = medalCount - 2;
  const timer = window.setInterval(() => {
    medals.scrollTo({
      behavior: "smooth",
      left: (currentSlide - 1) * 96,
    });
    currentSlide = currentSlide === totalSlides ? 1 : currentSlide + 1;
  }, 3_000);
  medalsTimers.set(container, timer);
}

function isJudgeMeMedalsPrepared(root: HTMLElement): boolean {
  const images = Array.from(
    root.querySelectorAll<HTMLElement>(".jdgm-medal__image"),
  );

  return (
    images.length > 0 &&
    images.every((image) => Boolean(image.querySelector("img, svg"))) &&
    Boolean(root.querySelector(".jdgm-rating__stars .jdgm-star"))
  );
}

function normalizeRuntimeAssetHost(
  value: string | undefined,
  fallback: string,
): string {
  const host = value?.trim() || fallback;
  return host.endsWith("/") ? host : `${host}/`;
}

function isVerifiedReviewsCounterPrepared(root: HTMLElement): boolean {
  return (
    isVerifiedReviewsCounterStyled(root) &&
    Boolean(
      root.querySelector(
        ".jdgm-verified-badge__image img, .jdgm-verified-badge__image svg",
      ),
    )
  );
}

function isVerifiedReviewsCounterStyled(root: HTMLElement): boolean {
  return (
    Array.from(root.classList).some((name) =>
      name.startsWith("jdgm-verified-badge--style-"),
    ) && root.style.display !== "none"
  );
}

function prepareVerifiedReviewsCounterMarkup(
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
  runtime: VerifiedReviewsCounterRuntime,
): void {
  const total = Number(
    root
      .querySelector<HTMLElement>(".jdgm-verified-badge__total")
      ?.textContent?.replace(/[\s,]/g, ""),
  );

  if (!Number.isSafeInteger(total) || total < 20) {
    root.remove();
    throw new Error(
      "Judge.me requires at least 20 verified reviews for this counter.",
    );
  }

  const style =
    settings.verified_count_badge_style === "vintage"
      ? "vintage"
      : "branded";
  root.classList.add(`jdgm-verified-badge--style-${style}`);

  const image = root.querySelector<HTMLElement>(
    ".jdgm-verified-badge__image",
  );
  if (!image) {
    throw new Error(
      "Judge.me returned incomplete Verified Reviews Counter markup.",
    );
  }

  if (style === "vintage") {
    if (!image.querySelector("img")) {
      const assetPath = image.dataset.url;
      if (!assetPath || !/^\/[a-z0-9._/-]+$/i.test(assetPath)) {
        throw new Error(
          "Judge.me returned an invalid classic Verified Reviews Counter asset.",
        );
      }

      const classicImage = document.createElement("img");
      classicImage.alt = "Verified Reviews";
      classicImage.src =
        "https://s3.amazonaws.com/me.judge.public-static-assets/general/verified-badge" +
        assetPath;
      image.appendChild(classicImage);
    }
    root.style.display = "inline-block";
  } else {
    root.querySelector(".jdgm-verified-badge__text")?.remove();
    root.querySelector(".jdgm-verified-badge__stars")?.remove();

    const colorStyle = settings.verified_count_badge_color_style;
    const monochrome =
      colorStyle === "monochromatic_version" || colorStyle === "custom";
    const rebranded = runtime.WIDGET_REBRANDING_ENABLED === true;
    image.dataset.url = monochrome
      ? "/verified-badge-mono.svg"
      : rebranded
        ? "/verified-badge-2025.svg"
        : "/verified-badge.svg";
    const badgeAsset = rebranded
      ? "https://judgeme-public-images.imgix.net/judgeme/verified-badge-v2/verified-badge-2025.svg?auto=format"
      : "https://judgeme-public-images.imgix.net/judgeme/verified-badge-v2/verified-badge.svg?auto=format";
    runtime._loadSvg(
      runtime.$(image),
      badgeAsset,
      badgeAsset,
      monochrome,
    );

    const showBranding = rebranded
      ? true
      : settings.verified_count_badge_show_jm_brand === true;
    if (showBranding && !root.querySelector(".jdgm-verified-by")) {
      const branding = document.createElement("span");
      branding.className = rebranded
        ? "jdgm-verified-by jdgm-verified-by--rebranding"
        : "jdgm-verified-by";
      const brandingText = document.createElement("span");
      brandingText.className = rebranded
        ? "jdgm-verified-by__text jdgm-verified-by__text--rebranding"
        : "jdgm-verified-by__text";
      brandingText.textContent = "by";
      const brandingImage = document.createElement("span");
      brandingImage.className = "jdgm-verified-by__image";
      branding.append(brandingText, brandingImage);
      root.appendChild(branding);

      const color = getRuntimeColor(settings.verified_count_badge_color);
      if (color) {
        root.style.color = color;
        const colorStyleElement = document.createElement("style");
        colorStyleElement.dataset.judgemeReactVerifiedCounterColor = "true";
        colorStyleElement.textContent = [
          `.jdgm-widget.jdgm-verified-badge .jdgm-verified-badge__image svg circle { stroke: ${color}; }`,
          `.jdgm-widget.jdgm-verified-badge .jdgm-verified-badge__image svg path { fill: ${color}; }`,
          `.jdgm-verified-count-badget, .jdgm-widget.jdgm-verified-badge { color: ${color}; }`,
          monochrome
            ? `.jdgm-widget.jdgm-verified-badge .jdgm-verified-by .jdgm-svg__mono svg path { fill: ${color}; }`
            : "",
        ].join("\n");
        root.appendChild(colorStyleElement);
      }

      runtime._renderVerifiedByJudgeme?.(
        runtime.$(root),
        monochrome,
        false,
        false,
        rebranded,
      );
      const orientation =
        settings.verified_count_badge_orientation === "vertical"
          ? "vertical"
          : "horizontal";
      root.classList.add(
        `jdgm-verified-badge--style-branded-${orientation}`,
      );
    }
    root.style.display = "flex";
  }

  prepareVerifiedReviewsCounterLink(root, settings);
}

function prepareVerifiedReviewsCounterLink(
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
): void {
  let link = root.closest<HTMLAnchorElement>("a.jdgm-verified-count-badget");

  if (!link) {
    link = document.createElement("a");
    link.className = "jdgm-verified-count-badget";
    root.before(link);
    link.appendChild(root);
  }

  const configuredUrl = settings.verified_count_badge_url;
  const brandingUrl = settings.branding_url;
  const shouldUseBrandingUrl =
    settings.is_verified_count_badge_a_link !== true &&
    settings.can_be_branded === true &&
    settings.shop_use_review_site === true;
  const url = shouldUseBrandingUrl ? brandingUrl : configuredUrl;

  if (typeof url === "string" && url.trim() && isSafeNavigationUrl(url)) {
    link.href = url;
    if (shouldUseBrandingUrl) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  } else {
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.removeAttribute("rel");
  }
}

function prepareAllReviewsCounterMarkup(
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
  runtime: AllReviewsCounterRuntime,
): void {
  const rating = root.querySelector<HTMLElement>(".jdgm-all-reviews-rating");
  const text = root.querySelector<HTMLElement>(".jdgm-all-reviews-text__text");

  if (!rating || !text) {
    throw new Error("Judge.me returned incomplete All Reviews Counter markup.");
  }

  const style = settings.all_reviews_text_style === "text" ? "text" : "branded";
  const showStars =
    style === "branded" ||
    settings.show_stars_for_all_reviews_text_badge === true;
  root.classList.toggle(
    "jdgm-all-reviews-text--style-branded",
    style === "branded",
  );
  root.classList.toggle("jdgm-all-reviews-text--style-text", style === "text");

  if (showStars) {
    rating.style.removeProperty("display");
    if (!rating.querySelector(".jdgm-star")) {
      runtime.buildStarsFor(runtime.$(rating));
    }
  } else {
    rating.style.display = "none";
  }

  if (style === "branded") {
    prepareAllReviewsCounterBranding(root, rating, text, settings, runtime);
  }

  const customCss = settings.all_reviews_text_custom_css;
  if (typeof customCss === "string" && customCss.trim()) {
    root.style.cssText += `;${customCss}`;
  }

  const color = getRuntimeColor(settings.all_reviews_text_color);
  if (color) {
    root.style.color = color;
    text.style.color = color;
    rating.style.color = color;
    rating
      .querySelectorAll<HTMLElement>(".jdgm-star")
      .forEach((star) => star.style.setProperty("color", color));
  }

  text.style.removeProperty("display");
  root.style.display = "block";
}

function prepareAllReviewsCounterBranding(
  root: HTMLElement,
  rating: HTMLElement,
  text: HTMLElement,
  settings: JudgeMeRuntimeSettings,
  runtime: AllReviewsCounterRuntime,
): void {
  if (!rating.querySelector(".jdgm-all-reviews-rating__score")) {
    const stars = Array.from(rating.children).filter((element) =>
      element.classList.contains("jdgm-star"),
    );

    if (stars.length > 0) {
      const starsWrapper = document.createElement("span");
      starsWrapper.className = "jdgm-all-reviews-rating__stars";
      stars[0]?.before(starsWrapper);
      starsWrapper.append(...stars);
    }

    const score = Number(rating.dataset.score);
    if (Number.isFinite(score)) {
      const scoreElement = document.createElement("span");
      scoreElement.className = "jdgm-all-reviews-rating__score";
      scoreElement.textContent = score.toPrecision(2);
      rating.prepend(scoreElement);
    }
  }

  if (root.querySelector('[class*="verified"]')) return;

  const shouldRenderBranding = runtime.WIDGET_REBRANDING_ENABLED
    ? settings.widget_show_verified_branding === true
    : settings.all_reviews_text_show_jm_brand === true;

  if (!shouldRenderBranding) return;

  const branding = document.createElement("span");
  branding.className = "jdgm-verified-by";
  const brandingText = document.createElement("span");
  brandingText.className = "jdgm-verified-by__text";
  const brandingImage = document.createElement("span");
  brandingImage.className = "jdgm-verified-by__image";
  branding.append(brandingText, brandingImage);
  text.after(branding);

  if (
    runtime.WIDGET_REBRANDING_ENABLED &&
    typeof runtime._renderVerifiedJudgeme === "function"
  ) {
    const color =
      settings.all_reviews_text_color_style === "judgeme_brand_color"
        ? "#3EB2A2"
        : getRuntimeColor(settings.all_reviews_text_color);
    runtime._renderVerifiedJudgeme(runtime.$(root), color, false, false);
    return;
  }

  if (typeof runtime._renderVerifiedByJudgeme === "function") {
    runtime._renderVerifiedByJudgeme(runtime.$(root), false, false, false);
  }

  // Keep the text immediately before the branding element, matching the
  // current secondary bundle's insertion order.
  const renderedBranding = root.querySelector<HTMLElement>(
    '[class*="verified"]',
  );
  if (renderedBranding && text.nextElementSibling !== renderedBranding) {
    text.after(renderedBranding);
  }
}

type ReviewStreamRuntime = Required<
  Pick<
    JudgeMeRuntime,
    "$" | "buildStarsFor" | "customizeReviews" | "setupMediaGallery"
  >
> &
  JudgeMeRuntime;

function isReviewStreamRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is ReviewStreamRuntime {
  return Boolean(
    runtime &&
    typeof runtime.$ === "function" &&
    typeof runtime.buildStarsFor === "function" &&
    typeof runtime.customizeReviews === "function" &&
    typeof runtime.setupMediaGallery === "function",
  );
}

function isFloatingTabRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is ReviewStreamRuntime {
  return isReviewStreamRuntimeReady(runtime);
}

function prepareAllReviewsWidgetMarkup(
  root: HTMLElement,
  initialReviewType: AllReviewsWidgetReviewType,
  settings: JudgeMeRuntimeSettings,
  runtime: ReviewStreamRuntime,
): void {
  const productReviews = root.querySelector<HTMLElement>(
    ".jdgm-all-reviews__body",
  );

  if (!productReviews) {
    throw new Error("Judge.me returned incomplete All Reviews Widget markup.");
  }

  let shopReviews = root.querySelector<HTMLElement>(".jdgm-shop-reviews__body");

  if (!shopReviews) {
    shopReviews = document.createElement("div");
    shopReviews.className = "jdgm-shop-reviews__body";
    productReviews.insertAdjacentElement("afterend", shopReviews);
  }

  const selectedReviews =
    initialReviewType === "shop-reviews" ? shopReviews : productReviews;
  const unselectedReviews =
    initialReviewType === "shop-reviews" ? productReviews : shopReviews;

  if (!selectedReviews.hasChildNodes() && unselectedReviews.hasChildNodes()) {
    selectedReviews.append(...Array.from(unselectedReviews.childNodes));
  }

  root.dataset.page = "1";
  root.dataset.reviewType = initialReviewType;
  productReviews.dataset.currentPage = "1";
  shopReviews.dataset.currentPage = "1";
  productReviews.style.display =
    initialReviewType === "product-reviews" ? "" : "none";
  shopReviews.style.display =
    initialReviewType === "shop-reviews" ? "" : "none";

  const subtabs = Array.from(
    root.querySelectorAll<HTMLElement>(".jdgm-subtab"),
  );
  subtabs.slice(1).forEach((subtab) => subtab.remove());
  const loadMoreWrappers = Array.from(
    root.querySelectorAll<HTMLElement>(
      ".jdgm-all-reviews-page__load-more-wrapper",
    ),
  );
  loadMoreWrappers.slice(1).forEach((wrapper) => wrapper.remove());
  const activeFooter = loadMoreWrappers[0]?.closest<HTMLElement>(
    ".jdgm-all-reviews__footer",
  );
  root
    .querySelectorAll<HTMLElement>(".jdgm-all-reviews__footer")
    .forEach((footer) => {
      if (activeFooter && footer !== activeFooter) footer.remove();
    });
  if (
    activeFooter &&
    !activeFooter.querySelector("[data-judgeme-react-load-sentinel]")
  ) {
    const sentinel = document.createElement("div");
    sentinel.dataset.judgemeReactLoadSentinel = "true";
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.height = "1px";
    activeFooter.appendChild(sentinel);
  }
  loadMoreWrappers[0]?.classList.toggle(
    "jdgm-hidden",
    root.dataset.loadMode === "scroll" ||
      root.dataset.allReviewsLoaded === "true",
  );
  ensureAllReviewsTabSemantics(root);
  root
    .querySelectorAll<HTMLElement>(".jdgm-subtab__name")
    .forEach((tab) =>
      tab.classList.toggle(
        "jdgm--active",
        normalizeReviewType(tab.dataset.tabname) === initialReviewType,
      ),
    );

  ensureAllReviewsSort(root, settings);
  root.style.display = "block";
  runtime.customizeReviews();
  runtime.setupMediaGallery(runtime.$(selectedReviews));
}

function bindAllReviewsWidgetLifecycle(
  root: HTMLElement,
  runtime: ReviewStreamRuntime,
  options: { publicToken: string; shopDomain: string },
): void {
  const container = root.closest<HTMLElement>(
    "[data-judgeme-react-widget='all-reviews-widget']",
  );
  const sentinel = root.querySelector<HTMLElement>(
    "[data-judgeme-react-load-sentinel]",
  );

  if (!container) {
    throw new Error("Judge.me returned an unscoped All Reviews Widget.");
  }

  allReviewsWidgetDisposers.get(container)?.();

  const loadNextPage = () => {
    if (
      root.dataset.judgemeReactPageStatus === "loading" ||
      root.dataset.allReviewsLoaded === "true"
    ) {
      return;
    }

    const page = Number(root.dataset.page ?? "1") + 1;
    void loadAllReviewsWidgetPage({
      append: true,
      page: Number.isFinite(page) && page > 1 ? page : 2,
      publicToken: options.publicToken,
      reviewType: normalizeReviewType(root.dataset.reviewType),
      root,
      runtime,
      shopDomain: options.shopDomain,
    });
  };

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const subtab = target.closest<HTMLElement>(".jdgm-subtab__name");
    const loadMore = target.closest<HTMLElement>(
      ".jdgm-all-reviews-page__load-more",
    );
    const histogramRow = target.closest<HTMLElement>(".jdgm-histogram__row");
    const clearFilter = target.closest<HTMLElement>(
      ".jdgm-histogram__clear-filter",
    );

    if (!subtab && !loadMore && !histogramRow && !clearFilter) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (subtab) {
      const reviewType = normalizeReviewType(subtab.dataset.tabname);
      resetAllReviewsFilters(root);
      void loadAllReviewsWidgetPage({
        append: false,
        page: 1,
        publicToken: options.publicToken,
        reviewType,
        root,
        runtime,
        shopDomain: options.shopDomain,
      });
      return;
    }

    if (histogramRow || clearFilter) {
      const rating = histogramRow?.getAttribute("data-rating");
      const filterRating = /^[1-5]$/.test(rating ?? "") ? (rating ?? "") : "";
      root.dataset.filterRating = filterRating;
      root
        .querySelectorAll(".jdgm-histogram__row")
        .forEach((row) =>
          row.classList.toggle(
            "jdgm-histogram__row--selected",
            row === histogramRow && Boolean(filterRating),
          ),
        );
      void loadAllReviewsWidgetPage({
        append: false,
        page: 1,
        publicToken: options.publicToken,
        reviewType: normalizeReviewType(root.dataset.reviewType),
        root,
        runtime,
        shopDomain: options.shopDomain,
      });
      return;
    }

    loadNextPage();
  };
  const handleChange = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches(".jdgm-sort-dropdown")) return;

    event.stopImmediatePropagation();
    const sort = getAllReviewsSort(target.value);
    root.dataset.sortBy = sort.by;
    root.dataset.sortDir = sort.dir ?? "";
    void loadAllReviewsWidgetPage({
      append: false,
      page: 1,
      publicToken: options.publicToken,
      reviewType: normalizeReviewType(root.dataset.reviewType),
      root,
      runtime,
      shopDomain: options.shopDomain,
    });
  };
  const handleKeydown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches(".jdgm-subtab__name")) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    target.click();
  };

  root.addEventListener("click", handleClick, true);
  root.addEventListener("change", handleChange, true);
  root.addEventListener("keydown", handleKeydown, true);
  const paginationObserver =
    root.dataset.loadMode === "scroll" &&
    sentinel &&
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) loadNextPage();
        })
      : undefined;
  if (paginationObserver && sentinel) paginationObserver.observe(sentinel);
  const semanticsObserver = new MutationObserver(() => {
    ensureAllReviewsTabSemantics(root);
  });
  semanticsObserver.observe(root, { childList: true, subtree: true });

  allReviewsWidgetDisposers.set(container, () => {
    paginationObserver?.disconnect();
    semanticsObserver.disconnect();
    root.removeEventListener("click", handleClick, true);
    root.removeEventListener("change", handleChange, true);
    root.removeEventListener("keydown", handleKeydown, true);
  });
}

async function loadAllReviewsWidgetPage({
  append,
  page,
  publicToken,
  reviewType,
  root,
  runtime,
  shopDomain,
}: {
  append: boolean;
  page: number;
  publicToken: string;
  reviewType: AllReviewsWidgetReviewType;
  root: HTMLElement;
  runtime: ReviewStreamRuntime;
  shopDomain: string;
}): Promise<void> {
  const productReviews = root.querySelector<HTMLElement>(
    ".jdgm-all-reviews__body",
  );
  const shopReviews = root.querySelector<HTMLElement>(
    ".jdgm-shop-reviews__body",
  );
  const reviews = reviewType === "shop-reviews" ? shopReviews : productReviews;
  const spinner = root.querySelector<HTMLElement>(".jdgm-spinner");
  const loadMore = root.querySelector<HTMLElement>(
    ".jdgm-all-reviews-page__load-more",
  );
  const loadMoreWrapper = root.querySelector<HTMLElement>(
    ".jdgm-all-reviews-page__load-more-wrapper",
  );

  if (!reviews || !productReviews || !shopReviews) return;

  root.dataset.judgemeReactPageStatus = "loading";
  spinner?.style.setProperty("display", "block");
  if (!append) reviews.style.display = "none";

  try {
    const html = await requestAllReviewsPage({
      page,
      publicToken,
      reviewType,
      root,
      shopDomain,
    });

    if (append) {
      reviews.insertAdjacentHTML("beforeend", html);
    } else {
      reviews.innerHTML = html;
    }

    const reviewCount = countReviewMarkup(html);
    const pageSize = getAllReviewsPageSize(root);
    const totalLoaded = reviews.querySelectorAll(".jdgm-rev").length;
    const expectedReviewCount = getExpectedReviewCount(root, reviewType);
    root.dataset.allReviewsLoaded = String(
      reviewCount === 0 ||
        reviewCount < pageSize ||
        (expectedReviewCount !== undefined &&
          totalLoaded >= expectedReviewCount),
    );
    if (!append && reviewCount > 0) {
      root.dataset.pageSize = String(Math.max(pageSize, reviewCount));
    }
    root.dataset.page = String(page);
    root.dataset.reviewType = reviewType;
    reviews.dataset.currentPage = String(page);
    productReviews.style.display =
      reviewType === "product-reviews" ? "" : "none";
    shopReviews.style.display = reviewType === "shop-reviews" ? "" : "none";
    root
      .querySelectorAll<HTMLElement>(".jdgm-subtab__name")
      .forEach((tab) =>
        tab.classList.toggle(
          "jdgm--active",
          normalizeReviewType(tab.dataset.tabname) === reviewType,
        ),
      );

    if (loadMore) loadMore.dataset.page = String(page + 1);
    loadMoreWrapper?.classList.toggle(
      "jdgm-hidden",
      root.dataset.loadMode === "scroll" ||
        root.dataset.allReviewsLoaded === "true",
    );

    runtime.customizeReviews();
    runtime.setupMediaGallery(runtime.$(reviews));
    root.dataset.judgemeReactPageStatus = "ready";
  } catch (error) {
    root.dataset.judgemeReactPageStatus = "error";
    console.error("Judge.me All Reviews Widget request error", error);
  } finally {
    spinner?.style.setProperty("display", "none");
    reviews.style.display = "";
  }
}

function prepareFloatingTabMarkup(
  root: HTMLElement,
  position: InitializeFloatingReviewsTabOptions["position"],
  settings: JudgeMeRuntimeSettings,
  runtime: Required<
    Pick<
      JudgeMeRuntime,
      "$" | "buildStarsFor" | "customizeReviews" | "setupMediaGallery"
    >
  > &
    JudgeMeRuntime,
): void {
  const main = root.querySelector(".jdgm-revs-tab__main");
  const header = root.querySelector(".jdgm-revs-tab__header");
  const button = root.querySelector<HTMLElement>(".jdgm-revs-tab-btn");

  if (main && header && header.parentElement !== main) {
    main.prepend(header);
  }

  if (button) {
    button.setAttribute("position", position);
    button.dataset.style =
      settings.floating_tab_tab_style === "stars" ? "stars" : "text";

    if (button.dataset.style === "text") {
      const label = settings.floating_tab_button_name;
      if (typeof label === "string" && label.trim()) button.textContent = label;
    } else {
      const stars = button.querySelector(".jdgm-stars");
      if (stars) runtime.buildStarsFor(runtime.$(stars));
    }

    const background = getRuntimeColor(
      settings.floating_tab_button_background_color,
    );
    const foreground = getRuntimeColor(settings.floating_tab_button_color);
    if (background) button.style.backgroundColor = background;
    if (foreground) button.style.color = foreground;
  }

  const subtabs = Array.from(
    root.querySelectorAll<HTMLElement>(".jdgm-subtab"),
  );
  subtabs.slice(1).forEach((subtab) => subtab.remove());

  if (
    root.dataset.judgemeReactSource === "all-reviews-page-fallback" ||
    root.closest("[data-judgeme-react-source='all-reviews-page-fallback']")
  ) {
    ensureAllReviewsSort(root, settings);
  }

  root.style.display = "block";
  runtime.customizeReviews();

  const reviews = root.querySelector(".jdgm-revs-tab__reviews");
  if (reviews) runtime.setupMediaGallery(runtime.$(reviews));
}

function bindFloatingTabLifecycle(
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
  runtime: Required<
    Pick<
      JudgeMeRuntime,
      "$" | "buildStarsFor" | "customizeReviews" | "setupMediaGallery"
    >
  > &
    JudgeMeRuntime,
  options: {
    publicToken: string;
    shopDomain: string;
    source: FloatingReviewsTabSource;
  },
): void {
  const container = root.closest<HTMLElement>(
    "[data-judgeme-react-widget='floating-reviews-tab']",
  );
  const wrapper = root.querySelector<HTMLElement>(".jdgm-revs-tab__wrapper");
  const button = root.querySelector<HTMLElement>(".jdgm-revs-tab-btn");

  if (!container || !wrapper || !button) {
    throw new Error(
      "Judge.me returned incomplete Floating Reviews Tab markup.",
    );
  }

  floatingTabDisposers.get(container)?.();

  const open = () => {
    const currentRoot = container.querySelector<HTMLElement>(".jdgm-revs-tab");
    const currentWrapper = currentRoot?.querySelector<HTMLElement>(
      ".jdgm-revs-tab__wrapper",
    );
    if (!currentWrapper) return;

    const urlEnabled = settings.floating_tab_url_enabled === true;
    const url = settings.floating_tab_url;

    if (urlEnabled && typeof url === "string" && isSafeNavigationUrl(url)) {
      window.location.assign(url);
      return;
    }

    currentWrapper.classList.add("jdgm-show");
    document.body.classList.add("jdgm-lock-scroll");
    if (settings.widget_theme === "carousel") {
      window.dispatchEvent(new Event("resize"));
    }
  };
  const close = () => {
    container
      .querySelector<HTMLElement>(".jdgm-revs-tab__wrapper")
      ?.classList.remove("jdgm-show");
    document.body.classList.remove("jdgm-lock-scroll");
  };
  const handleChromeClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openButton = target.closest<HTMLElement>(".jdgm-revs-tab-btn");
    const closeButton = target.closest<HTMLElement>(".jdgm-close-ico");
    const mask = target.closest<HTMLElement>(".jdgm-mask");
    if (!openButton && !closeButton && !mask) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (openButton) open();
    else close();
  };
  const handleKeydown = (event: KeyboardEvent) => {
    const currentRoot = container.querySelector<HTMLElement>(".jdgm-revs-tab");
    const currentWrapper = currentRoot?.querySelector<HTMLElement>(
      ".jdgm-revs-tab__wrapper",
    );

    if (
      event.key === "Escape" &&
      currentWrapper?.classList.contains("jdgm-show")
    ) {
      close();
      currentRoot?.querySelector<HTMLElement>(".jdgm-revs-tab-btn")?.focus();
      return;
    }

    const target = event.target;
    if (
      options.source === "all-reviews-page-fallback" &&
      target instanceof HTMLElement &&
      target.matches(".jdgm-subtab__name") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      target.click();
    }
  };
  const handleFallbackClick = (event: Event) => {
    if (options.source !== "all-reviews-page-fallback") return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const currentRoot = container.querySelector<HTMLElement>(".jdgm-revs-tab");
    if (!currentRoot) return;

    const subtab = target.closest<HTMLElement>(".jdgm-subtab__name");
    const loadMore = target.closest<HTMLElement>(".jdgm-paginate__load-more");
    const histogramRow = target.closest<HTMLElement>(".jdgm-histogram__row");

    if (!subtab && !loadMore && !histogramRow) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (subtab) {
      const reviewType = normalizeReviewType(subtab.dataset.tabname);
      resetAllReviewsFilters(currentRoot);
      void loadFloatingTabFallbackPage({
        append: false,
        page: 1,
        publicToken: options.publicToken,
        reviewType,
        root: currentRoot,
        runtime,
        shopDomain: options.shopDomain,
      });
      return;
    }

    if (histogramRow) {
      const rating = histogramRow.getAttribute("data-rating");
      const filterRating = /^[1-5]$/.test(rating ?? "") ? (rating ?? "") : "";
      currentRoot.dataset.filterRating = filterRating;
      currentRoot
        .querySelectorAll(".jdgm-histogram__row")
        .forEach((row) =>
          row.classList.toggle(
            "jdgm-histogram__row--selected",
            row === histogramRow && Boolean(filterRating),
          ),
        );
      void loadFloatingTabFallbackPage({
        append: false,
        page: 1,
        publicToken: options.publicToken,
        reviewType: normalizeReviewType(currentRoot.dataset.reviewType),
        root: currentRoot,
        runtime,
        shopDomain: options.shopDomain,
      });
      return;
    }

    const page = Number(
      loadMore?.dataset.page ?? currentRoot.dataset.page ?? "1",
    );
    void loadFloatingTabFallbackPage({
      append: true,
      page: Number.isFinite(page) && page > 1 ? page : 2,
      publicToken: options.publicToken,
      reviewType: normalizeReviewType(currentRoot.dataset.reviewType),
      root: currentRoot,
      runtime,
      shopDomain: options.shopDomain,
    });
  };
  const handleFallbackChange = (event: Event) => {
    if (options.source !== "all-reviews-page-fallback") return;

    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches(".jdgm-sort-dropdown")) return;
    const currentRoot = container.querySelector<HTMLElement>(".jdgm-revs-tab");
    if (!currentRoot) return;

    event.stopImmediatePropagation();
    const sort = getAllReviewsSort(target.value);
    currentRoot.dataset.sortBy = sort.by;
    currentRoot.dataset.sortDir = sort.dir ?? "";
    void loadFloatingTabFallbackPage({
      append: false,
      page: 1,
      publicToken: options.publicToken,
      reviewType: normalizeReviewType(currentRoot.dataset.reviewType),
      root: currentRoot,
      runtime,
      shopDomain: options.shopDomain,
    });
  };

  container.addEventListener("click", handleChromeClick, true);
  document.addEventListener("keydown", handleKeydown, true);
  container.addEventListener("click", handleFallbackClick, true);
  container.addEventListener("change", handleFallbackChange, true);

  floatingTabDisposers.set(container, () => {
    container.removeEventListener("click", handleChromeClick, true);
    document.removeEventListener("keydown", handleKeydown, true);
    container.removeEventListener("click", handleFallbackClick, true);
    container.removeEventListener("change", handleFallbackChange, true);
    close();
  });
}

async function loadFloatingTabFallbackPage({
  append,
  page,
  publicToken,
  reviewType,
  root,
  runtime,
  shopDomain,
}: {
  append: boolean;
  page: number;
  publicToken: string;
  reviewType: AllReviewsWidgetReviewType;
  root: HTMLElement;
  runtime: Required<
    Pick<JudgeMeRuntime, "$" | "customizeReviews" | "setupMediaGallery">
  > &
    JudgeMeRuntime;
  shopDomain: string;
}): Promise<void> {
  const reviews = root.querySelector<HTMLElement>(".jdgm-revs-tab__reviews");
  const spinner = root.querySelector<HTMLElement>(".jdgm-revs-tab__spinner");
  const loadMore = root.querySelector<HTMLElement>(".jdgm-paginate__load-more");

  if (!reviews) return;

  root.dataset.judgemeReactFallbackStatus = "loading";
  spinner?.style.setProperty("display", "block");
  if (!append) reviews.style.display = "none";

  try {
    const html = await requestAllReviewsPage({
      page,
      publicToken,
      reviewType,
      root,
      shopDomain,
    });

    if (append) {
      reviews.insertAdjacentHTML("beforeend", html);
    } else {
      reviews.innerHTML = html;
    }

    const reviewCount = countReviewMarkup(html);
    const pageSize = getAllReviewsPageSize(root);
    const totalLoaded = reviews.querySelectorAll(".jdgm-rev").length;
    const expectedReviewCount = getExpectedReviewCount(root, reviewType);
    const allReviewsLoaded =
      reviewCount === 0 ||
      reviewCount < pageSize ||
      (expectedReviewCount !== undefined && totalLoaded >= expectedReviewCount);
    if (!append && reviewCount > 0) {
      root.dataset.pageSize = String(Math.max(pageSize, reviewCount));
    }
    root.dataset.page = String(page);
    root.dataset.reviewType = reviewType;
    root
      .querySelectorAll(".jdgm-subtab__name")
      .forEach((tab) =>
        tab.classList.toggle(
          "jdgm--active",
          (tab as HTMLElement).dataset.tabname === reviewType,
        ),
      );

    if (loadMore) {
      loadMore.dataset.page = String(page + 1);
      loadMore.style.display = allReviewsLoaded ? "none" : "";
    }

    runtime.customizeReviews();
    runtime.setupMediaGallery(runtime.$(reviews));
    root.dataset.judgemeReactFallbackStatus = "ready";
  } catch (error) {
    root.dataset.judgemeReactFallbackStatus = "error";
    console.error(
      "Judge.me Floating Reviews Tab fallback request error",
      error,
    );
  } finally {
    spinner?.style.setProperty("display", "none");
    reviews.style.display = "";
  }
}

async function requestAllReviewsPage({
  page,
  publicToken,
  reviewType,
  root,
  shopDomain,
}: {
  page: number;
  publicToken: string;
  reviewType: AllReviewsWidgetReviewType;
  root: HTMLElement;
  shopDomain: string;
}): Promise<string> {
  const url = new URL("https://judge.me/api/v1/widgets/all_reviews_page");
  url.searchParams.set("api_token", publicToken);
  url.searchParams.set("page", String(page));
  url.searchParams.set("review_type", reviewType);
  url.searchParams.set("shop_domain", shopDomain);
  if (root.dataset.filterRating) {
    url.searchParams.set("filter_rating", root.dataset.filterRating);
  }
  if (root.dataset.sortBy) {
    url.searchParams.set("sort_by", root.dataset.sortBy);
  }
  if (root.dataset.sortDir) {
    url.searchParams.set("sort_dir", root.dataset.sortDir);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `Judge.me all_reviews_page request failed with HTTP ${response.status}.`,
    );
  }

  const payload: unknown = await response.json();
  const html = getAllReviewsPageHtml(payload);
  assertSafeRuntimeMarkup(html);
  return html;
}

function getAllReviewsPageHtml(payload: unknown): string {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("all_reviews" in payload) ||
    typeof payload.all_reviews !== "string"
  ) {
    throw new Error("Judge.me returned an invalid All Reviews Page response.");
  }

  return payload.all_reviews;
}

function assertSafeRuntimeMarkup(html: string): void {
  if (
    /<script\b/i.test(html) ||
    /\son[a-z][\w:-]*\s*=/i.test(html) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(html)
  ) {
    throw new Error("Judge.me returned executable All Reviews Page markup.");
  }
}

function countReviewMarkup(html: string): number {
  return (html.match(/class=["'][^"']*\bjdgm-rev\b[^"']*["']/gi) ?? []).length;
}

function normalizeReviewType(
  value: string | undefined,
): AllReviewsWidgetReviewType {
  return value === "shop-reviews" ? "shop-reviews" : "product-reviews";
}

function getAllReviewsPageSize(root: HTMLElement): number {
  const value =
    root.dataset.pageSize ??
    root.querySelector<HTMLElement>(".jdgm-all-reviews__header")?.dataset
      .perPage ??
    root.querySelector<HTMLElement>(".jdgm-paginate")?.dataset.perPage;
  const perPage = Number(value ?? "25");
  return Number.isFinite(perPage) && perPage > 0 ? perPage : 25;
}

function getExpectedReviewCount(
  root: HTMLElement,
  reviewType: AllReviewsWidgetReviewType,
): number | undefined {
  const header = root.querySelector<HTMLElement>(
    ".jdgm-all-reviews__header, .jdgm-revs-tab__content-header",
  );
  const value =
    reviewType === "shop-reviews"
      ? header?.dataset.numberOfShopReviews
      : header?.dataset.numberOfProductReviews;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : undefined;
}

function ensureAllReviewsTabSemantics(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".jdgm-subtab__name").forEach((tab) => {
    tab.setAttribute("role", "button");
    tab.tabIndex = 0;
  });
}

function ensureAllReviewsSort(
  root: HTMLElement,
  settings: JudgeMeRuntimeSettings,
): void {
  if (root.querySelector(".jdgm-sort-dropdown")) return;

  const wrapper = root.querySelector<HTMLElement>(
    ".jdgm-rev-widg__sort-wrapper",
  );
  if (!wrapper) return;

  const select = document.createElement("select");
  select.className = "jdgm-sort-dropdown";
  select.setAttribute("aria-label", "Sort reviews");

  const options: Array<[string, string, string]> = [
    ["most-recent", "widget_sorting_most_recent_text", "Most Recent"],
    ["highest-rating", "widget_sorting_highest_rating_text", "Highest Rating"],
    ["lowest-rating", "widget_sorting_lowest_rating_text", "Lowest Rating"],
    ["with-pictures", "widget_sorting_pictures_only_text", "Only Pictures"],
    ["pictures-first", "widget_sorting_pictures_first_text", "Pictures First"],
    ["videos-first", "widget_sorting_videos_first_text", "Videos First"],
    ["most-helpful", "widget_sorting_most_helpful_text", "Most Helpful"],
  ];

  options.forEach(([value, setting, fallback]) => {
    const option = document.createElement("option");
    const label = settings[setting];
    option.value = value;
    option.textContent =
      typeof label === "string" && label.trim() ? label : fallback;
    select.appendChild(option);
  });

  wrapper.appendChild(select);
}

function resetAllReviewsFilters(root: HTMLElement): void {
  root.dataset.filterRating = "";
  root.dataset.sortBy = "created_at";
  root.dataset.sortDir = "desc";
  root
    .querySelectorAll(".jdgm-histogram__row--selected")
    .forEach((row) => row.classList.remove("jdgm-histogram__row--selected"));

  const sort = root.querySelector<HTMLSelectElement>(".jdgm-sort-dropdown");
  if (sort) sort.value = "most-recent";
}

function getAllReviewsSort(value: string): {
  by: string;
  dir?: string;
} {
  return (
    {
      "highest-rating": { by: "rating", dir: "desc" },
      "lowest-rating": { by: "rating", dir: "asc" },
      "most-helpful": { by: "most_helpful" },
      "most-recent": { by: "created_at", dir: "desc" },
      "pictures-first": { by: "pictures_first" },
      "videos-first": { by: "videos_first" },
      "with-pictures": { by: "with_pictures" },
    }[value] ?? { by: "created_at", dir: "desc" }
  );
}

function getRuntimeColor(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^;{}]+\)|[a-z]+)$/i.test(value.trim())
    ? value.trim()
    : undefined;
}

function isSafeNavigationUrl(value: string): boolean {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function waitForWidgetSetup(container: HTMLElement): Promise<void> {
  await waitFor(
    () => isReviewWidgetSetup(container),
    "Judge.me did not finish initializing the Review Widget.",
  );
}

function isReviewWidgetSetup(container: HTMLElement): boolean {
  return (
    container
      .querySelector(".jdgm-review-widget")
      ?.classList.contains(SETUP_WIDGET_CLASS) ?? false
  );
}

async function waitForBadgeSetup(container: HTMLElement): Promise<void> {
  await waitFor(
    () =>
      container
        .querySelector(".jdgm-preview-badge")
        ?.classList.contains(SETUP_CLASS) ?? false,
    "Judge.me did not finish initializing the Star Rating Badge.",
  );
}

async function waitForCarouselSetup(container: HTMLElement): Promise<void> {
  await waitFor(
    () => isCarouselSetup(container),
    "Judge.me did not finish initializing the Reviews Carousel.",
  );
}

function isCarouselSetup(container: HTMLElement): boolean {
  return (
    container
      .querySelector(".jdgm-carousel")
      ?.classList.contains("jdgm-carousel--done") ?? false
  );
}

function waitFor(
  predicate: () => boolean,
  errorMessage: string,
): Promise<void> {
  if (predicate()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= RUNTIME_TIMEOUT_MS) {
        reject(new Error(errorMessage));
        return;
      }

      window.setTimeout(check, 25);
    };

    check();
  });
}
