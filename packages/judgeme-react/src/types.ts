export const JUDGE_ME_WIDGETS = [
  "star-rating-badge",
  "review-widget",
  "reviews-carousel",
  "floating-reviews-tab",
  "all-reviews-page",
  "verified-reviews-counter",
  "medals",
  "ugc-media-grid",
  "all-reviews-counter",
  "cards-carousel",
  "testimonials-carousel",
  "videos-carousel",
  "pop-up-reviews",
  "ai-reviews-summary",
  "review-snippets",
  "questions-and-answers",
  "reviews-grid",
  "trust-badge",
  "happy-customers",
] as const;

export type JudgeMeWidget = (typeof JUDGE_ME_WIDGETS)[number];

export type JudgeMeEngine = "auto" | "exact" | "legacy" | "native";

export type ResolvedJudgeMeEngine = Exclude<JudgeMeEngine, "auto">;

export interface JudgeMePublicConfig {
  /** The permanent `*.myshopify.com` domain, without a protocol or path. */
  shopDomain: string;
  /** Judge.me's public Widget API token. Safe to expose to browser code. */
  publicToken?: string;
  /**
   * Current Judge.me Shopify extension `assets/` URL. Exact v3 widgets load
   * their module graph from this deployment-specific base.
   */
  v3AssetBaseUrl?: string;
  /** The first runtime strategy to try. Defaults to `auto`. */
  defaultEngine?: JudgeMeEngine;
}

export interface NormalizedJudgeMePublicConfig {
  shopDomain: string;
  publicToken?: string;
  v3AssetBaseUrl?: string;
  defaultEngine: JudgeMeEngine;
}

export interface JudgeMeRuntimeAdapter {
  readonly engine: ResolvedJudgeMeEngine;
  supports(widget: JudgeMeWidget): boolean;
}

export interface JudgeMeContextState {
  status: "idle" | "ready";
  availableEngines: readonly ResolvedJudgeMeEngine[];
}

export type JudgeMeRuntimeStatus = "loading" | "ready" | "error";

export type JudgeMeRuntimePhase =
  | "configuration"
  | "initialization"
  | "disposal";

export interface JudgeMeRuntimeStatusEvent {
  error?: Error;
  phase?: JudgeMeRuntimePhase;
  status: JudgeMeRuntimeStatus;
  widget: JudgeMeWidget;
}

export interface JudgeMeRuntimeErrorEvent {
  error: Error;
  phase: JudgeMeRuntimePhase;
  widget: JudgeMeWidget;
}

export interface JudgeMeContextActions {
  resolveEngine(
    widget: JudgeMeWidget,
    preferredEngine?: JudgeMeEngine,
  ): ResolvedJudgeMeEngine | undefined;
  reportRuntimeStatus(event: JudgeMeRuntimeStatusEvent): void;
}

export interface JudgeMeContextMeta {
  config: NormalizedJudgeMePublicConfig;
  runtimes: readonly JudgeMeRuntimeAdapter[];
}

export interface JudgeMeContextValue {
  state: JudgeMeContextState;
  actions: JudgeMeContextActions;
  meta: JudgeMeContextMeta;
}
