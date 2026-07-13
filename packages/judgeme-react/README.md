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
| Reviews Grid                            | Implemented with the tokenless v3 CDN endpoint and the store's current Shopify extension module                               |
| Cards Carousel                          | Implemented with the tokenless carousel endpoint, current deployment scripts, and v3 review lightbox                          |
| Testimonials Carousel                   | Implemented with tokenless carousel data, the current quote-card builder, autoplay controls, and v3 review lightbox           |
| Videos Carousel                         | Implemented with tokenless video/photo cards, current media/player scripts, navigation, and the v3 review lightbox            |
| Pop-up Reviews Widget                   | Implemented with dashboard settings, a tokenless public review feed, and React-owned app-embed timing and placement           |
| AI Reviews Summary                      | Implemented with Judge.me's Shopify metafield, current extension module, and complete app-block configuration                 |
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
- `fetchReviewsGridPage` fetches one tokenless public v3 grid page; `fetchReviewsGrid` combines it with public settings and aggregate reads for standalone use.
- `createReviewsGridData` combines a grid page with settings and aggregates already returned by a storefront batch.
- `fetchCardsCarouselPage` fetches one tokenless public Cards page; `fetchCardsCarousel` adds public settings, aggregates, and core CSS for standalone use.
- `createCardsCarouselData` combines Cards reviews with settings, CSS, and aggregates already returned by a storefront batch.
- `fetchTestimonialsCarouselPage` fetches one tokenless public Testimonials page; `fetchTestimonialsCarousel` adds public settings, aggregates, and core CSS for standalone use.
- `createTestimonialsCarouselData` combines testimonial reviews with resources already returned by a storefront batch.
- `fetchVideosCarouselPage` fetches one tokenless public Videos page; `fetchVideosCarousel` adds public settings, aggregates, and core CSS for standalone use.
- `createVideosCarouselData` combines video/photo cards with resources already returned by a storefront batch.
- `fetchPopupReviewsPage` maps dashboard selection to one tokenless public review-card read; `fetchPopupReviews` adds the public settings reads for standalone use.
- `createPopupReviewsData` combines popup cards with settings already returned by a storefront batch.
- `parseAiReviewsSummaryMetafield` validates and normalizes Judge.me's generated `shop.metafields.judgeme.store_summary_widget_data` value.
- `createAiReviewsSummaryData` combines that Storefront metafield with the app block's layout settings and shared public settings.
- `fetchAiReviewsSummaryStatus` reads Judge.me's tokenless generation state for diagnostics; it does not return summary content.
- `StarRatingBadge` server-renders the product rating and enables its scroll-to-reviews behavior.
- `ReviewsCarousel` server-renders the configured classic carousel and enables its navigation, auto-slide, and gallery behavior.
- `AllReviewsCounter` server-renders the configured combined store rating/count and enables its branded/text star treatment.
- `AllReviewsWidget` server-renders the configured all-store review stream and enables its tabs, filters, sorting, pagination, and SPA lifecycle.
- `FloatingReviewsTab` server-renders the tab and enables its modal, review streams, pagination, filters, sorting, and SPA lifecycle.
- `LegacyReviewWidget` server-renders that payload and progressively enables Judge.me's own review form and browser behavior.
- `ReviewsGrid` mounts Judge.me's exact current Shopify extension component, including Show more and its media lightbox.
- `CardsCarousel` mounts Judge.me's current Shopify block, including looped navigation, automatic movement, swipe support, and its review lightbox.
- `TestimonialsCarousel` mounts the current one-review quote carousel, automatic pause/resume behavior, navigation, and review lightbox.
- `VideosCarousel` mounts the current Highlight/Perspective media carousel, player/navigation behavior, and review lightbox.
- `PopupReviews` renders the global timed popup and owns page targeting, position, mobile visibility, dismissal, and SPA timer cleanup.
- `AiReviewsSummary` mounts Judge.me's current expanded, accordion, or button-theme store summary.
- `resolveJudgeMeEngine` implements the explicit `exact`, `legacy`, and `native` runtime policy.
- `JUDGE_ME_WIDGETS` names the storefront widget surface we intend to support.
- `getShopifyNumericId` converts Storefront API GraphQL IDs for Judge.me calls.

Private Judge.me credentials do not belong in this React package. Server integrations may consume a private token, but must never serialize it through a loader or provider.

## Implemented widgets

Fetch the six legacy widgets plus the v3 grid, Cards, Testimonials, Videos, and Popup pages in a server loader. The legacy batch makes seven requests: `product_review`, `preview_badge`, `featured_carousel`, `reviews_tab`, `all_reviews_page`, `settings`, and `html_miracle`. The same All Reviews response supplies `AllReviewsWidget`, the aggregate values for `AllReviewsCounter`, and the Floating Tab fallback when `reviews_tab` is `null`. Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, and Pop-up Reviews each add one tokenless CDN request and reuse the batch's settings, for twelve Judge.me requests total. AI Reviews Summary adds no Judge.me data request: its content comes from a Shopify Storefront API metafield fetched with the product query. The large settings/CSS payload remains shared. Awaiting the data keeps Judge.me-owned DOM outside a streamed Suspense boundary, which prevents its runtime from racing hydration.

```ts
import {
  AiReviewsSummary,
  AllReviewsCounter,
  AllReviewsWidget,
  CardsCarousel,
  createCardsCarouselData,
  createAiReviewsSummaryData,
  createPopupReviewsData,
  createReviewsGridData,
  createTestimonialsCarouselData,
  createVideosCarouselData,
  fetchCardsCarouselPage,
  fetchLegacyStorefrontWidgets,
  fetchPopupReviewsPage,
  fetchReviewsGridPage,
  fetchTestimonialsCarouselPage,
  fetchVideosCarouselPage,
  FloatingReviewsTab,
  getShopifyNumericId,
  JudgeMeProvider,
  LegacyReviewWidget,
  PopupReviews,
  ReviewsCarousel,
  ReviewsGrid,
  StarRatingBadge,
  TestimonialsCarousel,
  VideosCarousel,
} from "@judgeme-react/core";

const widgets = await fetchLegacyStorefrontWidgets({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  publicToken: env.JUDGEME_PUBLIC_TOKEN,
  productId: getShopifyNumericId(product.id),
  signal: request.signal,
});

const reviewsGridPage = await fetchReviewsGridPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  signal: request.signal,
});

const cardsCarouselPage = await fetchCardsCarouselPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  signal: request.signal,
});

const testimonialsCarouselPage = await fetchTestimonialsCarouselPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  signal: request.signal,
});

const videosCarouselPage = await fetchVideosCarouselPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  config: { reviewType: "photos-and-videos" },
  signal: request.signal,
});

const popupReviewsPage = await fetchPopupReviewsPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  settings: widgets.resources.settings,
  signal: request.signal,
});

const reviewsGrid = createReviewsGridData({
  aggregate: {
    count: widgets.allReviewsCounter.count,
    rating: Number(widgets.allReviewsCounter.rating),
  },
  page: reviewsGridPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
});

const cardsCarousel = createCardsCarouselData({
  aggregate: {
    count: widgets.allReviewsCounter.count,
    rating: Number(widgets.allReviewsCounter.rating),
  },
  page: cardsCarouselPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  styles: widgets.resources.styles,
});

const testimonialsCarousel = createTestimonialsCarouselData({
  aggregate: {
    count: widgets.allReviewsCounter.count,
    rating: Number(widgets.allReviewsCounter.rating),
  },
  page: testimonialsCarouselPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  styles: widgets.resources.styles,
});

const videosCarousel = createVideosCarouselData({
  aggregate: {
    count: widgets.allReviewsCounter.count,
    rating: Number(widgets.allReviewsCounter.rating),
  },
  config: { reviewType: "photos-and-videos" },
  page: videosCarouselPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  styles: widgets.resources.styles,
});

const popupReviews = createPopupReviewsData({
  page: popupReviewsPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
});

const aiReviewsSummary = createAiReviewsSummaryData({
  metafieldValue: shop.judgeMeStoreSummaryWidgetData?.value,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  config: {
    theme: "accordion",
    keywordsVisibility: "when_click",
  },
});
```

Render it inside the store-level provider:

```tsx
<JudgeMeProvider
  config={{
    shopDomain: env.JUDGEME_SHOP_DOMAIN,
    publicToken: env.JUDGEME_PUBLIC_TOKEN,
    v3AssetBaseUrl: env.JUDGEME_V3_ASSET_BASE_URL,
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
  {aiReviewsSummary ? <AiReviewsSummary data={aiReviewsSummary} /> : null}
  <CardsCarousel data={cardsCarousel} includeStyles={false} />
  <TestimonialsCarousel data={testimonialsCarousel} includeStyles={false} />
  <VideosCarousel data={videosCarousel} includeStyles={false} />
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
  <ReviewsGrid data={reviewsGrid} />
  <FloatingReviewsTab
    data={{ ...widgets.floatingReviewsTab, ...widgets.resources }}
    includeStyles={false}
    position="right"
  />
  <PopupReviews data={popupReviews} pageType="product" />
</JudgeMeProvider>
```

`includeStyles={false}` prevents the badge, counter, carousel, All Reviews Widget, and floating tab from emitting duplicate copies of the shared dashboard CSS; the Review Widget emits it once for all six. When rendering one widget, use its standalone fetcher and leave `includeStyles` at its default `true` where available. Use `fetchLegacyProductWidgets` when a route needs only the two product widgets.

`AllReviewsCounter` is the store-wide aggregate, including product and shop reviews. Its standalone fetcher calls `all_reviews_count` and `all_reviews_rating`; the batched loader reads the equivalent values from the `all_reviews_page` header. Dashboard templates are rendered as escaped text, and unsafe `javascript:` destinations are not emitted.

The host application must allow Judge.me's script, style, API, media, and image hosts in its Content Security Policy. Exact extension adapters also require `https://cdn.shopify.com` in script, style, connect, font, and image policies. The Hydrogen example in this repository contains the tested configuration. It preserves `'self'` when overriding `scriptSrc` and permits Vite's local blob worker with `workerSrc: ["'self'", 'blob:']`.

`ReviewsCarousel` implements Judge.me's classic carousel, sometimes called the legacy Reviews Carousel. It is not an adapter for the newer Cards, Testimonials, or Videos carousel blocks.

`AllReviewsWidget` uses Judge.me's official platform-independent marker and CDN styling, but React owns its interactive request lifecycle. Judge.me's `arp.js` normally pages through a cache-server contract; the adapter instead captures the same controls and reads `all_reviews_page` with the public token. Do not infer the API batch size from the header's `data-per-page`: on the current store the header says 10 while the endpoint returns 25 reviews per full page. The adapter records the largest observed batch size and uses returned review counts to detect the end.

`FloatingReviewsTab` prefers Judge.me's official markup. Its fallback exists because the official endpoint returns `null` when the Awesome-only tab is unavailable, even though `all_reviews_page` remains readable with the same public token. The fallback uses Judge.me's returned reviews and dashboard settings; it does not invent review content. Its `position` prop mirrors the Shopify app-embed setting because that setting lives in the theme editor rather than the Judge.me API.

`LegacyReviewWidget` intentionally implements Judge.me's public legacy Review Widget contract. When a store has the new Review Widget enabled, the fetch helper preserves its dashboard-generated text, colors, and other shared settings but disables the v3-only `review_widget_revamp_enabled` flag for this legacy runtime. It is not yet the exact Shopify v3 widget.

`ReviewsGrid` is an exact v3 client mount. The host must supply the current `https://cdn.shopify.com/extensions/<deployment>/<handle>/assets/` base because Judge.me can change it between extension deployments. Use `fetchReviewsGridPage` beside `fetchLegacyStorefrontWidgets` to add only one request to the product loader, then pass the shared settings and All Reviews aggregate through `createReviewsGridData`. The grid marker is server-rendered, but the review cards are mounted on the client by Judge.me's module.

`CardsCarousel` is an exact hybrid mount. Its page fetch is tokenless; the block shell is server-rendered; Judge.me's current `carousels.css`, `carousels.js`, `media_carousel.js`, and `video_carousel.js` build and move the cards; and the deployment manifest resolves the v3 review lightbox. The adapter seeds the server-fetched reviews before the SPA-root scanner runs, so hydration does not repeat the CDN data request. For `reviewSelection: "cart"`, pass the current cart's product IDs in `selectedProductIds`; the adapter maps them to the equivalent public custom-product read.

`TestimonialsCarousel` is also a hybrid exact mount. Its page fetch uses the same tokenless endpoint with `carousel_type=testimonials`; `carousels.css`, `carousels.js`, and `testimonials_carousel.js` build the one-card-at-a-time quote carousel; and the manifest-resolved lightbox remains shared. React supplies the block's serialized theme-editor configuration and owns navigation, autoplay pause/resume, and unmount cleanup. The full setting surface is typed by `TestimonialsCarouselConfig`; `transitionSpeed: 0` disables autoplay, and `arrowsPosition: "hidden"` removes navigation controls. Cart mode uses the same explicit `selectedProductIds` workaround as Cards Carousel.

`VideosCarousel` is the media-focused exact mount. Its tokenless request sets `carousel_type=videos` and maps `reviewType` to Judge.me's required `video`, `photo_and_video`, or `all` value. The component reuses Judge.me's deployed carousel CSS, media-card builder, player/navigation scanner, and manifest-resolved lightbox. `VideosCarouselConfig` covers the current theme-block selection, star/media filters, Highlight/Perspective layout, sizing, colors, arrows, border/shadow, autoplay, transition, and header controls. Videos-only mode requires at least three returned cards, matching Judge.me's documented minimum. The current fixture verifies photo cards and the image lightbox; iframe playback still requires seeded video reviews.

`PopupReviews` is a native global embed. Its tokenless request maps the dashboard's recent, picture-first, or featured selection to the existing public carousel feed, while `PopupReviewsConfig` comes from the shared Judge.me settings response. Mount it once near the application root in a complete storefront; pass an explicit `pageType` when route metadata is available. Product-picture mode needs `productImageUrlsByHandle` from the host's Storefront API because the public review feed does not consistently include base product images. The adapter never needs the private Judge.me token and never serializes reviewer contact or IP fields.

`AiReviewsSummary` is a store-level exact mount. Query `shop.metafield(namespace: "judgeme", key: "store_summary_widget_data") { value }` with Shopify's Storefront API and pass that value to `createAiReviewsSummaryData`; missing data returns `null`. The public status route is useful for generation diagnostics but does not contain the summary. Layout, visibility, sizing, corner, and color values belong to the Shopify app block, so the headless host must supply them through `AiReviewsSummaryConfig`. Judge.me's current module renders the generated summary, translations, keywords, aggregate, disclaimer, and verified branding; it does not currently consume a separately verified review-highlights field. No private Judge.me token is required.

The Widget API response is treated as trusted third-party HTML. The helper rejects script tags, inline event handlers, and `javascript:` URLs before the payload reaches server rendering. Judge.me's runtime is loaded from its CDN after React hydration and is never copied into this package.
