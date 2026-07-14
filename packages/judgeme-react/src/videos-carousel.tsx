import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import {
  disposeVideosCarousel,
  initializeVideosCarousel,
  moveVideosCarousel,
} from "./exact-runtime.js";
import { useJudgeMe } from "./provider.js";
import { startJudgeMeRuntime } from "./runtime-lifecycle.js";
import type {
  VideosCarouselConfig,
  VideosCarouselData,
} from "./videos-carousel-api.js";

type VideosCarouselCssProperties = CSSProperties &
  Record<`--${string}`, string | number>;

export interface VideosCarouselProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: VideosCarouselData;
  /** Skip the shared Judge.me core CSS when another widget renders it. */
  includeStyles?: boolean;
}

/** Mounts Judge.me's current Shopify Videos Carousel and media lightbox. */
export function VideosCarousel({
  className,
  data,
  includeStyles = true,
  style,
  ...sectionProps
}: VideosCarouselProps) {
  const containerRef = useRef<HTMLElement>(null);
  const reactId = useId();
  const blockId = `judgeme-react-videos-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { actions, meta } = useJudgeMe();
  const config = data.config;
  const textSize = getTextSize(config);
  const starsSize = getStarsSize(config);
  const layout = getCarouselLayout(config);
  const carouselStyle = {
    "--max-width": `${config.maxWidth}px`,
    "--text-color": config.textColor,
    "--card-color": config.cardColor,
    "--header-color": config.headerColor,
    "--border-radius": `${getCornerRadius(config)}px`,
    "--border": config.showBorder
      ? "1px solid color-mix(in srgb, var(--text-color) 20%, transparent)"
      : "none",
    "--box-shadow": config.showDropShadow
      ? "0 8px 24px rgba(0, 0, 0, 0.12)"
      : "none",
    "--text-size": `${textSize}px`,
    "--stars-size": `${starsSize}px`,
    "--arrows-color": config.arrowsColor,
    "--card-width": `${layout.cardWidth}px`,
    "--scd-width": `${layout.secondaryWidth}px`,
    "--active-width": `${layout.activeWidth}px`,
    "--card-height": `${layout.cardHeight}px`,
    "--scd-height": `${layout.secondaryHeight}px`,
    "--active-height": `${layout.activeHeight}px`,
    "--mobile-width": `${layout.mobileWidth}px`,
    "--mobile-height": `${layout.mobileHeight}px`,
    "--mobile-scd-height": `${layout.mobileSecondaryHeight}px`,
    "--font-size-abs": String(textSize * 1.2),
    "--height-abs": String(layout.cardHeight),
    "--scd-height-abs": String(layout.secondaryHeight),
    "--active-height-abs": String(layout.activeHeight),
    "--mobile-height-abs": String(layout.mobileHeight),
    ...(config.starsColor === "rgba(0,0,0,0)"
      ? {}
      : { "--stars-color": config.starsColor }),
    ...style,
  } satisfies VideosCarouselCssProperties;

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    if (!container) return;

    return startJudgeMeRuntime({
      assetBaseUrl,
      container,
      dispose: () => disposeVideosCarousel(container, blockId),
      initialize: () =>
        initializeVideosCarousel({
          assetBaseUrl: assetBaseUrl!,
          blockId,
          container,
          data,
          publicToken: meta.config.publicToken,
        }),
      reportStatus: actions.reportRuntimeStatus,
      widget: "videos-carousel",
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
      onClick={() => moveVideosCarousel(blockId, "previous")}
    />
  );
  const nextButton = (
    <CarouselArrow
      direction="next"
      onClick={() => moveVideosCarousel(blockId, "next")}
    />
  );

  return (
    <>
      <section
        {...sectionProps}
        ref={containerRef}
        className={[
          "jdgm-widget",
          "jdgm-videos-carousel",
          "jdgm-hidden",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={carouselStyle}
        data-jdgm-block-id={blockId}
        data-widget="videos-carousel"
        data-entry-key="carousel-lightbox/main.js"
        data-entry-point="carousel_lightbox.js"
        data-has-revamp="1"
        data-transition-speed={config.transitionSpeed}
        data-autoplay-media={String(config.autoplayMedia)}
        data-judgeme-react-runtime-status="loading"
        data-judgeme-react-widget="videos-carousel"
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
          <div className="jdgm-videos-wrapper">
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
          data-judgeme-react-styles="videos-carousel"
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

function getCornerRadius(config: VideosCarouselConfig): number {
  return { sharp: 0, soft: 8, rounded: 16 }[config.cornerStyle];
}

function getTextSize(config: VideosCarouselConfig): number {
  return {
    extra_small: 14,
    small: 16,
    medium: 20,
    large: 24,
    extra_large: 32,
    huge: 40,
  }[config.textSize];
}

function getStarsSize(config: VideosCarouselConfig): number {
  return { small: 16, medium: 20, large: 24, hidden: 0 }[config.starsSize];
}

function getCarouselLayout(config: VideosCarouselConfig) {
  const highlight = config.carouselStyle === "highlight";

  return {
    cardWidth: 186,
    secondaryWidth: highlight ? 186 : 150,
    activeWidth: 257,
    cardHeight: 331,
    secondaryHeight: highlight ? 331 : 267,
    activeHeight: 457,
    mobileWidth: 252,
    mobileHeight: 448,
    mobileSecondaryHeight: highlight ? 392 : 344,
  };
}
