import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import type {
  CardsCarouselConfig,
  CardsCarouselData,
} from "./cards-carousel-api.js";
import {
  disposeCardsCarousel,
  initializeCardsCarousel,
  moveCardsCarousel,
} from "./exact-runtime.js";
import { useJudgeMe } from "./provider.js";
import { startJudgeMeRuntime } from "./runtime-lifecycle.js";

type CardsCarouselStyle = CSSProperties &
  Record<`--${string}`, string | number>;

export interface CardsCarouselProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: CardsCarouselData;
  /** Skip the shared Judge.me core CSS when another widget renders it. */
  includeStyles?: boolean;
}

/** Mounts Judge.me's exact Shopify Cards Carousel and v3 media lightbox. */
export function CardsCarousel({
  className,
  data,
  includeStyles = true,
  style,
  ...sectionProps
}: CardsCarouselProps) {
  const containerRef = useRef<HTMLElement>(null);
  const reactId = useId();
  const blockId = `judgeme-react-cards-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { actions, meta } = useJudgeMe();
  const config = data.config;
  const carouselStyle = {
    "--max-width": `${config.maxWidth}px`,
    "--text-color": config.textColor,
    "--card-color": config.cardColor,
    "--header-color": config.headerColor,
    "--border-radius": `${getCornerRadius(config)}px`,
    "--text-size": `${getTextSize(config)}px`,
    "--arrows-color": config.arrowsColor,
    "--clamp": getReviewClamp(config),
    "--image-ratio": getImageRatio(config),
    "--jm-arrows-mobile": config.showArrowsOnMobile ? "flex" : "none",
    ...(config.starsColor === "rgba(0,0,0,0)"
      ? {}
      : { "--stars-color": config.starsColor }),
    ...style,
  } satisfies CardsCarouselStyle;

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    if (!container) return;

    return startJudgeMeRuntime({
      assetBaseUrl,
      container,
      dispose: () => disposeCardsCarousel(container, blockId),
      initialize: () =>
        initializeCardsCarousel({
          assetBaseUrl: assetBaseUrl!,
          blockId,
          container,
          data,
          publicToken: meta.config.publicToken,
        }),
      reportStatus: actions.reportRuntimeStatus,
      widget: "cards-carousel",
    });
  }, [
    actions.reportRuntimeStatus,
    blockId,
    data,
    meta.config.publicToken,
    meta.config.v3AssetBaseUrl,
  ]);

  const previousButton = (
    <CarouselArrow
      direction="previous"
      onClick={() => moveCardsCarousel(blockId, "previous")}
    />
  );
  const nextButton = (
    <CarouselArrow
      direction="next"
      onClick={() => moveCardsCarousel(blockId, "next")}
    />
  );

  return (
    <>
      <section
        {...sectionProps}
        ref={containerRef}
        className={[
          "jdgm-widget",
          "jdgm-cards-carousel",
          "jdgm-hidden",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={carouselStyle}
        data-jdgm-block-id={blockId}
        data-widget="cards-carousel"
        data-entry-key="carousel-lightbox/main.js"
        data-entry-point="carousel_lightbox.js"
        data-has-revamp="1"
        data-transition-speed={config.transitionSpeed}
        data-autoplay-media="false"
        data-judgeme-react-runtime-status="loading"
        data-judgeme-react-widget="cards-carousel"
      >
        <div className="jdgm-header">
          <h2 className="jdgm-title">{config.headerText}</h2>
          {config.showAverageRating ? (
            <div className="jdgm-header-info">
              <div className="jdgm-average-rating">
                <div
                  className="jdgm-stars"
                  role="img"
                  aria-label={`${data.aggregate.rating.toFixed(1)} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      key={index}
                      className={getStarClass(data.aggregate.rating, index + 1)}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="jdgm-rating-text">
                  {data.aggregate.rating}{" "}
                  <span className="jdgm-rating-star">★</span> (
                  <span className="jdgm-reviews-count">
                    {data.aggregate.count}
                  </span>
                  )
                </span>
              </div>
              <div className="jdgm-verified-badge-header jdgm-hidden">
                <svg
                  className="jdgm-verified-checkmark"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <rect width="20" height="20" rx="3" />
                  <path
                    d="m5.2 10.2 3.1 3.1 6.6-7"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="jdgm-verified-text">Verified</span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="jdgm-content">
          {config.arrowsPosition === "sides" ? previousButton : null}
          <div className="jdgm-cards-wrapper">
            <div className="jdgm-videos-container" />
          </div>
          {config.arrowsPosition === "sides" ? nextButton : null}
        </div>
        {config.arrowsPosition === "bottom" ? (
          <div className="jdgm-arrows--bottom">
            {previousButton}
            {nextButton}
          </div>
        ) : null}
      </section>
      {includeStyles && data.styles ? (
        <style
          data-judgeme-react-styles="cards-carousel"
          dangerouslySetInnerHTML={{ __html: data.styles }}
        />
      ) : null}
    </>
  );
}

function CarouselArrow({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const isPrevious = direction === "previous";

  return (
    <button
      type="button"
      className="jdgm-arrow"
      aria-label={isPrevious ? "Previous slide" : "Next slide"}
      onClick={onClick}
    >
      <svg viewBox="0 0 20 34" aria-hidden="true">
        <path
          d={isPrevious ? "M16 6 6 17l10 11" : "M4 6l10 11L4 28"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function getStarClass(rating: number, position: number): string {
  const fraction = Number((rating % 1).toFixed(2));
  let state = "jdgm--off";

  if (
    position <= Math.floor(rating) ||
    (position === Math.ceil(rating) && fraction > 0.75)
  ) {
    state = "jdgm--on";
  } else if (position === Math.ceil(rating) && fraction > 0.25) {
    state = "jdgm--half";
  }

  return `jdgm-star ${state}`;
}

function getCornerRadius(config: CardsCarouselConfig): number {
  return { square: 0, soft: 8, round: 16, extra_round: 24 }[config.cornerStyle];
}

function getTextSize(config: CardsCarouselConfig): number {
  return { small: 14, medium: 16, large: 18 }[config.textSize];
}

function getReviewClamp(config: CardsCarouselConfig): number {
  return { short: 2, medium: 4, long: 6 }[config.reviewLength];
}

function getImageRatio(config: CardsCarouselConfig): number {
  return { landscape: 0.75, square: 1, portrait: 4 / 3 }[config.imageRatio];
}
