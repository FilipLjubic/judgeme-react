import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";
import type { LegacyReviewWidgetData } from "./legacy-api.js";
import { initializeLegacyReviewWidget } from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

const VISIBLE_WIDGET_STYLE = `
[data-judgeme-react-widget="review-widget"] .jdgm-rev-widg {
  display: block;
}
`;

export interface LegacyReviewWidgetProps
  extends Omit<
    ComponentPropsWithoutRef<"section">,
    "children" | "dangerouslySetInnerHTML"
  > {
  data: LegacyReviewWidgetData;
}

/**
 * Renders Judge.me's configured legacy Review Widget and progressively enables
 * its forms, pagination, media, and other browser behavior with Judge.me's own
 * public runtime.
 */
export function LegacyReviewWidget({
  data,
  ...sectionProps
}: LegacyReviewWidgetProps) {
  const containerRef = useRef<HTMLElement>(null);
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
    sanitizeRuntimeLinks(container);

    const observer = new MutationObserver(() => {
      sanitizeRuntimeLinks(container);
    });
    observer.observe(container, {
      attributeFilter: ["href"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    initializeLegacyReviewWidget({
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
        console.error("Judge.me Review Widget runtime error", error);
      });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [data.settings, meta.config.publicToken, meta.config.shopDomain]);

  return (
    <section
      {...sectionProps}
      ref={containerRef}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="review-widget"
    >
      <div
        className="jdgm-widget jdgm-review-widget"
        data-id={data.productId}
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
      <style
        data-judgeme-react-styles="review-widget"
        dangerouslySetInnerHTML={{
          __html: `${data.styles}\n${VISIBLE_WIDGET_STYLE}`,
        }}
      />
    </section>
  );
}

function sanitizeRuntimeLinks(container: HTMLElement): void {
  container
    .querySelectorAll<HTMLAnchorElement>('a[href^="javascript:"]')
    .forEach((link) => {
      link.setAttribute("href", "#");
    });
}
