import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createJudgeMeConfig } from "./config.js";
import { resolveJudgeMeEngine } from "./runtime.js";
import type {
  JudgeMeContextValue,
  JudgeMePublicConfig,
  JudgeMeRuntimeAdapter,
  JudgeMeRuntimeErrorEvent,
  JudgeMeRuntimeStatusEvent,
} from "./types.js";

const JudgeMeContext = createContext<JudgeMeContextValue | null>(null);
const EMPTY_RUNTIMES: readonly JudgeMeRuntimeAdapter[] = [];

export interface JudgeMeProviderProps {
  children: ReactNode;
  config: JudgeMePublicConfig;
  /** Receives exact-runtime failures for logging or error monitoring. */
  onRuntimeError?: (event: JudgeMeRuntimeErrorEvent) => void;
  /** Receives loading, ready, and error transitions from exact widgets. */
  onRuntimeStatusChange?: (event: JudgeMeRuntimeStatusEvent) => void;
  runtimes?: readonly JudgeMeRuntimeAdapter[];
}

export function JudgeMeProvider({
  children,
  config,
  onRuntimeError,
  onRuntimeStatusChange,
  runtimes = EMPTY_RUNTIMES,
}: JudgeMeProviderProps) {
  const value = useMemo<JudgeMeContextValue>(() => {
    const normalizedConfig = createJudgeMeConfig(config);

    return {
      state: {
        status: runtimes.length > 0 ? "ready" : "idle",
        availableEngines: runtimes.map((runtime) => runtime.engine),
      },
      actions: {
        resolveEngine: (widget, preferredEngine) =>
          resolveJudgeMeEngine({
            widget,
            preferredEngine: preferredEngine ?? normalizedConfig.defaultEngine,
            runtimes,
          }),
        reportRuntimeStatus: (event) => {
          onRuntimeStatusChange?.(event);

          if (event.status !== "error" || !event.error || !event.phase) {
            return;
          }

          if (onRuntimeError) {
            onRuntimeError({
              error: event.error,
              phase: event.phase,
              widget: event.widget,
            });
            return;
          }

          console.error(
            `Judge.me ${event.widget} runtime ${event.phase} error`,
            event.error,
          );
        },
      },
      meta: {
        config: normalizedConfig,
        runtimes,
      },
    };
  }, [config, onRuntimeError, onRuntimeStatusChange, runtimes]);

  return (
    <JudgeMeContext.Provider value={value}>{children}</JudgeMeContext.Provider>
  );
}

export function useJudgeMe(): JudgeMeContextValue {
  const context = useContext(JudgeMeContext);

  if (!context) {
    throw new Error("useJudgeMe must be used inside a JudgeMeProvider.");
  }

  return context;
}
