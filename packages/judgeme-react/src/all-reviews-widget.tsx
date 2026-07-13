import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type { AllReviewsWidgetData } from "./legacy-api.js";
import {
  disposeAllReviewsWidget,
  initializeAllReviewsWidget,
} from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

const VISIBLE_WIDGET_STYLE = `
[data-judgeme-react-widget="all-reviews-widget"] .jdgm-all-reviews-widget {
  display: block;
}
`;

export interface AllReviewsWidgetProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children" | "dangerouslySetInnerHTML"
> {
  data: AllReviewsWidgetData;
  /** Skip the shared dashboard CSS when another widget renders the same styles. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's legacy All Reviews Widget, then enables its product
 * and shop streams, paging, rating filters, sorting, and media gallery.
 */
export function AllReviewsWidget({
  data,
  includeStyles = true,
  ...sectionProps
}: AllReviewsWidgetProps) {
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

    initializeAllReviewsWidget({
      container,
      initialReviewType: data.initialReviewType,
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
        console.error("Judge.me All Reviews Widget runtime error", error);
      });

    return () => {
      active = false;
      observer.disconnect();
      disposeAllReviewsWidget(container);
    };
  }, [
    data.initialReviewType,
    data.settings,
    meta.config.publicToken,
    meta.config.shopDomain,
  ]);

  return (
    <section
      {...sectionProps}
      ref={containerRef}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="all-reviews-widget"
    >
      <div dangerouslySetInnerHTML={{ __html: data.html }} />
      <style
        data-judgeme-react-styles="all-reviews-widget"
        dangerouslySetInnerHTML={{
          __html: `${includeStyles ? data.styles : ""}\n${VISIBLE_WIDGET_STYLE}`,
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
