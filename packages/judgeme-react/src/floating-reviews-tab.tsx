import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type { FloatingReviewsTabData } from "./legacy-api.js";
import {
  disposeFloatingReviewsTab,
  initializeFloatingReviewsTab,
} from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

export interface FloatingReviewsTabProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  data: FloatingReviewsTabData;
  /** @deprecated Styles are loaded automatically. */
  includeStyles?: boolean;
  /** Mirrors the Shopify app-embed position setting. */
  position?: "bottom" | "left" | "right";
}

/**
 * Renders Judge.me's Floating Reviews Tab, including a Free-plan fallback built
 * from the public All Reviews Page payload when Judge.me returns no tab markup.
 */
export function FloatingReviewsTab({
  data,
  includeStyles: _includeStyles,
  position = "bottom",
  ...containerProps
}: FloatingReviewsTabProps) {
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

    initializeFloatingReviewsTab({
      container,
      isCurrent: () => active,
      position,
      publicToken,
      settings: data.settings,
      shopDomain: meta.config.shopDomain,
      source: data.source,
    })
      .then(() => {
        if (!active) return;

        container.dataset.judgemeReactRuntimeStatus = "ready";
      })
      .catch((error: unknown) => {
        if (!active) return;

        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error("Judge.me Floating Reviews Tab runtime error", error);
      });

    return () => {
      active = false;
      disposeFloatingReviewsTab(container);
    };
  }, [
    data.settings,
    data.source,
    meta.config.publicToken,
    meta.config.shopDomain,
    position,
  ]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-source={data.source}
      data-judgeme-react-widget="floating-reviews-tab"
    >
      <div dangerouslySetInnerHTML={{ __html: data.html }} />
      <style
        data-judgeme-react-dashboard-styles={meta.config.shopDomain}
        data-judgeme-react-styles="legacy-widgets"
        dangerouslySetInnerHTML={{ __html: data.styles }}
      />
    </div>
  );
}
