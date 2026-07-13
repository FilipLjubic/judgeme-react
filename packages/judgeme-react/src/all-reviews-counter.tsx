import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type { AllReviewsCounterData } from "./legacy-api.js";
import { initializeAllReviewsCounter } from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

const VISIBLE_COUNTER_STYLE = `
[data-judgeme-react-widget="all-reviews-counter"] .jdgm-all-reviews-text {
  display: block;
}
[data-judgeme-react-widget="all-reviews-counter"] .jdgm-all-reviews-text__text {
  display: inline;
}
`;

export interface AllReviewsCounterProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  data: AllReviewsCounterData;
  /** Skip the shared dashboard CSS when another widget renders the same styles. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's store-wide rating and review count, then applies
 * the dashboard-selected branded/text style and star treatment.
 */
export function AllReviewsCounter({
  data,
  includeStyles = true,
  ...containerProps
}: AllReviewsCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meta } = useJudgeMe();

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

    initializeAllReviewsCounter({
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
        console.error("Judge.me All Reviews Counter runtime error", error);
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
      data-judgeme-react-rating={data.rating}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="all-reviews-counter"
    >
      <div dangerouslySetInnerHTML={{ __html: data.html }} />
      <style
        data-judgeme-react-styles="all-reviews-counter"
        dangerouslySetInnerHTML={{
          __html: `${includeStyles ? data.styles : ""}\n${VISIBLE_COUNTER_STYLE}`,
        }}
      />
    </div>
  );
}
