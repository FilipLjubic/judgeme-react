import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type { AiReviewsSummaryData } from "./ai-reviews-summary-api.js";
import { initializeAiReviewsSummary } from "./exact-runtime.js";
import { useJudgeMe } from "./provider.js";

export interface AiReviewsSummaryProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: AiReviewsSummaryData;
}

/** Mounts Judge.me's current Shopify AI Reviews Summary implementation. */
export function AiReviewsSummary({
  className,
  data,
  ...sectionProps
}: AiReviewsSummaryProps) {
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
          "Judge.me AI Reviews Summary requires config.v3AssetBaseUrl from the current Shopify extension deployment.",
        );
      }
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";

    initializeAiReviewsSummary({
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
        console.error("Judge.me AI Reviews Summary runtime error", error);
      });

    return () => {
      active = false;
    };
  }, [data, meta.config.publicToken, meta.config.v3AssetBaseUrl]);

  return (
    <section
      {...sectionProps}
      ref={containerRef}
      className={["jdgm-widget", "jdgm-store-summary-widget", className]
        .filter(Boolean)
        .join(" ")}
      data-widget="store-summary"
      data-entry-point="store-summary-widget/main.js"
      data-entry-key="store-summary-widget/main.js"
      data-theme={config.theme}
      data-show-keywords={String(config.showKeywords)}
      data-show-button={String(config.showButton)}
      data-keywords-visibility={config.keywordsVisibility}
      data-button-visibility={config.buttonVisibility}
      data-title-size={config.titleSize}
      data-text-size={config.textSize}
      data-alignment={config.alignment}
      data-corner-styling={config.cornerStyle}
      data-max-width={config.maxWidth}
      data-heading-text={config.headingText}
      data-button-text={config.buttonText}
      data-show-sample-data="real"
      data-widget-color={config.widgetColor}
      data-text-color={config.textColor}
      data-lighter-text-color={config.lighterTextColor}
      data-button-color={config.buttonColor}
      data-button-text-color={config.buttonTextColor}
      data-button-theme-color={config.buttonThemeColor}
      data-button-theme-text-color={config.buttonThemeTextColor}
      data-show-sentiment-colors={String(config.showSentimentColors)}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-source={data.source}
      data-judgeme-react-widget="ai-reviews-summary"
    />
  );
}
