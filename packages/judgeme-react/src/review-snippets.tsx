import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import {
  initializeReviewSnippets,
  releaseReviewSnippetsResponse,
} from "./exact-runtime.js";
import type { ReviewSnippetsData } from "./review-snippets-api.js";
import { useJudgeMe } from "./provider.js";
import { startJudgeMeRuntime } from "./runtime-lifecycle.js";

export interface ReviewSnippetsProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: ReviewSnippetsData;
}

/** Mounts Judge.me's current Shopify Review Snippets implementation. */
export function ReviewSnippets({
  className,
  data,
  ...sectionProps
}: ReviewSnippetsProps) {
  const containerRef = useRef<HTMLElement>(null);
  const { actions, meta } = useJudgeMe();
  const config = data.config;

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    if (!container) return;

    return startJudgeMeRuntime({
      assetBaseUrl,
      container,
      dispose: () => releaseReviewSnippetsResponse(data),
      initialize: () =>
        initializeReviewSnippets({
          assetBaseUrl: assetBaseUrl!,
          container,
          data,
          publicToken: meta.config.publicToken,
        }),
      reportStatus: actions.reportRuntimeStatus,
      widget: "review-snippets",
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
      key={data.page.requestUrl}
      ref={containerRef}
      className={["jdgm-widget", "jdgm-review-snippet-widget-v2", className]
        .filter(Boolean)
        .join(" ")}
      data-widget="review-snippet"
      data-entry-key="review-snippet-widget/main.js"
      data-entry-point="review-snippet-widget/main.js"
      data-reviews-selection={config.reviewSelection}
      data-product-id={data.productId}
      data-collection-id={config.collectionId}
      data-product-ids={config.selectedProductIds.join(",")}
      data-max-reviews={config.maxReviews}
      data-min-star-rating={config.minStarRating}
      data-filter-pinned={String(config.filterPinned)}
      data-filter-featured={String(config.filterFeatured)}
      data-custom-tags={config.customTags.join(",")}
      data-review-length={config.reviewLength}
      data-text-size={config.textSize}
      data-max-width={config.maxWidth}
      data-max-image-size={config.maxImageSize}
      data-arrows-visibility={config.arrowsVisibility}
      data-transition-speed={config.transitionSpeed}
      data-show-review-media={String(config.showReviewMedia)}
      data-corner-styling={config.cornerStyle}
      data-is-awesome={String(config.isAwesome)}
      data-text-color={config.textColor}
      data-lighter-text-color={config.lighterTextColor}
      data-card-color={config.cardColor}
      data-stars-color={config.starsColor}
      data-arrows-color={config.arrowsColor}
      data-arrows-background-color={config.arrowsBackgroundColor}
      data-preview-mode="false"
      data-judgeme-react-review-count={data.page.reviews.length}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="review-snippets"
    />
  );
}
