import {useEffect, useRef, type ComponentPropsWithoutRef} from "react";
import type {StarRatingBadgeData} from "./legacy-api.js";
import {initializeStarRatingBadge} from "./legacy-runtime.js";
import {useJudgeMe} from "./provider.js";

export interface StarRatingBadgeProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "dangerouslySetInnerHTML"
  > {
  data: StarRatingBadgeData;
  /** @deprecated Styles are loaded automatically. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's configured product Star Rating Badge, then enables
 * its review-widget scrolling and dashboard text rules with Judge.me's runtime.
 */
export function StarRatingBadge({
  data,
  includeStyles: _includeStyles,
  ...containerProps
}: StarRatingBadgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {meta} = useJudgeMe();

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

    initializeStarRatingBadge({
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
        console.error("Judge.me Star Rating Badge runtime error", error);
      });

    return () => {
      active = false;
    };
  }, [data.settings, meta.config.publicToken, meta.config.shopDomain]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="star-rating-badge"
    >
      <div
        className="jdgm-widget jdgm-preview-badge"
        data-id={data.productId}
        dangerouslySetInnerHTML={{__html: data.html}}
      />
      <style
        data-judgeme-react-dashboard-styles={meta.config.shopDomain}
        data-judgeme-react-styles="legacy-widgets"
        dangerouslySetInnerHTML={{__html: data.styles}}
      />
    </div>
  );
}
