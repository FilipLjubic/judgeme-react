import { normalizeShopDomain } from "./config.js";
import type { JudgeMeRuntimeSettings } from "./legacy-api.js";

const TRUST_BADGE_ADMIN_QUERY = `#graphql
  query JudgeMeTrustBadgeMetafields {
    shop {
      enabled: metafield(namespace: "judgeme", key: "trust_badge.enabled") {
        value
      }
      structure: metafield(namespace: "judgeme", key: "trust_badge.structure") {
        value
      }
      color: metafield(namespace: "judgeme", key: "trust_badge.color") {
        value
      }
      star: metafield(namespace: "judgeme", key: "trust_badge.star") {
        value
      }
      verifiedReviewsCount: metafield(
        namespace: "judgeme"
        key: "trust_badge.verified_reviews_count"
      ) {
        value
      }
      verifiedAverageRating: metafield(
        namespace: "judgeme"
        key: "trust_badge.verified_average_rating"
      ) {
        value
      }
      totalReviewsCount: metafield(
        namespace: "judgeme"
        key: "trust_badge.total_reviews_count"
      ) {
        value
      }
      modalData: metafield(
        namespace: "judgeme"
        key: "trust_badge.modal_data"
      ) {
        value
      }
    }
  }
`;

export type TrustBadgeStructure = "default" | "filled" | "outline";
export type TrustBadgeColor = "black" | "brand" | "default" | "white";
export type TrustBadgeAlignment = "center" | "left" | "right";
export type TrustBadgeSentiment = "negative" | "neutral" | "positive";
export type TrustBadgeSource = "disabled-preview" | "metafield";

export interface TrustBadgeConfig {
  alignment: TrustBadgeAlignment;
  color: TrustBadgeColor;
  star: TrustBadgeColor;
  structure: TrustBadgeStructure;
}

export interface TrustBadgeShopDefaults {
  color: Exclude<TrustBadgeColor, "default">;
  star: Exclude<TrustBadgeColor, "default">;
  structure: Exclude<TrustBadgeStructure, "default">;
}

export interface TrustBadgeBadgeData {
  isCertified: boolean;
  totalReviewsCount: number;
  verifiedAverageRating: number;
  verifiedReviewsCount: number;
}

export interface TrustBadgeAiSummary {
  lastUpdated: string;
  text: string;
}

export interface TrustBadgeSentimentTag {
  name: string;
  sentiment: TrustBadgeSentiment;
}

export interface TrustBadgeRatingDistribution {
  "1_star": number;
  "2_star": number;
  "3_star": number;
  "4_star": number;
  "5_star": number;
}

export interface TrustBadgeModalData {
  aiSummary: TrustBadgeAiSummary | null;
  averageRating: number;
  isCertified: boolean;
  memberSince: string | null;
  ratingDistribution: TrustBadgeRatingDistribution;
  sentimentTags: readonly TrustBadgeSentimentTag[];
  shopLogoUrl: string | null;
  shopName: string;
  totalReviewsCount: number;
  verifiedReviewsCount: number;
}

export interface TrustBadgeMetafields {
  color: string | null;
  enabled: string;
  modalData: string | null;
  star: string | null;
  structure: string | null;
  totalReviewsCount: string | null;
  verifiedAverageRating: string | null;
  verifiedReviewsCount: string | null;
}

export interface TrustBadgeData {
  badge: TrustBadgeBadgeData;
  config: TrustBadgeConfig;
  /** False only when the caller deliberately requested a disabled preview. */
  enabled: boolean;
  modal: TrustBadgeModalData;
  settings: JudgeMeRuntimeSettings;
  shopDefaults: TrustBadgeShopDefaults;
  shopDomain: string;
  source: TrustBadgeSource;
}

export interface FetchTrustBadgeMetafieldsOptions {
  /** Shopify Admin API token. This option is server-only and must never be serialized. */
  adminAccessToken: string;
  /** Stable Shopify Admin API version, for example `2026-04`. */
  apiVersion: string;
  fetch?: typeof globalThis.fetch;
  shopDomain: string;
  signal?: AbortSignal;
}

export interface CreateTrustBadgeDataOptions {
  config?: Partial<TrustBadgeConfig>;
  metafields: TrustBadgeMetafields | null | undefined;
  /** Renders real metafield data for a clearly labeled theme-editor-style preview. */
  previewWhenDisabled?: boolean;
  settings: JudgeMeRuntimeSettings;
  shopDomain: string;
}

const DEFAULT_TRUST_BADGE_CONFIG: TrustBadgeConfig = {
  alignment: "left",
  color: "default",
  star: "default",
  structure: "default",
};

/**
 * Reads Judge.me's Trust Badge shop metafields with a server-only Shopify Admin
 * token. The token is sent only in the request header and is never returned.
 */
export async function fetchTrustBadgeMetafields({
  adminAccessToken,
  apiVersion,
  fetch: fetchImplementation = globalThis.fetch,
  shopDomain,
  signal,
}: FetchTrustBadgeMetafieldsOptions): Promise<TrustBadgeMetafields | null> {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const normalizedAccessToken = adminAccessToken.trim();
  const normalizedApiVersion = apiVersion.trim();

  if (!normalizedAccessToken) {
    throw new Error("Shopify Admin access is required for Trust Badge data.");
  }
  if (!/^\d{4}-(?:01|04|07|10)$/.test(normalizedApiVersion)) {
    throw new Error("Trust Badge requires a stable Shopify Admin API version.");
  }
  if (!fetchImplementation) {
    throw new Error("Trust Badge requires a fetch implementation.");
  }

  const url = new URL(
    `/admin/api/${normalizedApiVersion}/graphql.json`,
    `https://${normalizedShopDomain}`,
  );
  const request = fetchImplementation;
  const response = await request(url, {
    body: JSON.stringify({ query: TRUST_BADGE_ADMIN_QUERY }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": normalizedAccessToken,
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Shopify Trust Badge metafield request failed with HTTP ${response.status}.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Shopify returned invalid Trust Badge metafield JSON.");
  }

  if (!isRecord(payload)) {
    throw new Error("Shopify returned invalid Trust Badge metafield data.");
  }
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error("Shopify could not read the Trust Badge metafields.");
  }

  const data = isRecord(payload.data) ? payload.data : null;
  const shop = data && isRecord(data.shop) ? data.shop : null;
  if (!shop) {
    throw new Error("Shopify returned incomplete Trust Badge metafield data.");
  }

  const enabled = readMetafieldValue(shop.enabled, "enabled");
  if (enabled === null) return null;

  return {
    color: readMetafieldValue(shop.color, "color"),
    enabled,
    modalData: readMetafieldValue(shop.modalData, "modal data"),
    star: readMetafieldValue(shop.star, "star"),
    structure: readMetafieldValue(shop.structure, "structure"),
    totalReviewsCount: readMetafieldValue(
      shop.totalReviewsCount,
      "total review count",
    ),
    verifiedAverageRating: readMetafieldValue(
      shop.verifiedAverageRating,
      "verified average rating",
    ),
    verifiedReviewsCount: readMetafieldValue(
      shop.verifiedReviewsCount,
      "verified review count",
    ),
  };
}

/** Combines the private Admin read with public settings and block overrides. */
export function createTrustBadgeData({
  config,
  metafields,
  previewWhenDisabled = false,
  settings,
  shopDomain,
}: CreateTrustBadgeDataOptions): TrustBadgeData | null {
  if (!metafields) return null;

  const enabled = readBoolean(metafields.enabled, "enabled");
  if (!enabled && !previewWhenDisabled) return null;

  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const shopDefaults = normalizeShopDefaults(metafields);
  const normalizedConfig = normalizeTrustBadgeConfig(config);
  const verifiedAverageRating = readRating(
    metafields.verifiedAverageRating,
    "verified average rating",
  );
  const verifiedReviewsCount = readCount(
    metafields.verifiedReviewsCount,
    "verified review count",
  );
  const totalReviewsCount = readCount(
    metafields.totalReviewsCount,
    "total review count",
  );

  if (verifiedReviewsCount === 0) return null;
  if (totalReviewsCount < verifiedReviewsCount) {
    throw new Error(
      "Judge.me returned inconsistent Trust Badge review counts.",
    );
  }

  const modal = normalizeTrustBadgeModal(
    metafields.modalData,
    normalizedShopDomain,
  );
  const effectiveStructure = resolveAxis(
    normalizedConfig.structure,
    shopDefaults.structure,
  );
  const effectiveColor = resolveAxis(
    normalizedConfig.color,
    shopDefaults.color,
  );
  const effectiveStar = resolveAxis(normalizedConfig.star, shopDefaults.star);

  if (effectiveStructure === "filled" && effectiveColor === effectiveStar) {
    throw new Error(
      "Judge.me Trust Badge filled color and star color must differ.",
    );
  }

  return {
    badge: {
      isCertified: modal.isCertified,
      totalReviewsCount,
      verifiedAverageRating,
      verifiedReviewsCount,
    },
    config: normalizedConfig,
    enabled,
    modal,
    settings,
    shopDefaults,
    shopDomain: normalizedShopDomain,
    source: enabled ? "metafield" : "disabled-preview",
  };
}

/** Normalizes the four Trust Badge controls exposed by Shopify's theme editor. */
export function normalizeTrustBadgeConfig(
  config: Partial<TrustBadgeConfig> = {},
): TrustBadgeConfig {
  const normalized = { ...DEFAULT_TRUST_BADGE_CONFIG, ...config };

  if (!isTrustBadgeStructure(normalized.structure, true)) {
    throw new Error("Judge.me Trust Badge structure is invalid.");
  }
  if (!isTrustBadgeColor(normalized.color, true)) {
    throw new Error("Judge.me Trust Badge color is invalid.");
  }
  if (!isTrustBadgeColor(normalized.star, true)) {
    throw new Error("Judge.me Trust Badge star color is invalid.");
  }
  if (
    normalized.alignment !== "left" &&
    normalized.alignment !== "center" &&
    normalized.alignment !== "right"
  ) {
    throw new Error("Judge.me Trust Badge alignment is invalid.");
  }

  return normalized;
}

function normalizeShopDefaults(
  metafields: TrustBadgeMetafields,
): TrustBadgeShopDefaults {
  if (!isTrustBadgeStructure(metafields.structure, false)) {
    throw new Error("Judge.me returned an invalid Trust Badge shop structure.");
  }
  if (!isTrustBadgeColor(metafields.color, false)) {
    throw new Error("Judge.me returned an invalid Trust Badge shop color.");
  }
  if (!isTrustBadgeColor(metafields.star, false)) {
    throw new Error(
      "Judge.me returned an invalid Trust Badge shop star color.",
    );
  }

  return {
    color: metafields.color,
    star: metafields.star,
    structure: metafields.structure,
  };
}

function normalizeTrustBadgeModal(
  value: unknown,
  expectedShopDomain: string,
): TrustBadgeModalData {
  let raw: unknown = value;
  if (typeof raw === "string") {
    if (!raw.trim()) {
      throw new Error("Judge.me returned empty Trust Badge modal data.");
    }
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("Judge.me returned invalid Trust Badge modal JSON.");
    }
  }
  if (!isRecord(raw)) {
    throw new Error("Judge.me returned invalid Trust Badge modal data.");
  }

  const modalShopDomain = readNonEmptyString(raw.shop_domain);
  if (
    !modalShopDomain ||
    normalizeShopDomain(modalShopDomain) !== expectedShopDomain
  ) {
    throw new Error("Judge.me returned Trust Badge data for another store.");
  }

  const shopName = readNonEmptyString(raw.shop_name);
  const shopLogoUrl = readOptionalHttpsUrl(raw.shop_logo_url);
  const memberSince = readOptionalString(raw.member_since);
  const averageRating = readRating(raw.average_rating, "modal average rating");
  const verifiedReviewsCount = readCount(
    raw.verified_reviews_count,
    "modal verified review count",
  );
  const totalReviewsCount = readCount(
    raw.total_reviews_count,
    "modal total review count",
  );

  if (!shopName || typeof raw.is_certified !== "boolean") {
    throw new Error("Judge.me returned incomplete Trust Badge modal data.");
  }
  if (totalReviewsCount < verifiedReviewsCount) {
    throw new Error("Judge.me returned inconsistent Trust Badge modal counts.");
  }

  return {
    aiSummary: normalizeAiSummary(raw.ai_summary),
    averageRating,
    isCertified: raw.is_certified,
    memberSince,
    ratingDistribution: normalizeRatingDistribution(raw.rating_distribution),
    sentimentTags: normalizeSentimentTags(raw.sentiment_tags),
    shopLogoUrl,
    shopName,
    totalReviewsCount,
    verifiedReviewsCount,
  };
}

function normalizeAiSummary(value: unknown): TrustBadgeAiSummary | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new Error("Judge.me returned invalid Trust Badge AI summary data.");
  }

  const text = readNonEmptyString(value.text);
  const lastUpdated = readNonEmptyString(value.last_updated);
  if (!text && !lastUpdated && Object.keys(value).length === 0) return null;
  if (!text || !lastUpdated) {
    throw new Error(
      "Judge.me returned incomplete Trust Badge AI summary data.",
    );
  }

  return { lastUpdated, text };
}

function normalizeRatingDistribution(
  value: unknown,
): TrustBadgeRatingDistribution {
  if (!isRecord(value)) {
    throw new Error(
      "Judge.me returned invalid Trust Badge rating distribution.",
    );
  }

  return {
    "1_star": readCount(value["1_star"], "one-star review count"),
    "2_star": readCount(value["2_star"], "two-star review count"),
    "3_star": readCount(value["3_star"], "three-star review count"),
    "4_star": readCount(value["4_star"], "four-star review count"),
    "5_star": readCount(value["5_star"], "five-star review count"),
  };
}

function normalizeSentimentTags(value: unknown): TrustBadgeSentimentTag[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Judge.me returned invalid Trust Badge sentiment tags.");
  }

  return value.map((tag) => {
    if (!isRecord(tag)) {
      throw new Error(
        "Judge.me returned an invalid Trust Badge sentiment tag.",
      );
    }
    const name = readNonEmptyString(tag.name);
    const sentiment = tag.sentiment;
    if (
      !name ||
      (sentiment !== "positive" &&
        sentiment !== "neutral" &&
        sentiment !== "negative")
    ) {
      throw new Error(
        "Judge.me returned an invalid Trust Badge sentiment tag.",
      );
    }
    return { name, sentiment };
  });
}

function readMetafieldValue(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || typeof value.value !== "string") {
    throw new Error(`Shopify returned invalid Trust Badge ${label}.`);
  }
  return value.value;
}

function readBoolean(value: unknown, label: string): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`Judge.me returned invalid Trust Badge ${label}.`);
}

function readCount(value: unknown, label: string): number {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Judge.me returned invalid Trust Badge ${label}.`);
  }
  return count;
}

function readRating(value: unknown, label: string): number {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error(`Judge.me returned invalid Trust Badge ${label}.`);
  }
  return rating;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const string = readNonEmptyString(value);
  if (!string) {
    throw new Error("Judge.me returned invalid Trust Badge text data.");
  }
  return string;
}

function readOptionalHttpsUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Judge.me returned an invalid Trust Badge shop logo URL.");
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error("Judge.me returned an invalid Trust Badge shop logo URL.");
  }
}

function resolveAxis<T extends string>(value: T | "default", fallback: T): T {
  return value === "default" ? fallback : value;
}

function isTrustBadgeStructure(
  value: unknown,
  allowDefault: true,
): value is TrustBadgeStructure;
function isTrustBadgeStructure(
  value: unknown,
  allowDefault: false,
): value is Exclude<TrustBadgeStructure, "default">;
function isTrustBadgeStructure(value: unknown, allowDefault: boolean): boolean {
  return (
    value === "filled" ||
    value === "outline" ||
    (allowDefault && value === "default")
  );
}

function isTrustBadgeColor(
  value: unknown,
  allowDefault: true,
): value is TrustBadgeColor;
function isTrustBadgeColor(
  value: unknown,
  allowDefault: false,
): value is Exclude<TrustBadgeColor, "default">;
function isTrustBadgeColor(value: unknown, allowDefault: boolean): boolean {
  return (
    value === "black" ||
    value === "brand" ||
    value === "white" ||
    (allowDefault && value === "default")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
