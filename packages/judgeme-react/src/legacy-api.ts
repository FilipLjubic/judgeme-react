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

export interface LegacyReviewWidgetData {
  /** Shopify's numeric product ID, which Judge.me calls the external ID. */
  productId: string;
  /** Judge.me-owned Review Widget markup returned by the public Widget API. */
  html: string;
  /** Dashboard-generated CSS from Judge.me's settings and HTML miracle payloads. */
  styles: string;
  /** Dashboard settings consumed by Judge.me's browser runtime. */
  settings: JudgeMeRuntimeSettings;
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

interface ProductReviewResponse {
  product_external_id: number | string;
  widget: string;
}

interface SettingsResponse {
  settings: string;
}

interface HtmlMiracleResponse {
  html_miracle: string;
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
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedProductId = getShopifyNumericId(productId);
  const normalizedPublicToken = publicToken.trim();

  if (!normalizedPublicToken) {
    throw new Error("Judge.me requires a public Widget API token.");
  }

  if (!fetchImplementation) {
    throw new Error("Judge.me requires a fetch implementation.");
  }

  const commonParams = {
    shop_domain: normalizedShopDomain,
    api_token: normalizedPublicToken,
  };

  const [review, settings, htmlMiracle] = await Promise.all([
    fetchWidgetEndpoint<ProductReviewResponse>(
      "product_review",
      { ...commonParams, external_id: normalizedProductId },
      fetchImplementation,
      signal,
    ),
    fetchWidgetEndpoint<SettingsResponse>(
      "settings",
      commonParams,
      fetchImplementation,
      signal,
    ),
    fetchWidgetEndpoint<HtmlMiracleResponse>(
      "html_miracle",
      commonParams,
      fetchImplementation,
      signal,
    ),
  ]);

  if (
    typeof review.widget !== "string" ||
    String(review.product_external_id) !== normalizedProductId
  ) {
    throw new Error("Judge.me returned an invalid product Review Widget.");
  }

  if (
    typeof settings.settings !== "string" ||
    typeof htmlMiracle.html_miracle !== "string"
  ) {
    throw new Error("Judge.me returned an invalid widget settings payload.");
  }

  assertSafeWidgetMarkup(review.widget);

  return {
    productId: normalizedProductId,
    html: review.widget,
    settings: createLegacyRuntimeSettings(
      parseRuntimeSettings(settings.settings),
    ),
    styles: [
      ...extractStyleContents(settings.settings),
      ...extractStyleContents(htmlMiracle.html_miracle),
    ].join("\n"),
  };
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

function assertSafeWidgetMarkup(html: string): void {
  if (
    /<script\b/i.test(html) ||
    /\son[a-z][\w:-]*\s*=/i.test(html) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(html)
  ) {
    throw new Error("Judge.me returned executable Review Widget markup.");
  }
}

function isJsonObject(
  value: unknown,
): value is Record<string, JudgeMeJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
