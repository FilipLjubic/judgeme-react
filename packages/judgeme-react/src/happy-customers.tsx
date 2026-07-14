import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type { HappyCustomersData } from "./happy-customers-api.js";
import {
  disposeHappyCustomers,
  initializeHappyCustomers,
} from "./exact-runtime.js";
import { useJudgeMe } from "./provider.js";
import { startJudgeMeRuntime } from "./runtime-lifecycle.js";

export interface HappyCustomersProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: HappyCustomersData;
}

/** Mounts Judge.me's new Happy Customers (All Reviews v2025) widget. */
export function HappyCustomers({
  className,
  data,
  style,
  ...sectionProps
}: HappyCustomersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { actions, meta } = useJudgeMe();
  const config = data.config;

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    if (!container) return;

    return startJudgeMeRuntime({
      assetBaseUrl,
      container,
      dispose: () => disposeHappyCustomers(container),
      initialize: () =>
        initializeHappyCustomers({
          assetBaseUrl: assetBaseUrl!,
          container,
          data,
          publicToken: meta.config.publicToken,
        }),
      reportStatus: actions.reportRuntimeStatus,
      widget: "happy-customers",
    });
  }, [
    actions.reportRuntimeStatus,
    data,
    meta.config.publicToken,
    meta.config.v3AssetBaseUrl,
  ]);

  return (
    <section
      {...sectionProps}
      className={className}
      style={{ ...style, maxWidth: `${config.maxWidth}px`, width: "100%" }}
      data-judgeme-react-source={data.source}
      data-judgeme-react-widget="happy-customers"
    >
      <div
        key={`${data.page.requestUrl}:${data.enabled}:${config.reviewSource}:${config.showFirst}:${config.showAllReviewsInSameTab}:${config.emptyState}`}
        ref={containerRef}
        className="jdgm-widget jdgm-all-reviews-widget-v2025"
        data-widget="all-reviews-v2025"
        data-auto-install="false"
        data-entry-point="all_reviews_widget_v2025.js"
        data-entry-key="all-reviews-widget-v2025/main.js"
        data-review-source={config.reviewSource}
        data-show-first={config.showFirst}
        data-show-all-reviews-in-same-tab={String(
          config.showAllReviewsInSameTab,
        )}
        data-empty-state={config.emptyState}
        data-average-rating={String(data.aggregate.rating)}
        data-judgeme-react-runtime-status="loading"
      />
    </section>
  );
}
