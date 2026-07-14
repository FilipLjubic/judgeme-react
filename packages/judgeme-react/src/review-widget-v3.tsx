import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type { ReviewWidgetV3Data } from "./review-widget-v3-api.js";
import {
  disposeReviewWidgetV3,
  initializeReviewWidgetV3,
} from "./exact-runtime.js";
import { useJudgeMe } from "./provider.js";

export interface ReviewWidgetV3Props extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: ReviewWidgetV3Data;
}

/** Mounts Judge.me's new Shopify Review Widget with dashboard styling intact. */
export function ReviewWidgetV3({
  className,
  data,
  style,
  ...sectionProps
}: ReviewWidgetV3Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meta } = useJudgeMe();
  const config = data.config;

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    let active = true;

    if (!container || !assetBaseUrl) {
      if (container) {
        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error(
          "Judge.me Review Widget v3 requires config.v3AssetBaseUrl from the current Shopify extension deployment.",
        );
      }
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";
    initializeReviewWidgetV3({
      assetBaseUrl,
      container,
      data,
      publicToken: meta.config.publicToken,
    })
      .then(() => {
        if (active) container.dataset.judgemeReactRuntimeStatus = "ready";
      })
      .catch((error: unknown) => {
        if (!active) return;

        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error("Judge.me Review Widget v3 runtime error", error);
      });

    return () => {
      active = false;
      disposeReviewWidgetV3(container);
    };
  }, [data, meta.config.publicToken, meta.config.v3AssetBaseUrl]);

  return (
    <section
      {...sectionProps}
      className={className}
      style={{ ...style, maxWidth: `${config.maxWidth}px`, width: "100%" }}
      data-judgeme-react-source={data.source}
      data-judgeme-react-widget="review-widget-v3"
    >
      <div
        key={`${data.page.requestUrl}:${data.product.id}:${config.showStoreReviews}:${config.emptyState}`}
        ref={containerRef}
        className="jdgm-widget jdgm-review-widget"
        data-auto-install="false"
        data-entry-key="review-widget/main.js"
        data-entry-point="review_widget.js"
        data-product-id={data.product.id}
        data-product-title={data.product.title}
        data-product-handle={data.product.handle}
        data-shop-reviews={String(config.showStoreReviews)}
        data-shop-reviews-count={String(data.shopReviewsCount)}
        data-empty-state={config.emptyState}
        data-shop-average-rating={String(data.shopAggregate.rating)}
        data-shop-review-count={String(data.shopAggregate.count)}
        data-cart-eligible-template="false"
        data-preview-mode={
          data.source === "disabled-preview" ? "sample_data" : "real_data"
        }
        data-judgeme-react-runtime-status="loading"
      />
    </section>
  );
}
