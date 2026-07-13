import type {
  FloatingReviewsTabSource,
  JudgeMeRuntimeSettings,
} from "./legacy-api.js";

const JUDGE_ME_CDN_HOST = "https://cdnwidget.judge.me/";
const JUDGE_ME_API_HOST = "https://api.judge.me";
const JUDGE_ME_LOADER_URL = `${JUDGE_ME_CDN_HOST}loader.js`;
const RUNTIME_SCRIPT_SELECTOR = "script[data-judgeme-react-runtime]";
const SETUP_CLASS = "jdgm--done-setup";
const SETUP_WIDGET_CLASS = "jdgm--done-setup-widget";
const RUNTIME_TIMEOUT_MS = 15_000;

interface JudgeMeRuntime {
  API_HOST?: string;
  CDN_HOST?: string;
  PLATFORM?: string;
  PUBLIC_TOKEN?: string;
  SHOP_DOMAIN?: string;
  $?: (value: unknown) => JudgeMeRuntimeCollection;
  _customizeReviewWidget?: (root: unknown) => void;
  _renderAndSetupReviewForm?: (root: unknown) => void;
  _setupFormsSubmit?: (root: unknown) => void;
  _setupLoadReviewsEventsFor?: (root: unknown) => void;
  _setupQuestionsForm?: (root: unknown) => void;
  buildStarsFor?: (root: unknown) => void;
  caches?: {
    $revWidgets?: unknown;
  };
  customizeBadges?: () => void;
  customizeReviews?: () => void;
  initializeWidgets?: (root?: unknown) => void;
  initializeCarousel?: () => void;
  loadCSS?: (url: string) => unknown;
  loadScript?: (url: string) => unknown;
  setupMediaGallery?: (root: unknown) => void;
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
const floatingTabDisposers = new WeakMap<HTMLElement, () => void>();

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

export interface InitializeFloatingReviewsTabOptions {
  container: HTMLElement;
  position: "bottom" | "left" | "right";
  publicToken: string;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  source: FloatingReviewsTabSource;
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

/** Loads Judge.me's review helpers and binds one SPA-safe floating tab. */
export async function initializeFloatingReviewsTab({
  container,
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

function isFloatingTabRuntimeReady(
  runtime: JudgeMeRuntime | undefined,
): runtime is Required<
  Pick<
    JudgeMeRuntime,
    "$" | "buildStarsFor" | "customizeReviews" | "setupMediaGallery"
  >
> &
  JudgeMeRuntime {
  return Boolean(
    runtime &&
      typeof runtime.$ === "function" &&
      typeof runtime.buildStarsFor === "function" &&
      typeof runtime.customizeReviews === "function" &&
      typeof runtime.setupMediaGallery === "function",
  );
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
    ensureFloatingFallbackSort(root, settings);
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
  const closeButton = root.querySelector<HTMLElement>(".jdgm-close-ico");
  const mask = root.querySelector<HTMLElement>(".jdgm-mask");

  if (!container || !wrapper || !button) {
    throw new Error("Judge.me returned incomplete Floating Reviews Tab markup.");
  }

  floatingTabDisposers.get(container)?.();

  const open = () => {
    const urlEnabled = settings.floating_tab_url_enabled === true;
    const url = settings.floating_tab_url;

    if (urlEnabled && typeof url === "string" && isSafeNavigationUrl(url)) {
      window.location.assign(url);
      return;
    }

    wrapper.classList.add("jdgm-show");
    document.body.classList.add("jdgm-lock-scroll");
    if (settings.widget_theme === "carousel") {
      window.dispatchEvent(new Event("resize"));
    }
  };
  const close = () => {
    wrapper.classList.remove("jdgm-show");
    document.body.classList.remove("jdgm-lock-scroll");
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && wrapper.classList.contains("jdgm-show")) {
      close();
      button.focus();
    }
  };
  const handleFallbackClick = (event: Event) => {
    if (options.source !== "all-reviews-page-fallback") return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const subtab = target.closest<HTMLElement>(".jdgm-subtab__name");
    const loadMore = target.closest<HTMLElement>(
      ".jdgm-paginate__load-more",
    );
    const histogramRow = target.closest<HTMLElement>(
      ".jdgm-histogram__row",
    );

    if (!subtab && !loadMore && !histogramRow) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (subtab) {
      const reviewType = normalizeReviewType(subtab.dataset.tabname);
      resetFloatingFallbackFilters(root);
      void loadFloatingTabFallbackPage({
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

    if (histogramRow) {
      const rating = histogramRow.getAttribute("data-rating");
      const filterRating = /^[1-5]$/.test(rating ?? "") ? rating ?? "" : "";
      root.dataset.filterRating = filterRating;
      root
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
        reviewType: normalizeReviewType(root.dataset.reviewType),
        root,
        runtime,
        shopDomain: options.shopDomain,
      });
      return;
    }

    const page = Number(loadMore?.dataset.page ?? root.dataset.page ?? "1");
    void loadFloatingTabFallbackPage({
      append: true,
      page: Number.isFinite(page) && page > 1 ? page : 2,
      publicToken: options.publicToken,
      reviewType: normalizeReviewType(root.dataset.reviewType),
      root,
      runtime,
      shopDomain: options.shopDomain,
    });
  };
  const handleFallbackChange = (event: Event) => {
    if (options.source !== "all-reviews-page-fallback") return;

    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches(".jdgm-sort-dropdown")) return;

    event.stopImmediatePropagation();
    const sort = getFloatingFallbackSort(target.value);
    root.dataset.sortBy = sort.by;
    root.dataset.sortDir = sort.dir ?? "";
    void loadFloatingTabFallbackPage({
      append: false,
      page: 1,
      publicToken: options.publicToken,
      reviewType: normalizeReviewType(root.dataset.reviewType),
      root,
      runtime,
      shopDomain: options.shopDomain,
    });
  };

  button.addEventListener("click", open);
  closeButton?.addEventListener("click", close);
  mask?.addEventListener("click", close);
  document.addEventListener("keydown", handleKeydown, true);
  root.addEventListener("click", handleFallbackClick, true);
  root.addEventListener("change", handleFallbackChange, true);

  floatingTabDisposers.set(container, () => {
    button.removeEventListener("click", open);
    closeButton?.removeEventListener("click", close);
    mask?.removeEventListener("click", close);
    document.removeEventListener("keydown", handleKeydown, true);
    root.removeEventListener("click", handleFallbackClick, true);
    root.removeEventListener("change", handleFallbackChange, true);
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
  reviewType: "product-reviews" | "shop-reviews";
  root: HTMLElement;
  runtime: Required<
    Pick<JudgeMeRuntime, "$" | "customizeReviews" | "setupMediaGallery">
  > &
    JudgeMeRuntime;
  shopDomain: string;
}): Promise<void> {
  const reviews = root.querySelector<HTMLElement>(".jdgm-revs-tab__reviews");
  const spinner = root.querySelector<HTMLElement>(".jdgm-revs-tab__spinner");
  const loadMore = root.querySelector<HTMLElement>(
    ".jdgm-paginate__load-more",
  );

  if (!reviews) return;

  root.dataset.judgemeReactFallbackStatus = "loading";
  spinner?.style.setProperty("display", "block");
  if (!append) reviews.style.display = "none";

  try {
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

    const response = await fetch(url, {headers: {Accept: "application/json"}});
    if (!response.ok) {
      throw new Error(
        `Judge.me all_reviews_page request failed with HTTP ${response.status}.`,
      );
    }

    const payload: unknown = await response.json();
    const html = getAllReviewsPageHtml(payload);
    assertSafeRuntimeMarkup(html);

    if (append) {
      reviews.insertAdjacentHTML("beforeend", html);
    } else {
      reviews.innerHTML = html;
    }

    const reviewCount = countReviewMarkup(html);
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
      loadMore.style.display = reviewCount < 25 ? "none" : "";
    }

    runtime.customizeReviews();
    runtime.setupMediaGallery(runtime.$(reviews));
    root.dataset.judgemeReactFallbackStatus = "ready";
  } catch (error) {
    root.dataset.judgemeReactFallbackStatus = "error";
    console.error("Judge.me Floating Reviews Tab fallback request error", error);
  } finally {
    spinner?.style.setProperty("display", "none");
    reviews.style.display = "";
  }
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
  return (html.match(/class=["'][^"']*\bjdgm-rev\b[^"']*["']/gi) ?? [])
    .length;
}

function normalizeReviewType(
  value: string | undefined,
): "product-reviews" | "shop-reviews" {
  return value === "shop-reviews" ? "shop-reviews" : "product-reviews";
}

function ensureFloatingFallbackSort(
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

function resetFloatingFallbackFilters(root: HTMLElement): void {
  root.dataset.filterRating = "";
  root.dataset.sortBy = "created_at";
  root.dataset.sortDir = "desc";
  root
    .querySelectorAll(".jdgm-histogram__row--selected")
    .forEach((row) => row.classList.remove("jdgm-histogram__row--selected"));

  const sort = root.querySelector<HTMLSelectElement>(".jdgm-sort-dropdown");
  if (sort) sort.value = "most-recent";
}

function getFloatingFallbackSort(value: string): {
  by: string;
  dir?: string;
} {
  return (
    {
      "highest-rating": {by: "rating", dir: "desc"},
      "lowest-rating": {by: "rating", dir: "asc"},
      "most-helpful": {by: "most_helpful"},
      "most-recent": {by: "created_at", dir: "desc"},
      "pictures-first": {by: "pictures_first"},
      "videos-first": {by: "videos_first"},
      "with-pictures": {by: "with_pictures"},
    }[value] ?? {by: "created_at", dir: "desc"}
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

function waitFor(predicate: () => boolean, errorMessage: string): Promise<void> {
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
