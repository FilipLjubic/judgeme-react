import type {
  JudgeMeEngine,
  JudgeMeRuntimeAdapter,
  JudgeMeWidget,
  ResolvedJudgeMeEngine,
} from "./types.js";

export const AUTO_ENGINE_ORDER = ["exact", "legacy", "native"] as const;

export function resolveJudgeMeEngine({
  widget,
  preferredEngine = "auto",
  runtimes,
}: {
  widget: JudgeMeWidget;
  preferredEngine?: JudgeMeEngine;
  runtimes: readonly JudgeMeRuntimeAdapter[];
}): ResolvedJudgeMeEngine | undefined {
  const candidates =
    preferredEngine === "auto" ? AUTO_ENGINE_ORDER : [preferredEngine];

  for (const candidate of candidates) {
    const runtime = runtimes.find((item) => item.engine === candidate);

    if (runtime?.supports(widget)) {
      return candidate;
    }
  }

  return undefined;
}
