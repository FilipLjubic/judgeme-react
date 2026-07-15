const JUDGE_ME_CACHE_HOST = "https://cache.judge.me";
const dashboardStylePromises = new Map<string, Promise<void>>();

interface JudgeMeDashboardStyleResponse {
  html_miracle?: unknown;
  settings?: unknown;
}

interface StyleDocument {
  createElement(tagName: "style"): HTMLStyleElement;
  head: Pick<HTMLHeadElement, "appendChild">;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
}

export interface EnsureJudgeMeDashboardStylesOptions {
  document?: StyleDocument;
  fetch?: typeof globalThis.fetch;
  publicToken?: string;
  shopDomain: string;
  /** Server-fetched Judge.me dashboard CSS, when it is already in loader data. */
  styles?: string;
}

/**
 * Ensures the shared Judge.me dashboard stylesheet exists before an exact
 * widget mounts. Loader-provided CSS wins; otherwise the public storefront
 * cache is read once per shop in the browser.
 */
export function ensureJudgeMeDashboardStyles({
  document: styleDocument = globalThis.document,
  fetch: fetchImplementation = globalThis.fetch,
  publicToken,
  shopDomain,
  styles,
}: EnsureJudgeMeDashboardStylesOptions): Promise<void> {
  if (!styleDocument) return Promise.resolve();

  if (styles?.trim()) {
    installDashboardStyles(styleDocument, shopDomain, styles);
    const ready = Promise.resolve();
    dashboardStylePromises.set(shopDomain, ready);
    return ready;
  }

  if (hasDashboardStyles(styleDocument, shopDomain)) {
    return Promise.resolve();
  }

  const existing = dashboardStylePromises.get(shopDomain);
  if (existing) return existing;

  const promise = fetchDashboardStyles({
    fetchImplementation,
    publicToken,
    shopDomain,
  })
    .then((css) => {
      if (!hasDashboardStyles(styleDocument, shopDomain)) {
        installDashboardStyles(styleDocument, shopDomain, css);
      }
    })
    .catch((error) => {
      dashboardStylePromises.delete(shopDomain);
      throw error;
    });

  dashboardStylePromises.set(shopDomain, promise);
  return promise;
}

async function fetchDashboardStyles({
  fetchImplementation,
  publicToken,
  shopDomain,
}: {
  fetchImplementation: typeof globalThis.fetch;
  publicToken?: string;
  shopDomain: string;
}): Promise<string> {
  const url = new URL(
    `/widgets/shopify/${encodeURIComponent(shopDomain)}`,
    JUDGE_ME_CACHE_HOST,
  );
  const normalizedToken = publicToken?.trim();
  if (normalizedToken) url.searchParams.set("public_token", normalizedToken);

  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `Judge.me dashboard stylesheet request failed with HTTP ${response.status}.`,
    );
  }

  let payload: JudgeMeDashboardStyleResponse;
  try {
    payload = (await response.json()) as JudgeMeDashboardStyleResponse;
  } catch {
    throw new Error("Judge.me dashboard stylesheet response was invalid JSON.");
  }

  const css = [payload.settings, payload.html_miracle]
    .flatMap((html) =>
      typeof html === "string" ? extractStyleContents(html) : [],
    )
    .join("\n");
  if (!css.trim()) {
    throw new Error("Judge.me dashboard stylesheet response contained no CSS.");
  }

  return css;
}

function extractStyleContents(html: string): string[] {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1],
  );
}

function hasDashboardStyles(
  styleDocument: StyleDocument,
  shopDomain: string,
): boolean {
  return Array.from(
    styleDocument.querySelectorAll<HTMLStyleElement>(
      "style[data-judgeme-react-dashboard-styles], style[data-judgeme-react-styles='legacy-widgets']",
    ),
  ).some(
    (style) =>
      style.dataset.judgemeReactDashboardStyles === shopDomain ||
      style.dataset.judgemeReactStyles === "legacy-widgets",
  );
}

function installDashboardStyles(
  styleDocument: StyleDocument,
  shopDomain: string,
  css: string,
): void {
  if (hasDashboardStyles(styleDocument, shopDomain)) return;

  const style = styleDocument.createElement("style");
  const nonceSource = styleDocument.querySelector<HTMLElement>("[nonce]");
  if (nonceSource?.nonce) style.nonce = nonceSource.nonce;
  style.dataset.judgemeReactDashboardStyles = shopDomain;
  style.dataset.judgemeReactStyles = "legacy-widgets";
  style.textContent = css;
  styleDocument.head.appendChild(style);
}
