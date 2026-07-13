import { useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import type { VerifiedReviewsCounterData } from "./legacy-api.js";
import { initializeVerifiedReviewsCounter } from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

export interface VerifiedReviewsCounterProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  data: VerifiedReviewsCounterData;
  /** Skip the shared dashboard CSS when another widget renders the same styles. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's eligible verified-review count, then applies the
 * dashboard-selected branded/classic presentation, orientation, color and link.
 */
export function VerifiedReviewsCounter({
  data,
  includeStyles = true,
  ...containerProps
}: VerifiedReviewsCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meta } = useJudgeMe();
  const visibleStyle = useMemo(
    () => `
[data-judgeme-react-widget="verified-reviews-counter"] .jdgm-verified-badge {
  display: ${data.settings.verified_count_badge_style === "vintage" ? "inline-block" : "flex"};
}
`,
    [data.settings.verified_count_badge_style],
  );

  useEffect(() => {
    const container = containerRef.current;
    const publicToken = meta.config.publicToken;
    let active = true;

    if (!container || !publicToken) {
      if (container) {
        container.dataset.judgemeReactRuntimeStatus = "error";
      }
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";

    initializeVerifiedReviewsCounter({
      container,
      publicToken,
      settings: data.settings,
      shopDomain: meta.config.shopDomain,
    })
      .then(() => {
        if (active) container.dataset.judgemeReactRuntimeStatus = "ready";
      })
      .catch((error: unknown) => {
        if (!active) return;

        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error(
          "Judge.me Verified Reviews Counter runtime error",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [data.settings, meta.config.publicToken, meta.config.shopDomain]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      data-judgeme-react-count={data.count}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="verified-reviews-counter"
    >
      <div dangerouslySetInnerHTML={{ __html: data.html }} />
      <style
        data-judgeme-react-styles="verified-reviews-counter"
        dangerouslySetInnerHTML={{
          __html: `${includeStyles ? data.styles : ""}\n${visibleStyle}`,
        }}
      />
    </div>
  );
}
