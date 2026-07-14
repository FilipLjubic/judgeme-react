import type {
  JudgeMePublicConfig,
  NormalizedJudgeMePublicConfig,
} from "./types.js";

const SHOPIFY_DOMAIN_SUFFIX = ".myshopify.com";
const SHOPIFY_EXTENSION_HOST = "cdn.shopify.com";

export function normalizeShopDomain(shopDomain: string): string {
  const candidate = shopDomain.trim();

  if (!candidate) {
    throw new Error("Judge.me requires a Shopify shop domain.");
  }

  let hostname: string;

  try {
    hostname = new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`,
    ).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid Shopify shop domain: ${candidate}`);
  }

  if (!hostname.endsWith(SHOPIFY_DOMAIN_SUFFIX)) {
    throw new Error(
      `Judge.me requires the permanent *.myshopify.com domain, received: ${hostname}`,
    );
  }

  return hostname;
}

export function createJudgeMeConfig(
  config: JudgeMePublicConfig,
): NormalizedJudgeMePublicConfig {
  const publicToken = config.publicToken?.trim();

  return {
    shopDomain: normalizeShopDomain(config.shopDomain),
    publicToken: publicToken || undefined,
    v3AssetBaseUrl: normalizeJudgeMeV3AssetBaseUrl(config.v3AssetBaseUrl),
    defaultEngine: config.defaultEngine ?? "auto",
  };
}

export function normalizeJudgeMeV3AssetBaseUrl(
  value: string | undefined,
): string | undefined {
  const candidate = value?.trim();

  if (!candidate) return undefined;

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`Invalid Judge.me v3 asset base URL: ${candidate}`);
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== SHOPIFY_EXTENSION_HOST ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !/^\/extensions\/[^/]+\/[^/]+\/assets\/?$/.test(url.pathname)
  ) {
    throw new Error(
      "Judge.me v3 assets must use an official cdn.shopify.com extension assets URL.",
    );
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url.toString();
}
