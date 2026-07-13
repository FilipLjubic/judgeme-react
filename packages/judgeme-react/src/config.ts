import type {
  JudgeMePublicConfig,
  NormalizedJudgeMePublicConfig,
} from "./types.js";

const SHOPIFY_DOMAIN_SUFFIX = ".myshopify.com";

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
    defaultEngine: config.defaultEngine ?? "auto",
  };
}
