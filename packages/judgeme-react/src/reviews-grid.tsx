import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { initializeReviewsGrid } from "./exact-runtime.js";
import type { ReviewsGridData } from "./reviews-grid-api.js";
import { useJudgeMe } from "./provider.js";

export interface ReviewsGridProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: ReviewsGridData;
}

/**
 * Mounts Judge.me's current Shopify Reviews Grid implementation with public CDN
 * data and a deployment-specific extension asset base supplied by the host.
 */
export function ReviewsGrid({
  className,
  data,
  ...sectionProps
}: ReviewsGridProps) {
  const containerRef = useRef<HTMLElement>(null);
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
          "Judge.me Reviews Grid requires config.v3AssetBaseUrl from the current Shopify extension deployment.",
        );
      }
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";

    initializeReviewsGrid({
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
        console.error("Judge.me Reviews Grid runtime error", error);
      });

    return () => {
      active = false;
    };
  }, [data, meta.config.publicToken, meta.config.v3AssetBaseUrl]);

  return (
    <section
      {...sectionProps}
      ref={containerRef}
      className={["jdgm-widget", "jdgm-reviews-grid-widget", className]
        .filter(Boolean)
        .join(" ")}
      data-widget="reviews-grid"
      data-entry-key="reviews-grid-widget/main.js"
      data-entry-point="reviews_grid.js"
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="reviews-grid"
      data-show-sample-reviews="false"
      data-preview-mode="false"
      data-reviews-selection={config.reviewSelection}
      data-products={config.selectedProductIds.join(",")}
      data-show-media-only={String(config.showReviewsWithMediaOnly)}
      data-display-order={config.displayOrder}
      data-card-grouping={config.cardGrouping}
      data-columns-desktop={config.numberOfColumnsDesktop}
      data-rows-desktop={config.numberOfRowsDesktop}
      data-columns-mobile={config.numberOfColumnsMobile}
      data-rows-mobile={config.numberOfRowsMobile}
      data-show-stars={String(config.showStars)}
      data-show-reviewer-name={String(config.showReviewerName)}
      data-show-review-title-on-hover-desktop={String(
        config.showReviewTitleOnHoverDesktop,
      )}
      data-max-width={config.maxWidth}
      data-header-text={config.headerText}
      data-show-average-rating={String(config.showAverageRating)}
      data-collection-id={config.collectionId}
      data-product-id={data.productId}
      data-is-awesome={String(config.isAwesome)}
      data-corner-styling={config.cornerStyle}
      data-card-spacing={config.cardSpacing}
      data-header-text-color={config.headerTextColor}
      data-star-and-reviewer-name-color={config.starAndReviewerNameColor}
      data-overlay-and-background-color={config.overlayAndBackgroundColor}
      data-content-color={config.contentColor}
      data-drop-shadow-color={config.dropShadowColor}
      data-cart-eligible-template="false"
      data-shop-average-rating={data.aggregate.rating}
      data-shop-review-count={data.aggregate.count}
      data-tb-enabled="false"
    />
  );
}
