export { createJudgeMeConfig, normalizeShopDomain } from "./config.js";
export { fetchLegacyReviewWidget } from "./legacy-api.js";
export { LegacyReviewWidget } from "./legacy-review-widget.js";
export { JudgeMeProvider, useJudgeMe } from "./provider.js";
export { AUTO_ENGINE_ORDER, resolveJudgeMeEngine } from "./runtime.js";
export { getShopifyNumericId } from "./shopify.js";
export { JUDGE_ME_WIDGETS } from "./types.js";
export type {
  JudgeMeContextActions,
  JudgeMeContextMeta,
  JudgeMeContextState,
  JudgeMeContextValue,
  JudgeMeEngine,
  JudgeMePublicConfig,
  JudgeMeRuntimeAdapter,
  JudgeMeWidget,
  NormalizedJudgeMePublicConfig,
  ResolvedJudgeMeEngine,
} from "./types.js";
export type {
  FetchLegacyReviewWidgetOptions,
  JudgeMeJsonValue,
  JudgeMeRuntimeSettings,
  LegacyReviewWidgetData,
} from "./legacy-api.js";
export type { LegacyReviewWidgetProps } from "./legacy-review-widget.js";
