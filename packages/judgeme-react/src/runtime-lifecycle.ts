import type {
  JudgeMeRuntimePhase,
  JudgeMeRuntimeStatusEvent,
  JudgeMeWidget,
} from "./types.js";

export interface StartJudgeMeRuntimeOptions {
  assetBaseUrl?: string;
  container: HTMLElement;
  dispose?: () => void;
  initialize: () => Promise<void>;
  reportStatus: (event: JudgeMeRuntimeStatusEvent) => void;
  widget: JudgeMeWidget;
}

/**
 * Owns one exact widget's asynchronous mount and cleanup boundary.
 *
 * The returned disposer is safe to call from React Strict Mode. Widget-specific
 * disposers remain responsible for waiting on any in-flight third-party manager.
 */
export function startJudgeMeRuntime({
  assetBaseUrl,
  container,
  dispose,
  initialize,
  reportStatus,
  widget,
}: StartJudgeMeRuntimeOptions): () => void {
  let active = true;
  let disposed = false;

  const report = (event: JudgeMeRuntimeStatusEvent) => {
    try {
      reportStatus(event);
    } catch (error) {
      console.error("Judge.me runtime observer threw an error", error);
    }
  };

  const reportError = (
    phase: JudgeMeRuntimePhase,
    error: unknown,
    updateContainer: boolean,
  ) => {
    const normalizedError = toError(error);
    if (updateContainer) {
      container.dataset.judgemeReactRuntimeStatus = "error";
    }
    report({
      error: normalizedError,
      phase,
      status: "error",
      widget,
    });
  };

  const disposeOnce = () => {
    if (disposed) return;
    disposed = true;

    try {
      dispose?.();
    } catch (error) {
      reportError("disposal", error, false);
    }
  };

  if (!assetBaseUrl) {
    reportError(
      "configuration",
      new Error(
        `Judge.me ${widget} requires config.v3AssetBaseUrl from a current Shopify extension deployment.`,
      ),
      true,
    );

    return () => {
      active = false;
      disposeOnce();
    };
  }

  container.dataset.judgemeReactRuntimeStatus = "loading";
  report({ status: "loading", widget });

  void Promise.resolve()
    .then(initialize)
    .then(
      () => {
        if (!active) return;
        container.dataset.judgemeReactRuntimeStatus = "ready";
        report({ status: "ready", widget });
      },
      (error: unknown) => {
        if (!active) return;
        reportError("initialization", error, true);
      },
    );

  return () => {
    active = false;
    disposeOnce();
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
