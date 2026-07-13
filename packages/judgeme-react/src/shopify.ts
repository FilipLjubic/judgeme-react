const SHOPIFY_GID_PATTERN = /^gid:\/\/shopify\/[^/]+\/(\d+)$/;

export function getShopifyNumericId(id: string): string {
  const candidate = id.trim();

  if (/^\d+$/.test(candidate)) {
    return candidate;
  }

  const match = SHOPIFY_GID_PATTERN.exec(candidate);

  if (!match) {
    throw new Error(`Invalid Shopify resource ID: ${id}`);
  }

  return match[1];
}
