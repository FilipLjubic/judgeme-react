import { normalizeShopDomain } from "./config.js";
import type { JudgeMeRuntimeSettings } from "./legacy-api.js";

const JUDGE_ME_API = "https://api.judge.me";
const AI_REVIEWS_SUMMARY_ADMIN_QUERY = `#graphql
  query JudgeMeAiReviewsSummaryMetafield {
    shop {
      summary: metafield(
        namespace: "judgeme"
        key: "store_summary_widget_data"
      ) {
        value
      }
    }
  }
`;

export type AiReviewsSummaryTheme = "accordion" | "button" | "expanded";
export type AiReviewsSummaryVisibility = "hidden" | "shown" | "when_click";
export type AiReviewsSummaryTextSize = "default" | "large" | "extra_large";
export type AiReviewsSummaryAlignment = "center" | "left";
export type AiReviewsSummaryCornerStyle =
  "extra_round" | "round" | "soft" | "square";
export type AiReviewsSummarySentiment = "negative" | "neutral" | "positive";
export type AiReviewsSummarySource = "fixture" | "metafield";

export interface AiReviewsSummaryKeyword {
  keyword: string;
  sentiment: AiReviewsSummarySentiment;
}

export interface AiReviewsSummaryPayload {
  averageRating: number;
  reviewCount: number;
  summaryText: string;
  summaryTranslations: Readonly<Record<string, string>>;
  keywords: readonly AiReviewsSummaryKeyword[];
}

export interface AiReviewsSummaryConfig {
  theme: AiReviewsSummaryTheme;
  showKeywords: boolean;
  showButton: boolean;
  keywordsVisibility: AiReviewsSummaryVisibility;
  buttonVisibility: AiReviewsSummaryVisibility;
  titleSize: AiReviewsSummaryTextSize;
  textSize: AiReviewsSummaryTextSize;
  alignment: AiReviewsSummaryAlignment;
  cornerStyle: AiReviewsSummaryCornerStyle;
  maxWidth: number;
  headingText: string;
  buttonText: string;
  widgetColor: string;
  textColor: string;
  lighterTextColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonThemeColor: string;
  buttonThemeTextColor: string;
  showSentimentColors: boolean;
}

export interface AiReviewsSummaryData {
  config: AiReviewsSummaryConfig;
  payload: AiReviewsSummaryPayload;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  source: AiReviewsSummarySource;
  /** Shared dashboard CSS used by Judge.me's exact runtime and icon fonts. */
  styles?: string;
}

export interface AiReviewsSummaryStatus {
  generating: boolean;
  hasSufficientReviews: boolean;
}

export interface CreateAiReviewsSummaryDataOptions {
  config?: Partial<AiReviewsSummaryConfig>;
  metafieldValue: unknown;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
  source?: AiReviewsSummarySource;
  styles?: string;
}

export interface FetchAiReviewsSummaryStatusOptions {
  shopDomain: string;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}

export interface FetchAiReviewsSummaryMetafieldOptions {
  /** Shopify Admin API token. This option is server-only and must never be serialized. */
  adminAccessToken: string;
  /** Stable Shopify Admin API version, for example `2026-04`. */
  apiVersion: string;
  fetch?: typeof globalThis.fetch;
  shopDomain: string;
  signal?: AbortSignal;
}

const DEFAULT_AI_REVIEWS_SUMMARY_CONFIG: AiReviewsSummaryConfig = {
  theme: "expanded",
  showKeywords: true,
  showButton: true,
  keywordsVisibility: "shown",
  buttonVisibility: "hidden",
  titleSize: "default",
  textSize: "default",
  alignment: "left",
  cornerStyle: "soft",
  maxWidth: 1100,
  headingText: "",
  buttonText: "",
  widgetColor: "#F9F9F9",
  textColor: "#000000",
  lighterTextColor: "#787878",
  buttonColor: "#108474",
  buttonTextColor: "#FFFFFF",
  buttonThemeColor: "#FFFFFF",
  buttonThemeTextColor: "#000000",
  showSentimentColors: false,
};

/**
 * Converts Judge.me's `shop.metafields.judgeme.store_summary_widget_data`
 * value into the small, serializable shape consumed by the React adapter.
 */
export function parseAiReviewsSummaryMetafield(
  metafieldValue: unknown,
): AiReviewsSummaryPayload | null {
  if (metafieldValue === null || metafieldValue === undefined) return null;

  let raw: unknown = metafieldValue;
  if (typeof raw === "string") {
    if (!raw.trim()) return null;

    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("Judge.me returned invalid AI Reviews Summary JSON.");
    }
  }

  if (!isRecord(raw)) {
    throw new Error("Judge.me returned invalid AI Reviews Summary data.");
  }

  const averageRating = readFiniteNumber(raw.average_rating);
  const reviewCount = readFiniteNumber(raw.number_of_reviews);
  const summaryText = readNonEmptyString(raw.ai_summary_text);

  if (
    averageRating === null ||
    averageRating < 0 ||
    averageRating > 5 ||
    reviewCount === null ||
    !Number.isSafeInteger(reviewCount) ||
    reviewCount < 0 ||
    !summaryText
  ) {
    throw new Error("Judge.me returned invalid AI Reviews Summary data.");
  }

  const keywords = normalizeKeywords(raw.keywords);
  const summaryTranslations = normalizeTranslations(
    raw.ai_summary_translations,
  );

  return {
    averageRating,
    reviewCount,
    summaryText,
    summaryTranslations,
    keywords,
  };
}

/** Combines a generated metafield value with block and dashboard settings. */
export function createAiReviewsSummaryData({
  config,
  metafieldValue,
  settings,
  shopDomain,
  source = "metafield",
  styles,
}: CreateAiReviewsSummaryDataOptions): AiReviewsSummaryData | null {
  const payload = parseAiReviewsSummaryMetafield(metafieldValue);
  if (!payload) return null;

  return {
    config: normalizeAiReviewsSummaryConfig(config),
    payload,
    settings,
    shopDomain: normalizeShopDomain(shopDomain),
    source,
    styles,
  };
}

/**
 * Reads Judge.me's summary metafield through Shopify Admin GraphQL when the
 * metafield definition is not Storefront-visible. The private token remains in
 * the request header and the helper returns only the public JSON value.
 */
export async function fetchAiReviewsSummaryMetafield({
  adminAccessToken,
  apiVersion,
  fetch: fetchImplementation = globalThis.fetch,
  shopDomain,
  signal,
}: FetchAiReviewsSummaryMetafieldOptions): Promise<string | null> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedAccessToken = adminAccessToken.trim();
  const normalizedApiVersion = apiVersion.trim();

  if (!normalizedAccessToken) {
    throw new Error(
      "Shopify Admin access is required for AI Reviews Summary data.",
    );
  }
  if (!/^\d{4}-(?:01|04|07|10)$/.test(normalizedApiVersion)) {
    throw new Error(
      "AI Reviews Summary requires a stable Shopify Admin API version.",
    );
  }

  const response = await fetchImplementation(
    new URL(
      `/admin/api/${normalizedApiVersion}/graphql.json`,
      `https://${normalizedShopDomain}`,
    ),
    {
      body: JSON.stringify({ query: AI_REVIEWS_SUMMARY_ADMIN_QUERY }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": normalizedAccessToken,
      },
      method: "POST",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Shopify AI Reviews Summary metafield request failed with HTTP ${response.status}.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "Shopify returned invalid AI Reviews Summary metafield JSON.",
    );
  }

  if (!isRecord(payload)) {
    throw new Error(
      "Shopify returned invalid AI Reviews Summary metafield data.",
    );
  }
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error("Shopify could not read the AI Reviews Summary metafield.");
  }

  const data = isRecord(payload.data) ? payload.data : null;
  const shop = data && isRecord(data.shop) ? data.shop : null;
  if (!shop) {
    throw new Error(
      "Shopify returned incomplete AI Reviews Summary metafield data.",
    );
  }

  if (shop.summary === null || shop.summary === undefined) return null;
  if (!isRecord(shop.summary) || typeof shop.summary.value !== "string") {
    throw new Error(
      "Shopify returned invalid AI Reviews Summary metafield data.",
    );
  }

  return shop.summary.value;
}

/** Normalizes the settings emitted as `data-*` attributes by the app block. */
export function normalizeAiReviewsSummaryConfig(
  config: Partial<AiReviewsSummaryConfig> = {},
): AiReviewsSummaryConfig {
  const normalized = {
    ...DEFAULT_AI_REVIEWS_SUMMARY_CONFIG,
    ...config,
    headingText:
      config.headingText === undefined
        ? DEFAULT_AI_REVIEWS_SUMMARY_CONFIG.headingText
        : config.headingText.trim(),
    buttonText:
      config.buttonText === undefined
        ? DEFAULT_AI_REVIEWS_SUMMARY_CONFIG.buttonText
        : config.buttonText.trim(),
  };

  if (
    !Number.isSafeInteger(normalized.maxWidth) ||
    normalized.maxWidth < 320 ||
    normalized.maxWidth > 2_000
  ) {
    throw new Error(
      "Judge.me AI Reviews Summary maximum width must be between 320 and 2000.",
    );
  }

  for (const [name, value] of Object.entries({
    widgetColor: normalized.widgetColor,
    textColor: normalized.textColor,
    lighterTextColor: normalized.lighterTextColor,
    buttonColor: normalized.buttonColor,
    buttonTextColor: normalized.buttonTextColor,
    buttonThemeColor: normalized.buttonThemeColor,
    buttonThemeTextColor: normalized.buttonThemeTextColor,
  })) {
    if (!value.trim()) {
      throw new Error(`Judge.me AI Reviews Summary ${name} cannot be empty.`);
    }
  }

  return normalized;
}

/** Reads the public generation state used by Judge.me's theme-editor notice. */
export async function fetchAiReviewsSummaryStatus({
  shopDomain,
  signal,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchAiReviewsSummaryStatusOptions): Promise<AiReviewsSummaryStatus> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const url = new URL("/store_summary/status", JUDGE_ME_API);
  url.searchParams.set("shop_domain", normalizedShopDomain);
  url.searchParams.set("platform", "shopify");

  const response = await fetchImplementation(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Judge.me AI Reviews Summary status request failed with HTTP ${response.status}.`,
    );
  }

  const raw = (await response.json()) as unknown;
  if (
    !isRecord(raw) ||
    typeof raw.generating !== "boolean" ||
    typeof raw.has_sufficient_reviews !== "boolean"
  ) {
    throw new Error("Judge.me returned invalid AI Reviews Summary status.");
  }

  return {
    generating: raw.generating,
    hasSufficientReviews: raw.has_sufficient_reviews,
  };
}

function normalizeKeywords(value: unknown): AiReviewsSummaryKeyword[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const keyword = readNonEmptyString(item.keyword);
    const sentiment = item.sentiment;
    if (
      !keyword ||
      (sentiment !== "positive" &&
        sentiment !== "neutral" &&
        sentiment !== "negative")
    ) {
      return [];
    }

    return [{ keyword, sentiment }];
  });
}

function normalizeTranslations(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) return {};

  const translations: Record<string, string> = {};
  for (const [locale, translation] of Object.entries(value)) {
    if (typeof translation === "string" && translation.trim()) {
      translations[locale] = translation.trim();
    }
  }

  return translations;
}

function readFiniteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
