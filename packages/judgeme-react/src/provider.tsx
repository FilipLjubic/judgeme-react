import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createJudgeMeConfig } from "./config.js";
import { resolveJudgeMeEngine } from "./runtime.js";
import type {
  JudgeMeContextValue,
  JudgeMePublicConfig,
  JudgeMeRuntimeAdapter,
} from "./types.js";

const JudgeMeContext = createContext<JudgeMeContextValue | null>(null);
const EMPTY_RUNTIMES: readonly JudgeMeRuntimeAdapter[] = [];

export interface JudgeMeProviderProps {
  children: ReactNode;
  config: JudgeMePublicConfig;
  runtimes?: readonly JudgeMeRuntimeAdapter[];
}

export function JudgeMeProvider({
  children,
  config,
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
      },
      meta: {
        config: normalizedConfig,
        runtimes,
      },
    };
  }, [config, runtimes]);

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
