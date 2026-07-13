import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import {
  initializeReviewSnippets,
  releaseReviewSnippetsResponse,
} from "./exact-runtime.js";
import type { ReviewSnippetsData } from "./review-snippets-api.js";
import { useJudgeMe } from "./provider.js";

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
          "Judge.me Review Snippets requires config.v3AssetBaseUrl from the current Shopify extension deployment.",
        );
      }
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";
    initializeReviewSnippets({
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
        console.error("Judge.me Review Snippets runtime error", error);
      });

    return () => {
      active = false;
      releaseReviewSnippetsResponse(data);
    };
  }, [data, meta.config.publicToken, meta.config.v3AssetBaseUrl]);

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
