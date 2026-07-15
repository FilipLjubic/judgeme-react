import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import type {
  TestimonialsCarouselConfig,
  TestimonialsCarouselData,
} from "./testimonials-carousel-api.js";
import {
  disposeTestimonialsCarousel,
  initializeTestimonialsCarousel,
  moveTestimonialsCarousel,
} from "./exact-runtime.js";
import { useJudgeMe } from "./provider.js";
import { startJudgeMeRuntime } from "./runtime-lifecycle.js";

type TestimonialsCarouselStyle = CSSProperties &
  Record<`--${string}`, string | number>;

export interface TestimonialsCarouselProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: TestimonialsCarouselData;
  /** @deprecated Styles are loaded automatically. */
  includeStyles?: boolean;
}

/** Mounts Judge.me's current Shopify Testimonials Carousel and lightbox. */
export function TestimonialsCarousel({
  className,
  data,
  includeStyles: _includeStyles,
  style,
  ...sectionProps
}: TestimonialsCarouselProps) {
  const containerRef = useRef<HTMLElement>(null);
  const reactId = useId();
  const blockId = `judgeme-react-testimonials-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { actions, meta } = useJudgeMe();
  const config = data.config;
  const clamp = getCardClamp(config);
  const carouselStyle = {
    "--max-width": `${config.maxWidth}px`,
    "--text-color": config.textColor,
    "--card-color": config.cardColor,
    "--border-radius": `${getCornerRadius(config)}px`,
    "--border": config.showBorder
      ? "1px solid color-mix(in srgb, var(--text-color) 20%, transparent)"
      : "none",
    "--box-shadow": config.showDropShadow
      ? "0 8px 24px rgba(0, 0, 0, 0.12)"
      : "none",
    "--quote-size": `${getQuoteMarksSize(config)}px`,
    "--quote-bg": getQuoteMarksBackground(config),
    "--quote-aspect": 1.52,
    "--text-size": `${getTextSize(config)}px`,
    "--text-size-mobile": `${getMobileTextSize(config)}px`,
    "--line-clamp": clamp.desktop,
    "--line-clamp-mobile": clamp.mobile,
    "--stars-size": `${getStarsSize(config)}px`,
    "--stars-color": config.starsAndQuoteMarksColor,
    "--product-name-size": `${getProductNameSize(config)}px`,
    "--arrows-color": config.arrowsColor,
    ...style,
  } satisfies TestimonialsCarouselStyle;

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    if (!container) return;

    return startJudgeMeRuntime({
      assetBaseUrl,
      container,
      dispose: () => disposeTestimonialsCarousel(container, blockId),
      initialize: () =>
        initializeTestimonialsCarousel({
          assetBaseUrl: assetBaseUrl!,
          blockId,
          container,
          data,
          publicToken: meta.config.publicToken,
        }),
      reportStatus: actions.reportRuntimeStatus,
      widget: "testimonials-carousel",
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
      onClick={() => moveTestimonialsCarousel(blockId, "previous")}
    />
  );
  const nextButton = (
    <CarouselArrow
      direction="next"
      onClick={() => moveTestimonialsCarousel(blockId, "next")}
    />
  );

  return (
    <>
      <section
        {...sectionProps}
        ref={containerRef}
        className={[
          "jdgm-widget",
          "jdgm-testimonials-carousel",
          "jdgm-hidden",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={carouselStyle}
        data-jdgm-block-id={blockId}
        data-widget="testimonials-carousel"
        data-entry-key="carousel-lightbox/main.js"
        data-entry-point="carousel_lightbox.js"
        data-has-revamp="1"
        data-transition-speed={config.transitionSpeed}
        data-judgeme-react-runtime-status="loading"
        data-judgeme-react-widget="testimonials-carousel"
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
                  {data.aggregate.rating} {" "}
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
          <div className="jdgm-testimonials-container" />
          {config.arrowsPosition === "sides" ? nextButton : null}
        </div>
        {config.arrowsPosition === "bottom" ? (
          <div className="jdgm-arrows--bottom">
            {previousButton}
            {nextButton}
          </div>
        ) : null}
      </section>
      {data.styles ? (
        <style
          data-judgeme-react-dashboard-styles={meta.config.shopDomain}
          data-judgeme-react-styles="testimonials-carousel"
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

function getCornerRadius(config: TestimonialsCarouselConfig): number {
  return { sharp: 0, soft: 8, rounded: 16 }[config.cornerStyle];
}

function getQuoteMarksSize(config: TestimonialsCarouselConfig): number {
  return {
    small: 16,
    medium: 24,
    large: 32,
    extra_large: 40,
    hidden: 0,
  }[config.quoteMarksSize];
}

function getProductNameSize(config: TestimonialsCarouselConfig): number {
  return {
    small: 12,
    medium: 14,
    large: 16,
    extra_large: 20,
    hidden: 0,
  }[config.productNameTextSize];
}

function getTextSize(config: TestimonialsCarouselConfig): number {
  return {
    extra_small: 14,
    small: 16,
    medium: 20,
    large: 24,
    extra_large: 32,
    huge: 40,
  }[config.textSize];
}

function getMobileTextSize(config: TestimonialsCarouselConfig): number {
  return {
    extra_small: 14,
    small: 16,
    medium: 18,
    large: 20,
    extra_large: 24,
    huge: 32,
  }[config.textSize];
}

function getStarsSize(config: TestimonialsCarouselConfig): number {
  return { small: 16, medium: 20, large: 24, hidden: 0 }[
    config.starsSize
  ];
}

function getCardClamp(config: TestimonialsCarouselConfig): {
  desktop: number;
  mobile: number;
} {
  return {
    compact: { desktop: 2, mobile: 3 },
    medium: { desktop: 3, mobile: 4 },
    tall: { desktop: 5, mobile: 6 },
    extra_tall: { desktop: 7, mobile: 8 },
  }[config.cardHeight];
}

function getQuoteMarksBackground(config: TestimonialsCarouselConfig): string {
  const typography = {
    serif: { family: "Georgia,serif", weight: 700, style: "normal" },
    typewritten: {
      family: "Courier New,monospace",
      weight: 700,
      style: "normal",
    },
    basic: { family: "Arial,sans-serif", weight: 400, style: "normal" },
    bold: { family: "Arial Black,sans-serif", weight: 900, style: "normal" },
    cartoon: {
      family: "Comic Sans MS,cursive",
      weight: 700,
      style: "normal",
    },
    sans_serif: {
      family: "Helvetica,Arial,sans-serif",
      weight: 700,
      style: "normal",
    },
  }[config.quoteMarksStyle];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 73 48"><text x="0" y="49" fill="${config.starsAndQuoteMarksColor}" font-family="${typography.family}" font-size="74" font-style="${typography.style}" font-weight="${typography.weight}">“</text></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
