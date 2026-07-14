import {
  normalizeJudgeMeV3AssetBaseUrl,
  normalizeShopDomain,
} from "./config.js";

const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1_000;
const DEFAULT_STALE_IF_ERROR_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

export const JUDGE_ME_V3_MANIFEST_SENTINELS = [
  "review-widget/main.js",
  "reviews-grid-widget/main.js",
  "carousel-lightbox/main.js",
  "review-snippet-widget/main.js",
  "store-summary-widget/main.js",
  "trust-badge/main.js",
  "all-reviews-widget-v2025/main.js",
] as const;

export type JudgeMeV3AssetDeploymentSource =
  | "discovered"
  | "cache"
  | "stale-cache"
  | "fallback";

export interface JudgeMeV3AssetDeployment {
  assetBaseUrl: string;
  deploymentId: string;
  discoveredAt: string;
  extensionHandle: string;
  manifestEntries: readonly string[];
  manifestUrl: string;
  source: JudgeMeV3AssetDeploymentSource;
  storefrontUrl: string;
}

export interface ResolveJudgeMeV3AssetDeploymentOptions {
  /** Permanent Shopify domain used when `storefrontUrl` is omitted. */
  shopDomain: string;
  /**
   * Public Online Store page that renders the Judge.me app embed. This can be
   * a custom domain or product URL and is only fetched on the server.
   */
  storefrontUrl?: string;
  /** Last-known-good deployment used when storefront discovery is unavailable. */
  fallbackAssetBaseUrl?: string;
  /** Manifest entries that identify a compatible Judge.me core deployment. */
  requiredManifestEntries?: readonly string[];
  /** Successful discovery cache lifetime. Defaults to 15 minutes. */
  cacheTtlMs?: number;
  /** How long an expired successful result may survive a refresh error. */
  staleIfErrorMs?: number;
  /** Bypass a fresh cache entry and inspect the storefront again. */
  forceRefresh?: boolean;
  /** Complete storefront and manifest discovery timeout. Defaults to 5 seconds. */
  timeoutMs?: number;
  /** Injectable fetch implementation for server runtimes and tests. */
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
}

export type JudgeMeV3AssetDiscoveryErrorCode =
  | "invalid-storefront-url"
  | "storefront-request-failed"
  | "no-extension-candidates"
  | "no-compatible-deployment";

export class JudgeMeV3AssetDiscoveryError extends Error {
  readonly code: JudgeMeV3AssetDiscoveryErrorCode;

  constructor(code: JudgeMeV3AssetDiscoveryErrorCode, message: string) {
    super(message);
    this.name = "JudgeMeV3AssetDiscoveryError";
    this.code = code;
  }
}

interface ManifestEntry {
  file?: unknown;
}

type V3Manifest = Record<string, ManifestEntry>;

interface CachedDeployment {
  deployment: JudgeMeV3AssetDeployment;
  expiresAt: number;
  staleUntil: number;
}

const deploymentCache = new Map<string, CachedDeployment>();
const discoveryPromises = new Map<string, Promise<JudgeMeV3AssetDeployment>>();

/**
 * Resolves the current Judge.me Shopify extension deployment from public
 * storefront HTML and validates it against the deployment manifest.
 *
 * Call this from a server loader. Browser calls are intentionally unsupported
 * because Shopify storefront and manifest CORS policies are not an API contract.
 */
export async function resolveJudgeMeV3AssetDeployment(
  options: ResolveJudgeMeV3AssetDeploymentOptions,
): Promise<JudgeMeV3AssetDeployment> {
  const shopDomain = normalizeShopDomain(options.shopDomain);
  const storefrontUrl = normalizeStorefrontUrl(
    options.storefrontUrl ?? `https://${shopDomain}/`,
  );
  const requiredManifestEntries = normalizeRequiredEntries(
    options.requiredManifestEntries ?? JUDGE_ME_V3_MANIFEST_SENTINELS,
  );
  const cacheTtlMs = normalizeDuration(
    options.cacheTtlMs,
    DEFAULT_CACHE_TTL_MS,
  );
  const staleIfErrorMs = normalizeDuration(
    options.staleIfErrorMs,
    DEFAULT_STALE_IF_ERROR_MS,
  );
  const fallbackAssetBaseUrl = normalizeJudgeMeV3AssetBaseUrl(
    options.fallbackAssetBaseUrl,
  );
  const timeoutMs = normalizeDuration(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const cacheKey = createCacheKey(storefrontUrl, requiredManifestEntries);
  const now = Date.now();
  const cached = deploymentCache.get(cacheKey);

  if (!options.forceRefresh && cached && cached.expiresAt > now) {
    return cached.deployment.source === "fallback"
      ? cached.deployment
      : withSource(cached.deployment, "cache");
  }

  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (typeof fetchImplementation !== "function") {
    throw new Error("Judge.me v3 asset discovery requires a fetch implementation.");
  }

  const shareDiscovery = !options.signal && !options.forceRefresh;
  let discovery = shareDiscovery
    ? discoveryPromises.get(cacheKey)
    : undefined;
  if (!discovery) {
    discovery = discoverDeployment({
      fetchImplementation,
      requiredManifestEntries,
      signal: options.signal,
      storefrontUrl,
      timeoutMs,
    });
    if (shareDiscovery) discoveryPromises.set(cacheKey, discovery);
  }

  try {
    const deployment = await discovery;
    const completedAt = Date.now();
    deploymentCache.set(cacheKey, {
      deployment,
      expiresAt: completedAt + cacheTtlMs,
      staleUntil: completedAt + cacheTtlMs + staleIfErrorMs,
    });
    return deployment;
  } catch (error) {
    const stale = deploymentCache.get(cacheKey);
    if (stale && stale.staleUntil > Date.now()) {
      return withSource(stale.deployment, "stale-cache");
    }

    if (fallbackAssetBaseUrl) {
      const fallback = createFallbackDeployment(
        fallbackAssetBaseUrl,
        storefrontUrl,
      );
      const fallbackTtlMs = Math.min(cacheTtlMs, 60_000);
      deploymentCache.set(cacheKey, {
        deployment: fallback,
        expiresAt: Date.now() + fallbackTtlMs,
        staleUntil: Date.now() + fallbackTtlMs,
      });
      return fallback;
    }

    throw error;
  } finally {
    if (shareDiscovery && discoveryPromises.get(cacheKey) === discovery) {
      discoveryPromises.delete(cacheKey);
    }
  }
}

/** Clears the process-local discovery cache, useful after an operator refresh. */
export function clearJudgeMeV3AssetDiscoveryCache(): void {
  deploymentCache.clear();
  discoveryPromises.clear();
}

async function discoverDeployment({
  fetchImplementation,
  requiredManifestEntries,
  signal,
  storefrontUrl,
  timeoutMs,
}: {
  fetchImplementation: typeof globalThis.fetch;
  requiredManifestEntries: readonly string[];
  signal?: AbortSignal;
  storefrontUrl: string;
  timeoutMs: number;
}): Promise<JudgeMeV3AssetDeployment> {
  const discoverySignal = createDiscoverySignal(signal, timeoutMs);

  try {
    return await discoverDeploymentWithSignal({
      fetchImplementation,
      requiredManifestEntries,
      signal: discoverySignal.signal,
      storefrontUrl,
    });
  } finally {
    discoverySignal.cleanup();
  }
}

async function discoverDeploymentWithSignal({
  fetchImplementation,
  requiredManifestEntries,
  signal,
  storefrontUrl,
}: {
  fetchImplementation: typeof globalThis.fetch;
  requiredManifestEntries: readonly string[];
  signal?: AbortSignal;
  storefrontUrl: string;
}): Promise<JudgeMeV3AssetDeployment> {
  let response: Response;

  try {
    response = await fetchImplementation(storefrontUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal,
    });
  } catch (error) {
    throw new JudgeMeV3AssetDiscoveryError(
      "storefront-request-failed",
      `Judge.me asset discovery could not fetch ${storefrontUrl}: ${getErrorMessage(error)}`,
    );
  }

  if (!response.ok) {
    throw new JudgeMeV3AssetDiscoveryError(
      "storefront-request-failed",
      `Judge.me asset discovery request failed with HTTP ${response.status}.`,
    );
  }

  const candidates = extractShopifyExtensionAssetBases(await response.text());
  if (candidates.length === 0) {
    throw new JudgeMeV3AssetDiscoveryError(
      "no-extension-candidates",
      "The storefront HTML did not contain any Shopify extension asset URLs. Confirm that the Judge.me app embed is enabled on this published theme.",
    );
  }

  const failures: string[] = [];
  for (const assetBaseUrl of candidates) {
    const manifestUrl = new URL("manifest.json", assetBaseUrl).toString();

    try {
      const manifestResponse = await fetchImplementation(manifestUrl, {
        headers: { Accept: "application/json" },
        signal,
      });
      if (!manifestResponse.ok) {
        failures.push(`${getExtensionHandle(assetBaseUrl)}: HTTP ${manifestResponse.status}`);
        continue;
      }

      const manifest = (await manifestResponse.json()) as unknown;
      if (!isManifest(manifest)) {
        failures.push(`${getExtensionHandle(assetBaseUrl)}: invalid manifest`);
        continue;
      }

      const missingEntries = requiredManifestEntries.filter(
        (entry) => typeof manifest[entry]?.file !== "string",
      );
      if (missingEntries.length > 0) {
        failures.push(
          `${getExtensionHandle(assetBaseUrl)}: missing ${missingEntries.join(", ")}`,
        );
        continue;
      }

      const { deploymentId, extensionHandle } = parseAssetBaseUrl(assetBaseUrl);
      return {
        assetBaseUrl,
        deploymentId,
        discoveredAt: new Date().toISOString(),
        extensionHandle,
        manifestEntries: Object.keys(manifest).sort(),
        manifestUrl,
        source: "discovered",
        storefrontUrl,
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      failures.push(`${getExtensionHandle(assetBaseUrl)}: ${getErrorMessage(error)}`);
    }
  }

  throw new JudgeMeV3AssetDiscoveryError(
    "no-compatible-deployment",
    `No Shopify extension deployment exposed the required Judge.me manifest entries. Checked ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}${failures.length > 0 ? ` (${failures.join("; ")})` : ""}.`,
  );
}

function extractShopifyExtensionAssetBases(html: string): string[] {
  const decoded = html
    .replaceAll("\\/", "/")
    .replaceAll("&amp;", "&")
    .replace(/\\u002f/gi, "/");
  const matches = decoded.matchAll(
    /(?:https:)?\/\/cdn\.shopify\.com\/extensions\/[^\s"'<>?#]+\/[^\s"'<>?#]+\/assets\//gi,
  );
  const unique = new Set<string>();

  for (const match of matches) {
    const absoluteUrl = match[0].startsWith("//")
      ? `https:${match[0]}`
      : match[0];
    const normalized = normalizeJudgeMeV3AssetBaseUrl(absoluteUrl);
    if (normalized) unique.add(normalized);
  }

  return [...unique];
}

function normalizeStorefrontUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new JudgeMeV3AssetDiscoveryError(
      "invalid-storefront-url",
      `Invalid Judge.me discovery storefront URL: ${value}`,
    );
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new JudgeMeV3AssetDiscoveryError(
      "invalid-storefront-url",
      "Judge.me asset discovery requires a credential-free HTTPS storefront URL.",
    );
  }

  url.hash = "";
  return url.toString();
}

function normalizeRequiredEntries(entries: readonly string[]): readonly string[] {
  const normalized = [...new Set(entries.map((entry) => entry.trim()))].filter(
    Boolean,
  );

  if (normalized.length === 0) {
    throw new Error("Judge.me asset discovery requires a manifest sentinel.");
  }

  return normalized.sort();
}

function normalizeDuration(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Judge.me asset discovery cache durations must be positive.");
  }

  return Math.min(Math.floor(value), MAX_DURATION_MS);
}

function createDiscoverySignal(
  parentSignal: AbortSignal | undefined,
  timeoutMs: number,
): { cleanup: () => void; signal?: AbortSignal } {
  if (!parentSignal && timeoutMs === 0) {
    return { cleanup: () => undefined, signal: undefined };
  }

  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });

  if (timeoutMs > 0) {
    timeoutId = setTimeout(
      () =>
        controller.abort(
          new Error(`Judge.me asset discovery timed out after ${timeoutMs}ms.`),
        ),
      timeoutMs,
    );
  }

  return {
    cleanup: () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", abortFromParent);
    },
    signal: controller.signal,
  };
}

function createCacheKey(
  storefrontUrl: string,
  requiredManifestEntries: readonly string[],
): string {
  return `${storefrontUrl}\n${requiredManifestEntries.join("\n")}`;
}

function isManifest(value: unknown): value is V3Manifest {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createFallbackDeployment(
  assetBaseUrl: string,
  storefrontUrl: string,
): JudgeMeV3AssetDeployment {
  const { deploymentId, extensionHandle } = parseAssetBaseUrl(assetBaseUrl);

  return {
    assetBaseUrl,
    deploymentId,
    discoveredAt: new Date().toISOString(),
    extensionHandle,
    manifestEntries: [],
    manifestUrl: new URL("manifest.json", assetBaseUrl).toString(),
    source: "fallback",
    storefrontUrl,
  };
}

function withSource(
  deployment: JudgeMeV3AssetDeployment,
  source: JudgeMeV3AssetDeploymentSource,
): JudgeMeV3AssetDeployment {
  return { ...deployment, source };
}

function parseAssetBaseUrl(assetBaseUrl: string): {
  deploymentId: string;
  extensionHandle: string;
} {
  const url = new URL(assetBaseUrl);
  const [, , deploymentId, extensionHandle] = url.pathname.split("/");
  return { deploymentId, extensionHandle };
}

function getExtensionHandle(assetBaseUrl: string): string {
  return parseAssetBaseUrl(assetBaseUrl).extensionHandle;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
