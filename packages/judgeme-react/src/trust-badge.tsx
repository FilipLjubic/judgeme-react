import {
  useEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";
import { disposeTrustBadge, initializeTrustBadge } from "./exact-runtime.js";
import type { TrustBadgeData } from "./trust-badge-api.js";
import { useJudgeMe } from "./provider.js";

export interface TrustBadgeProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  data: TrustBadgeData;
}

/** Mounts Judge.me's current Shopify Trust Badge and verification modal. */
export function TrustBadge({
  className,
  data,
  ...sectionProps
}: TrustBadgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meta } = useJudgeMe();
  const badgeJson = useMemo(
    () =>
      serializeScriptJson({
        average_rating: data.badge.verifiedAverageRating,
        is_certified: data.badge.isCertified,
        total_reviews_count: data.badge.totalReviewsCount,
        verified_average_rating: data.badge.verifiedAverageRating,
        verified_reviews_count: data.badge.verifiedReviewsCount,
      }),
    [data.badge],
  );
  const modalJson = useMemo(
    () =>
      JSON.stringify({
        ai_summary: data.modal.aiSummary
          ? {
              last_updated: data.modal.aiSummary.lastUpdated,
              text: data.modal.aiSummary.text,
            }
          : null,
        average_rating: data.modal.averageRating,
        is_certified: data.modal.isCertified,
        member_since: data.modal.memberSince,
        rating_distribution: data.modal.ratingDistribution,
        sentiment_tags: data.modal.sentimentTags,
        shop_logo_url: data.modal.shopLogoUrl,
        shop_name: data.modal.shopName,
        total_reviews_count: data.modal.totalReviewsCount,
        verified_reviews_count: data.modal.verifiedReviewsCount,
      }),
    [data.modal],
  );

  useEffect(() => {
    const container = containerRef.current;
    const assetBaseUrl = meta.config.v3AssetBaseUrl;
    let active = true;

    if (!container || !assetBaseUrl) {
      if (container) {
        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error(
          "Judge.me Trust Badge requires config.v3AssetBaseUrl from the current Shopify extension deployment.",
        );
      }
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";
    initializeTrustBadge({
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
        console.error("Judge.me Trust Badge runtime error", error);
      });

    return () => {
      active = false;
      disposeTrustBadge(container);
    };
  }, [data, meta.config.publicToken, meta.config.v3AssetBaseUrl]);

  return (
    <section
      {...sectionProps}
      className={className}
      data-structure={data.config.structure}
      data-shop-structure={data.shopDefaults.structure}
      data-color={data.config.color}
      data-shop-color={data.shopDefaults.color}
      data-star={data.config.star}
      data-shop-star={data.shopDefaults.star}
      data-alignment={data.config.alignment}
      data-layout-variant="standalone"
      data-judgeme-react-source={data.source}
      data-judgeme-react-widget="trust-badge"
    >
      <div
        key={`${badgeJson}:${modalJson}:${data.config.structure}:${data.config.color}:${data.config.star}:${data.config.alignment}`}
        ref={containerRef}
        className="jdgm-widget jdgm-trust-badge-widget"
        data-widget="trust-badge"
        data-entry-key="trust-badge/main.js"
        data-entry-point="trust-badge/main.js"
        data-modal-json={modalJson}
        data-judgeme-react-runtime-status="loading"
      >
        <script
          type="application/json"
          data-badge-data=""
          dangerouslySetInnerHTML={{ __html: badgeJson }}
        />
      </div>
    </section>
  );
}

function serializeScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
