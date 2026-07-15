import {
  useEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";
import type { JudgeMeMedalsData } from "./legacy-api.js";
import {
  disposeJudgeMeMedals,
  initializeJudgeMeMedals,
} from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

const PENDING_MEDALS_CLASSES: Readonly<Record<string, string>> = {
  "jdgm-medal__image": "jdgm-react-medal-image-pending",
  "jdgm-medals": "jdgm-react-medals-pending",
  "jdgm-medals-wrapper": "jdgm-react-medals-wrapper-pending",
};

export interface JudgeMeMedalsProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  data: JudgeMeMedalsData;
  /** @deprecated Styles are loaded automatically. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's exact earned-medal and verified-review payload,
 * then applies the dashboard-selected branding, colors, links and mobile flow.
 */
export function JudgeMeMedals({
  data,
  includeStyles: _includeStyles,
  ...containerProps
}: JudgeMeMedalsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meta } = useJudgeMe();
  const mountHtml = useMemo(
    () => maskMedalsRuntimeClasses(data.html),
    [data.html],
  );

  useEffect(() => {
    const container = containerRef.current;
    const publicToken = meta.config.publicToken;
    let active = true;

    if (!container || !publicToken) {
      if (container) container.dataset.judgemeReactRuntimeStatus = "error";
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";
    initializeJudgeMeMedals({
      container,
      isCurrent: () => active,
      publicToken,
      settings: data.settings,
      shopDomain: meta.config.shopDomain,
    })
      .then(() => {
        if (active) container.dataset.judgemeReactRuntimeStatus = "ready";
      })
      .catch((error: unknown) => {
        if (!active) return;

        disposeJudgeMeMedals(container);
        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error("Judge.me Medals runtime error", error);
      });

    return () => {
      active = false;
      disposeJudgeMeMedals(container);
    };
  }, [data.settings, meta.config.publicToken, meta.config.shopDomain]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      data-judgeme-react-medal-count={data.medalCount}
      data-judgeme-react-rating={data.rating}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-verified-review-count={data.verifiedReviewCount}
      data-judgeme-react-widget="medals"
    >
      <div dangerouslySetInnerHTML={{ __html: mountHtml }} />
      <style
        data-judgeme-react-dashboard-styles={meta.config.shopDomain}
        data-judgeme-react-styles="medals"
        dangerouslySetInnerHTML={{ __html: data.styles }}
      />
    </div>
  );
}

function maskMedalsRuntimeClasses(html: string): string {
  return html.replace(
    /class\s*=\s*(["'])([\s\S]*?)\1/gi,
    (attribute, quote: string, classNames: string) => {
      const maskedClassNames = classNames
        .split(/(\s+)/)
        .map((token) => PENDING_MEDALS_CLASSES[token] ?? token)
        .join("");
      return `class=${quote}${maskedClassNames}${quote}`;
    },
  );
}
