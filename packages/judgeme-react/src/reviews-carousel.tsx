import {useEffect, useRef, type ComponentPropsWithoutRef} from "react";
import type {ReviewsCarouselData} from "./legacy-api.js";
import {
  disposeReviewsCarousel,
  initializeReviewsCarousel,
} from "./legacy-runtime.js";
import {useJudgeMe} from "./provider.js";

export interface ReviewsCarouselProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "dangerouslySetInnerHTML"
  > {
  data: ReviewsCarouselData;
  /** Skip the shared dashboard CSS when another widget renders the same styles. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's classic shop-level Reviews Carousel, then enables
 * its configured layout, navigation, auto-slide, and gallery interactions.
 */
export function ReviewsCarousel({
  data,
  includeStyles = true,
  ...containerProps
}: ReviewsCarouselProps) {
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

    initializeReviewsCarousel({
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
        console.error("Judge.me Reviews Carousel runtime error", error);
      });

    return () => {
      active = false;
      disposeReviewsCarousel(container);
    };
  }, [data.settings, meta.config.publicToken, meta.config.shopDomain]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-widget="reviews-carousel"
    >
      <div dangerouslySetInnerHTML={{__html: data.html}} />
      {includeStyles ? (
        <style
          data-judgeme-react-styles="legacy-widgets"
          dangerouslySetInnerHTML={{__html: data.styles}}
        />
      ) : null}
    </div>
  );
}
