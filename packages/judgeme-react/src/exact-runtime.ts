import type { JudgeMeRuntimeSettings } from "./legacy-api.js";
import type { ReviewsGridData } from "./reviews-grid-api.js";

const JUDGE_ME_API_HOST = "https://api.judge.me";
const JUDGE_ME_CDN_API_HOST = "https://cdn.judge.me/";
const REVIEWS_GRID_ENTRY_KEY = "reviews-grid-widget/main.js";
const REVIEWS_GRID_ENTRY_FILE = "reviews_grid.js";
const EXACT_RUNTIME_TIMEOUT_MS = 15_000;

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

interface ExactJudgeMeWindow extends Window {
  jdgm?: ExactJudgeMeRuntime;
  judgeme?: ExactJudgeMeRuntime;
  jdgmSettings?: JudgeMeRuntimeSettings;
}

export interface InitializeReviewsGridOptions {
  assetBaseUrl: string;
  container: HTMLElement;
  data: ReviewsGridData;
  publicToken?: string;
}

let exactRuntimeShopDomain: string | undefined;
let exactRuntimeAssetBaseUrl: string | undefined;
let moduleInstance = 0;
const manifestPromises = new Map<string, Promise<ViteManifest>>();
const stylesheetPromises = new Map<string, Promise<void>>();
const reviewsGridInitializers = new WeakMap<HTMLElement, Promise<void>>();

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

async function initializeReviewsGridRoot({
  assetBaseUrl,
  container,
  data,
  publicToken,
}: InitializeReviewsGridOptions): Promise<void> {
  if (typeof window === "undefined") return;

  const runtimeWindow = configureExactRuntime({
    assetBaseUrl,
    data,
    publicToken,
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

function configureExactRuntime({
  assetBaseUrl,
  data,
  publicToken,
}: {
  assetBaseUrl: string;
  data: ReviewsGridData;
  publicToken?: string;
}): ExactJudgeMeWindow {
  const runtimeWindow = window as ExactJudgeMeWindow;

  if (exactRuntimeShopDomain && exactRuntimeShopDomain !== data.shopDomain) {
    throw new Error(
      "Judge.me cannot initialize two Shopify stores in one browser document.",
    );
  }

  if (exactRuntimeAssetBaseUrl && exactRuntimeAssetBaseUrl !== assetBaseUrl) {
    throw new Error(
      "Judge.me cannot initialize two v3 extension deployments in one browser document.",
    );
  }

  exactRuntimeShopDomain = data.shopDomain;
  exactRuntimeAssetBaseUrl = assetBaseUrl;
  runtimeWindow.jdgmSettings ??= data.settings;

  const runtime: ExactJudgeMeRuntime = {
    ...runtimeWindow.jdgm,
    API_HOST: JUDGE_ME_API_HOST,
    CDN_API_HOST: JUDGE_ME_CDN_API_HOST,
    CDN_BASE_URL: assetBaseUrl,
    PLATFORM: "shopify",
    PUBLIC_TOKEN: publicToken,
    SHOP_DOMAIN: data.shopDomain,
  };
  runtime.data = {
    ...runtime.data,
    reviewsGridWidget: createReviewsGridBootstrap(data),
  };
  runtimeWindow.jdgm = runtime;
  runtimeWindow.judgeme = runtime;

  return runtimeWindow;
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

function isReviewsGridReady(container: HTMLElement): boolean {
  return (
    container.classList.contains("jdgm-widget-revamp") &&
    container.childElementCount > 0
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
