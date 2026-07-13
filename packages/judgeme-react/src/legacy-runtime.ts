import type { JudgeMeRuntimeSettings } from "./legacy-api.js";

const JUDGE_ME_CDN_HOST = "https://cdnwidget.judge.me/";
const JUDGE_ME_API_HOST = "https://api.judge.me";
const JUDGE_ME_LOADER_URL = `${JUDGE_ME_CDN_HOST}loader.js`;
const RUNTIME_SCRIPT_SELECTOR = "script[data-judgeme-react-runtime]";
const SETUP_WIDGET_CLASS = "jdgm--done-setup-widget";
const RUNTIME_TIMEOUT_MS = 15_000;

interface JudgeMeRuntime {
  API_HOST?: string;
  CDN_HOST?: string;
  PLATFORM?: string;
  PUBLIC_TOKEN?: string;
  SHOP_DOMAIN?: string;
  $?: (value: unknown) => unknown;
  _customizeReviewWidget?: (root: unknown) => void;
  _renderAndSetupReviewForm?: (root: unknown) => void;
  _setupFormsSubmit?: (root: unknown) => void;
  _setupLoadReviewsEventsFor?: (root: unknown) => void;
  _setupQuestionsForm?: (root: unknown) => void;
  customizeReviews?: () => void;
  initializeWidgets?: (root?: unknown) => void;
  setupMediaGallery?: (root: unknown) => void;
}

interface JudgeMeWindow extends Window {
  jdgm?: JudgeMeRuntime;
  jdgmSettings?: JudgeMeRuntimeSettings;
}

let runtimeShopDomain: string | undefined;
let loaderPromise: Promise<void> | undefined;

export interface InitializeLegacyReviewWidgetOptions {
  container: HTMLElement;
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

  await loadRuntimeScript();
  await initializeContainer(runtimeWindow, container);
  await waitForWidgetSetup(container);
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
  await waitFor(
    () => isReviewRuntimeReady(runtimeWindow.jdgm),
    "Judge.me's widget initializer did not become ready.",
  );

  const runtime = runtimeWindow.jdgm;

  if (!runtime?.initializeWidgets || !runtime.$) return;

  runtime.initializeWidgets(runtime.$(container));
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

async function waitForWidgetSetup(container: HTMLElement): Promise<void> {
  await waitFor(
    () =>
      container
        .querySelector(".jdgm-review-widget")
        ?.classList.contains(SETUP_WIDGET_CLASS) ?? false,
    "Judge.me did not finish initializing the Review Widget.",
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
