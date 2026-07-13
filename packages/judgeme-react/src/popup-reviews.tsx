import {
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import type {
  PopupReview,
  PopupReviewsData,
  PopupReviewsPageType,
} from "./popup-reviews-api.js";

type PopupReviewsCssProperties = CSSProperties &
  Record<`--${string}`, string | number>;

export interface PopupReviewsProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  data: PopupReviewsData;
  /** Current storefront page. `auto` infers standard Shopify-style paths. */
  pageType?: PopupReviewsPageType;
  includeStyles?: boolean;
}

/** Renders a dashboard-configured, app-embed-style timed reviews popup. */
export function PopupReviews({
  className,
  data,
  includeStyles = true,
  pageType = "auto",
  style,
  ...divProps
}: PopupReviewsProps) {
  const [resolvedPageType, setResolvedPageType] =
    useState<PopupReviewsPageType>(pageType === "auto" ? "other" : pageType);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const config = data.config;
  const reviews = data.page.reviews;
  const canDisplay = isPopupEnabledOnPage(config, resolvedPageType);

  useEffect(() => {
    if (pageType !== "auto") {
      setResolvedPageType(pageType);
      return;
    }

    setResolvedPageType(detectPageType(window.location.pathname));
  }, [pageType]);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let displayed = 0;
    let index = 0;
    let active = true;

    setVisible(false);
    setCurrentIndex(0);

    if (!canDisplay || reviews.length === 0) return;

    const showNext = () => {
      if (!active) return;

      setCurrentIndex(index);
      setVisible(true);
      displayed += 1;

      hideTimer = setTimeout(() => {
        if (!active) return;

        setVisible(false);

        if (displayed >= Math.min(config.reviewCount, reviews.length)) return;

        index = (index + 1) % reviews.length;
        showTimer = setTimeout(showNext, config.intervalSeconds * 1_000);
      }, config.durationSeconds * 1_000);
    };

    showTimer = setTimeout(showNext, config.firstReviewDelaySeconds * 1_000);

    return () => {
      active = false;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [
    canDisplay,
    config.durationSeconds,
    config.firstReviewDelaySeconds,
    config.intervalSeconds,
    config.reviewCount,
    reviews,
  ]);

  const review = reviews[currentIndex];
  const popupStyle = {
    "--jdgm-popup-star-color": config.starColor,
    ...style,
  } satisfies PopupReviewsCssProperties;

  return (
    <>
      <div
        {...divProps}
        className={[
          "jdgm-react-popup-reviews",
          `jdgm-react-popup-reviews--${config.position.replace("_", "-")}`,
          config.roundBorderStyle
            ? "jdgm-react-popup-reviews--rounded"
            : "jdgm-react-popup-reviews--square",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={popupStyle}
        role="status"
        aria-atomic="true"
        aria-hidden={!visible}
        aria-live="polite"
        data-hide-on-mobile={String(config.hideOnMobile)}
        data-judgeme-react-widget="pop-up-reviews"
        data-page-type={resolvedPageType}
        data-visible={String(visible)}
      >
        {review ? (
          <PopupReviewCard
            config={config}
            review={review}
            onDismiss={() => setVisible(false)}
          />
        ) : null}
      </div>
      {includeStyles ? (
        <style
          data-judgeme-react-styles="pop-up-reviews"
          dangerouslySetInnerHTML={{ __html: POPUP_REVIEWS_CSS }}
        />
      ) : null}
    </>
  );
}

function PopupReviewCard({
  config,
  review,
  onDismiss,
}: {
  config: PopupReviewsData["config"];
  review: PopupReview;
  onDismiss: () => void;
}) {
  const imageUrl =
    config.imageMode === "review"
      ? review.reviewPictureUrl
      : config.imageMode === "product"
        ? review.productPictureUrl
        : undefined;
  const content = (
    <div className="jdgm-react-popup-reviews__content">
      <div
        className="jdgm-react-popup-reviews__stars"
        aria-label={`${review.rating} out of 5 stars`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} aria-hidden="true">
            {index < Math.round(review.rating) ? "★" : "☆"}
          </span>
        ))}
      </div>
      {config.showTitle && review.title ? (
        <strong className="jdgm-react-popup-reviews__title">
          {review.title}
        </strong>
      ) : null}
      {config.showBody && review.body ? (
        <p className="jdgm-react-popup-reviews__body">{review.body}</p>
      ) : null}
      {config.showReviewer && review.reviewerName ? (
        <span className="jdgm-react-popup-reviews__reviewer">
          {review.reviewerName}
        </span>
      ) : null}
      {config.showProduct && review.productTitle ? (
        <span className="jdgm-react-popup-reviews__product">
          {review.productTitle}
        </span>
      ) : null}
    </div>
  );

  return (
    <article
      className={[
        "jdgm-react-popup-reviews__card",
        imageUrl ? "jdgm-react-popup-reviews__card--with-image" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="jdgm-react-popup-reviews__close"
        aria-label="Dismiss review"
        onClick={onDismiss}
      >
        ×
      </button>
      {imageUrl ? (
        <img
          className="jdgm-react-popup-reviews__image"
          src={imageUrl}
          alt={review.productTitle || "Customer review"}
        />
      ) : null}
      {review.productUrl ? (
        <a
          className="jdgm-react-popup-reviews__link"
          href={review.productUrl}
          aria-label={
            review.productTitle
              ? `View ${review.productTitle}`
              : "View reviewed product"
          }
        >
          {content}
        </a>
      ) : (
        content
      )}
    </article>
  );
}

function detectPageType(pathname: string): PopupReviewsPageType {
  if (pathname === "/" || pathname === "") return "home";
  if (/^\/products\//.test(pathname)) return "product";
  if (/^\/collections\/[^/]+/.test(pathname)) return "collection";
  if (pathname === "/collections" || pathname === "/collections/") {
    return "list-collections";
  }
  if (pathname === "/cart" || pathname === "/cart/") return "cart";
  return "other";
}

function isPopupEnabledOnPage(
  config: PopupReviewsData["config"],
  pageType: PopupReviewsPageType,
) {
  switch (pageType) {
    case "home":
      return config.showOnHomePage;
    case "product":
      return config.showOnProductPage;
    case "collection":
    case "list-collections":
      return config.showOnCollectionPage;
    case "cart":
      return config.showOnCartPage;
    default:
      return false;
  }
}

const POPUP_REVIEWS_CSS = `
.jdgm-react-popup-reviews {
  position: fixed;
  z-index: 2147483000;
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
  width: min(380px, calc(100vw - 32px));
  height: auto;
  background: transparent;
  box-shadow: none;
  color: #1f2933;
  font-family: inherit;
  opacity: 0;
  pointer-events: none;
  transform: translateY(12px);
  transition: opacity 220ms ease, transform 220ms ease;
}
.jdgm-react-popup-reviews[data-visible="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.jdgm-react-popup-reviews--bottom-left { bottom: 24px; left: 24px; }
.jdgm-react-popup-reviews--bottom-right { bottom: 24px; right: 24px; }
.jdgm-react-popup-reviews--top-left { top: 24px; left: 24px; transform: translateY(-12px); }
.jdgm-react-popup-reviews--top-right { top: 24px; right: 24px; transform: translateY(-12px); }
.jdgm-react-popup-reviews--top-left[data-visible="true"],
.jdgm-react-popup-reviews--top-right[data-visible="true"] { transform: translateY(0); }
.jdgm-react-popup-reviews__card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  min-height: 116px;
  overflow: hidden;
  border: 1px solid rgba(31, 41, 51, 0.12);
  background: #fff;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.2);
}
.jdgm-react-popup-reviews--rounded .jdgm-react-popup-reviews__card { border-radius: 12px; }
.jdgm-react-popup-reviews--square .jdgm-react-popup-reviews__card { border-radius: 0; }
.jdgm-react-popup-reviews__card--with-image { grid-template-columns: 116px minmax(0, 1fr); }
.jdgm-react-popup-reviews__image {
  width: 116px;
  height: 100%;
  min-height: 116px;
  object-fit: cover;
}
.jdgm-react-popup-reviews__link {
  display: block;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
.jdgm-react-popup-reviews__link:focus-visible {
  outline: 2px solid var(--jdgm-popup-star-color, #108474);
  outline-offset: -3px;
}
.jdgm-react-popup-reviews__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 18px 38px 16px 18px;
}
.jdgm-react-popup-reviews__stars {
  display: flex;
  gap: 1px;
  color: var(--jdgm-popup-star-color, #108474);
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0;
}
.jdgm-react-popup-reviews__title,
.jdgm-react-popup-reviews__body,
.jdgm-react-popup-reviews__reviewer,
.jdgm-react-popup-reviews__product { overflow-wrap: anywhere; }
.jdgm-react-popup-reviews__title { font-size: 15px; line-height: 1.35; }
.jdgm-react-popup-reviews__body {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.jdgm-react-popup-reviews__reviewer,
.jdgm-react-popup-reviews__product { font-size: 12px; line-height: 1.35; }
.jdgm-react-popup-reviews__reviewer { color: #4b5563; }
.jdgm-react-popup-reviews__product { color: #111827; font-weight: 600; }
.jdgm-react-popup-reviews__close {
  position: absolute;
  z-index: 1;
  top: 6px;
  right: 7px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #667085;
  cursor: pointer;
  font: 22px/26px system-ui, sans-serif;
}
.jdgm-react-popup-reviews__close:hover,
.jdgm-react-popup-reviews__close:focus-visible { background: rgba(15, 23, 42, 0.08); color: #111827; }
@media (max-width: 767px) {
  .jdgm-react-popup-reviews[data-hide-on-mobile="true"] { display: none; }
  .jdgm-react-popup-reviews { right: 16px; left: 16px; width: auto; }
  .jdgm-react-popup-reviews--bottom-left,
  .jdgm-react-popup-reviews--bottom-right { bottom: 16px; }
  .jdgm-react-popup-reviews--top-left,
  .jdgm-react-popup-reviews--top-right { top: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .jdgm-react-popup-reviews { transition: none; }
}
`;
