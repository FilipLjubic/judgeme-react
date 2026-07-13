# @judgeme-react/core

Private, pre-release package containing the React-facing contracts for the Judge.me compatibility project.

The package is intentionally framework-neutral. Hydrogen is a consumer under `examples/hydrogen`, not a dependency of this package.

## Support status

| Surface                                 | Status                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Star Rating Badge                       | Implemented with the public `preview_badge` endpoint and Judge.me's interaction runtime                                       |
| All Reviews Counter                     | Implemented with public aggregate endpoints, dashboard text/style settings, and Judge.me's secondary runtime                  |
| Classic Reviews Carousel                | Implemented with the public `featured_carousel` endpoint and Judge.me's secondary-widget runtime                              |
| All Reviews Widget                      | Implemented with the public `all_reviews_page` endpoint, dashboard settings, and React-owned SPA controls                     |
| Floating Reviews Tab                    | Implemented with the public `reviews_tab` endpoint plus an `all_reviews_page` fallback for stores where the tab is plan-gated |
| Legacy Review Widget                    | Implemented and tested in the Hydrogen harness                                                                                |
| New Shopify v3 Review Widget            | Not implemented; shared dashboard settings are reused by the legacy adapter, but this is not exact v3 rendering               |
| Every other entry in `JUDGE_ME_WIDGETS` | Planned/researched only; there is no public React component yet                                                               |

`JUDGE_ME_WIDGETS` is the target catalog used by the runtime-policy types. Its presence does not mean those widgets have implementations.

## Current API boundary

- `JudgeMeProvider` exposes public store configuration and injected runtime adapters.
- `fetchStarRatingBadge` fetches a standalone product badge, settings, and CSS.
- `fetchLegacyReviewWidget` fetches Review Widget HTML, dashboard settings, and dashboard CSS from Judge.me's public Widget API.
- `fetchLegacyProductWidgets` fetches both product widgets while sharing the settings/CSS requests.
- `fetchReviewsCarousel` fetches the standalone classic shop-level carousel, settings, and CSS.
- `fetchAllReviewsCounter` fetches the standalone shop-wide rating/count, settings, and CSS.
- `fetchAllReviewsWidget` fetches the standalone shop-level All Reviews Widget, settings, and CSS.
- `fetchFloatingReviewsTab` fetches the official tab when available and otherwise builds a Free-plan fallback from All Reviews Page data.
- `fetchLegacyStorefrontWidgets` fetches all six implemented widgets with one shared settings/CSS payload and reuses the All Reviews response for the counter and Free-plan Floating Tab fallback.
- `StarRatingBadge` server-renders the product rating and enables its scroll-to-reviews behavior.
- `ReviewsCarousel` server-renders the configured classic carousel and enables its navigation, auto-slide, and gallery behavior.
- `AllReviewsCounter` server-renders the configured combined store rating/count and enables its branded/text star treatment.
- `AllReviewsWidget` server-renders the configured all-store review stream and enables its tabs, filters, sorting, pagination, and SPA lifecycle.
- `FloatingReviewsTab` server-renders the tab and enables its modal, review streams, pagination, filters, sorting, and SPA lifecycle.
- `LegacyReviewWidget` server-renders that payload and progressively enables Judge.me's own review form and browser behavior.
- `resolveJudgeMeEngine` implements the explicit `exact`, `legacy`, and `native` runtime policy.
- `JUDGE_ME_WIDGETS` names the storefront widget surface we intend to support.
- `getShopifyNumericId` converts Storefront API GraphQL IDs for Judge.me calls.

Private Judge.me credentials do not belong in this React package. Server integrations may consume a private token, but must never serialize it through a loader or provider.

## Implemented widgets

Fetch all six widgets in a server loader. The batch makes seven requests: `product_review`, `preview_badge`, `featured_carousel`, `reviews_tab`, `all_reviews_page`, `settings`, and `html_miracle`. The same All Reviews response supplies `AllReviewsWidget`, the aggregate values for `AllReviewsCounter`, and the Floating Tab fallback when `reviews_tab` is `null`, so no extra requests are made. The large settings/CSS payload appears only once in route data. Awaiting the batch keeps the Judge.me-owned DOM outside a streamed Suspense boundary, which prevents its runtime from racing hydration.

```ts
import {
  AllReviewsCounter,
  AllReviewsWidget,
  fetchLegacyStorefrontWidgets,
  FloatingReviewsTab,
  getShopifyNumericId,
  JudgeMeProvider,
  LegacyReviewWidget,
  ReviewsCarousel,
  StarRatingBadge,
} from "@judgeme-react/core";

const widgets = await fetchLegacyStorefrontWidgets({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  publicToken: env.JUDGEME_PUBLIC_TOKEN,
  productId: getShopifyNumericId(product.id),
  signal: request.signal,
});
```

Render it inside the store-level provider:

```tsx
<JudgeMeProvider
  config={{
    shopDomain: env.JUDGEME_SHOP_DOMAIN,
    publicToken: env.JUDGEME_PUBLIC_TOKEN,
  }}
>
  <StarRatingBadge
    data={{ ...widgets.starRatingBadge, ...widgets.resources }}
    includeStyles={false}
  />
  <AllReviewsCounter
    data={{ ...widgets.allReviewsCounter, ...widgets.resources }}
    includeStyles={false}
  />
  <ReviewsCarousel
    data={{ ...widgets.reviewsCarousel, ...widgets.resources }}
    includeStyles={false}
  />
  <LegacyReviewWidget
    data={{ ...widgets.reviewWidget, ...widgets.resources }}
  />
  <AllReviewsWidget
    data={{ ...widgets.allReviewsWidget, ...widgets.resources }}
    includeStyles={false}
  />
  <FloatingReviewsTab
    data={{ ...widgets.floatingReviewsTab, ...widgets.resources }}
    includeStyles={false}
    position="right"
  />
</JudgeMeProvider>
```

`includeStyles={false}` prevents the badge, counter, carousel, All Reviews Widget, and floating tab from emitting duplicate copies of the shared dashboard CSS; the Review Widget emits it once for all six. When rendering one widget, use its standalone fetcher and leave `includeStyles` at its default `true` where available. Use `fetchLegacyProductWidgets` when a route needs only the two product widgets.

`AllReviewsCounter` is the store-wide aggregate, including product and shop reviews. Its standalone fetcher calls `all_reviews_count` and `all_reviews_rating`; the batched loader reads the equivalent values from the `all_reviews_page` header. Dashboard templates are rendered as escaped text, and unsafe `javascript:` destinations are not emitted.

The host application must allow Judge.me's script, style, API, media, and image hosts in its Content Security Policy. The Hydrogen example in this repository contains the tested CSP configuration. It also preserves `'self'` when overriding `scriptSrc` and permits Vite's local blob worker with `workerSrc: ["'self'", 'blob:']`.

`ReviewsCarousel` implements Judge.me's classic carousel, sometimes called the legacy Reviews Carousel. It is not an adapter for the newer Cards, Testimonials, or Videos carousel blocks.

`AllReviewsWidget` uses Judge.me's official platform-independent marker and CDN styling, but React owns its interactive request lifecycle. Judge.me's `arp.js` normally pages through a cache-server contract; the adapter instead captures the same controls and reads `all_reviews_page` with the public token. Do not infer the API batch size from the header's `data-per-page`: on the current store the header says 10 while the endpoint returns 25 reviews per full page. The adapter records the largest observed batch size and uses returned review counts to detect the end.

`FloatingReviewsTab` prefers Judge.me's official markup. Its fallback exists because the official endpoint returns `null` when the Awesome-only tab is unavailable, even though `all_reviews_page` remains readable with the same public token. The fallback uses Judge.me's returned reviews and dashboard settings; it does not invent review content. Its `position` prop mirrors the Shopify app-embed setting because that setting lives in the theme editor rather than the Judge.me API.

`LegacyReviewWidget` intentionally implements Judge.me's public legacy Review Widget contract. When a store has the new Review Widget enabled, the fetch helper preserves its dashboard-generated text, colors, and other shared settings but disables the v3-only `review_widget_revamp_enabled` flag for this legacy runtime. It is not yet the exact Shopify v3 widget.

The Widget API response is treated as trusted third-party HTML. The helper rejects script tags, inline event handlers, and `javascript:` URLs before the payload reaches server rendering. Judge.me's runtime is loaded from its CDN after React hydration and is never copied into this package.
