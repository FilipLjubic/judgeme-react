# @judgeme-react/core

Private, pre-release package containing the React-facing contracts for the Judge.me compatibility project.

The package is intentionally framework-neutral. Hydrogen is a consumer under `examples/hydrogen`, not a dependency of this package.

## Support status

| Surface                      | Status                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Star Rating Badge            | Implemented with the public `preview_badge` endpoint and Judge.me's interaction runtime                                       |
| Verified Reviews Counter     | Implemented with exact public `verified_badge` markup, dashboard settings, and an eligibility-aware nullable fetcher          |
| Judge.me Medals              | Implemented with exact public cache markup, verified stats, dashboard settings, and component-owned mobile rotation           |
| UGC Media Grid               | Implemented with exact cache markup or tokenless social-post fallback plus Judge.me's dashboard renderer and gallery          |
| Trust Badge                  | Implemented with server-only Admin metafields, sanitized public data, and the exact current badge/modal extension             |
| Happy Customers              | Implemented with the tokenless All Reviews v2025 feed, shared aggregates/settings, and exact current extension manager        |
| All Reviews Counter          | Implemented with public aggregate endpoints, dashboard text/style settings, and Judge.me's secondary runtime                  |
| Classic Reviews Carousel     | Implemented with the public `featured_carousel` endpoint and Judge.me's secondary-widget runtime                              |
| All Reviews Widget           | Implemented with the public `all_reviews_page` endpoint, dashboard settings, and React-owned SPA controls                     |
| Floating Reviews Tab         | Implemented with the public `reviews_tab` endpoint plus an `all_reviews_page` fallback for stores where the tab is plan-gated |
| Reviews Grid                 | Implemented with the tokenless v3 CDN endpoint and the store's current Shopify extension module                               |
| Cards Carousel               | Implemented with the tokenless carousel endpoint, current deployment scripts, and v3 review lightbox                          |
| Testimonials Carousel        | Implemented with tokenless carousel data, the current quote-card builder, autoplay controls, and v3 review lightbox           |
| Videos Carousel              | Implemented with tokenless video/photo cards, current media/player scripts, navigation, and the v3 review lightbox            |
| Pop-up Reviews Widget        | Implemented with dashboard settings, a tokenless public review feed, and React-owned app-embed timing and placement           |
| AI Reviews Summary           | Implemented with Judge.me's Shopify metafield, current extension module, and complete app-block configuration                 |
| Review Snippets              | Implemented with the tokenless v2 feed, exact current extension module, arrows/autoplay, and v3 review lightbox               |
| Questions & Answers          | Implemented with the tokenless question feed, real multipart submission route, dashboard settings, and native React UI        |
| Legacy Review Widget         | Implemented and tested in the Hydrogen harness                                                                                |
| New Shopify v3 Review Widget | Implemented with the tokenless structured feed, exact deployment manager/styles, dashboard settings, and review form        |

Every current `JUDGE_ME_WIDGETS` catalog entry has a data adapter, public component, tests, and a Hydrogen integration. The review-widget entry offers both the platform-independent legacy implementation and the exact current Shopify v3 implementation.

## Current API boundary

- `JudgeMeProvider` exposes public store configuration and injected runtime adapters.
- `fetchStarRatingBadge` fetches a standalone product badge, settings, and CSS.
- `fetchLegacyReviewWidget` fetches Review Widget HTML, dashboard settings, and dashboard CSS from Judge.me's public Widget API.
- `fetchReviewWidgetV3Page` reads the tokenless structured v3 feed and returns `null` when the store returns legacy HTML; `fetchReviewWidgetV3` adds shared settings and shop aggregates for standalone use.
- `createReviewWidgetV3Data` combines a v3 page with settings and aggregates already returned by a storefront loader.
- `fetchLegacyProductWidgets` fetches both product widgets while sharing the settings/CSS requests.
- `fetchReviewsCarousel` fetches the standalone classic shop-level carousel, settings, and CSS.
- `fetchAllReviewsCounter` fetches the standalone shop-wide rating/count, settings, and CSS.
- `fetchVerifiedReviewsCounter` fetches the exact shop-wide verified badge and returns `null` when Judge.me says the store is ineligible.
- `fetchJudgeMeMedals` fetches exact earned-medal markup, verified stats, settings, and CSS in one public platform-independent cache read.
- `fetchUgcMediaGrid` prefers exact cache markup and falls back to Judge.me's tokenless social-post feed; both paths return `null` when no post is published.
- `fetchAllReviewsWidget` fetches the standalone shop-level All Reviews Widget, settings, and CSS.
- `fetchFloatingReviewsTab` fetches the official tab when available and otherwise builds a Free-plan fallback from All Reviews Page data.
- `fetchLegacyStorefrontWidgets` fetches all nine implemented legacy widgets, reuses one Medals/UGC cache response for shared settings/CSS, and reuses All Reviews data for the aggregate counter and Free-plan Floating Tab fallback.
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
- `fetchReviewSnippetsPage` fetches one tokenless public snippets page; `fetchReviewSnippets` adds shared public settings for standalone use.
- `createReviewSnippetsData` combines snippets with settings already returned by a storefront batch.
- `fetchQuestionsAndAnswersPage` reads one tokenless product-question page; `fetchQuestionsAndAnswers` adds shared public settings for standalone use.
- `createQuestionsAndAnswersData` combines questions with shared settings and Shopify product metadata; `submitQuestion` posts the real tokenless multipart shopper form.
- `fetchTrustBadgeMetafields` reads the eight current shop metafields through Shopify Admin GraphQL; its Admin access token is server-only and is never returned.
- `createTrustBadgeData` validates and sanitizes that response, strips unused review records, applies typed theme-editor overrides, and optionally creates an explicitly labeled disabled preview.
- `fetchHappyCustomersPage` fetches one tokenless All Reviews v2025 page; `fetchHappyCustomers` adds shared public settings and legacy aggregates for standalone use.
- `createHappyCustomersData` combines a Happy Customers page with settings, aggregate values, and histogram markup already returned by a storefront batch.
- `StarRatingBadge` server-renders the product rating and enables its scroll-to-reviews behavior.
- `ReviewsCarousel` server-renders the configured classic carousel and enables its navigation, auto-slide, and gallery behavior.
- `AllReviewsCounter` server-renders the configured combined store rating/count and enables its branded/text star treatment.
- `VerifiedReviewsCounter` server-renders the exact eligible verified count and enables its branded/classic presentation, orientation, color, branding, and link.
- `JudgeMeMedals` server-renders every earned medal plus exact verified rating/count and enables dashboard branding, colors, links, compact layout, and SPA-safe mobile rotation.
- `UgcMediaGrid` server-renders Judge.me's hidden post-data shell and enables its dashboard layout, lazy media, pagination, product attachments, and gallery lightbox.
- `AllReviewsWidget` server-renders the configured all-store review stream and enables its tabs, filters, sorting, pagination, and SPA lifecycle.
- `FloatingReviewsTab` server-renders the tab and enables its modal, review streams, pagination, filters, sorting, and SPA lifecycle.
- `LegacyReviewWidget` server-renders that payload and progressively enables Judge.me's own review form and browser behavior.
- `ReviewsGrid` mounts Judge.me's exact current Shopify extension component, including Show more and its media lightbox.
- `CardsCarousel` mounts Judge.me's current Shopify block, including looped navigation, automatic movement, swipe support, and its review lightbox.
- `TestimonialsCarousel` mounts the current one-review quote carousel, automatic pause/resume behavior, navigation, and review lightbox.
- `VideosCarousel` mounts the current Highlight/Perspective media carousel, player/navigation behavior, and review lightbox.
- `PopupReviews` renders the global timed popup and owns page targeting, position, mobile visibility, dismissal, and SPA timer cleanup.
- `AiReviewsSummary` mounts Judge.me's current expanded, accordion, or button-theme store summary.
- `ReviewSnippets` mounts Judge.me's current rotating snippet card, arrows, autoplay, and review lightbox.
- `QuestionsAndAnswers` renders an independently placeable Q&A list, pagination, dashboard styling, and accessible Ask a question flow.
- `TrustBadge` mounts Judge.me's current deployment-specific badge and lazy verified-review modal, with root-local SPA cleanup.
- `HappyCustomers` imports the current deployment's All Reviews v2025 manager and mounts its tabs, filters, sorting, pagination, media, and store-review form with root-local SPA cleanup.
- `resolveJudgeMeEngine` implements the explicit `exact`, `legacy`, and `native` runtime policy.
- `JUDGE_ME_WIDGETS` names the storefront widget surface we intend to support.
- `getShopifyNumericId` converts Storefront API GraphQL IDs for Judge.me calls.

Private Judge.me credentials do not belong in this React package. Server integrations may consume a private token, but must never serialize it through a loader or provider.

## Implemented widgets

Fetch the nine legacy widgets plus the v3 grid, Cards, Testimonials, Videos, Popup, Review Snippets, Questions & Answers, Happy Customers, the new Review Widget, and Trust Badge data in a server loader. The exact-cache legacy batch makes seven requests: `product_review`, `preview_badge`, `featured_carousel`, `reviews_tab`, `verified_badge`, `all_reviews_page`, and one platform-independent cache read containing Medals, UGC, `settings`, and `html_miracle`. If UGC is absent from that response, one tokenless social-post compatibility read is added. The same All Reviews response supplies `AllReviewsWidget`, the aggregate values and histogram for `AllReviewsCounter` and `HappyCustomers`, and the Floating Tab fallback when `reviews_tab` is `null`. Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Pop-up Reviews, Review Snippets, Questions & Answers, Happy Customers, and the enabled new Review Widget each add one public request and reuse the batch's settings. An explicit disabled-widget sample preview adds a second request to Judge.me's sample endpoint. AI Reviews Summary adds no Judge.me data request because its content comes from a Shopify Storefront API metafield. Trust Badge also adds no Judge.me loader read, but it requires one server-only Shopify Admin GraphQL read because its eight shop metafields are not Storefront-visible on the current fixture. The large settings/CSS payload remains shared. Awaiting the data keeps Judge.me-owned DOM outside a streamed Suspense boundary, which prevents its runtime from racing hydration.

```ts
import {
  AiReviewsSummary,
  AllReviewsCounter,
  AllReviewsWidget,
  CardsCarousel,
  createAiReviewsSummaryData,
  createCardsCarouselData,
  createHappyCustomersData,
  createPopupReviewsData,
  createQuestionsAndAnswersData,
  createReviewSnippetsData,
  createReviewWidgetV3Data,
  createReviewsGridData,
  createTestimonialsCarouselData,
  createTrustBadgeData,
  createVideosCarouselData,
  fetchCardsCarouselPage,
  fetchHappyCustomersPage,
  fetchLegacyStorefrontWidgets,
  fetchPopupReviewsPage,
  fetchQuestionsAndAnswersPage,
  fetchReviewSnippetsPage,
  fetchReviewWidgetV3Page,
  fetchReviewsGridPage,
  fetchTestimonialsCarouselPage,
  fetchTrustBadgeMetafields,
  fetchVideosCarouselPage,
  FloatingReviewsTab,
  getShopifyNumericId,
  HappyCustomers,
  JudgeMeMedals,
  JudgeMeProvider,
  LegacyReviewWidget,
  PopupReviews,
  QuestionsAndAnswers,
  ReviewsCarousel,
  ReviewsGrid,
  ReviewSnippets,
  ReviewWidgetV3,
  StarRatingBadge,
  TestimonialsCarousel,
  TrustBadge,
  UgcMediaGrid,
  VerifiedReviewsCounter,
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

const reviewSnippetsConfig = {
  reviewSelection: "current_product",
  showReviewMedia: true,
} as const;

const reviewSnippetsPage = await fetchReviewSnippetsPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  productId: getShopifyNumericId(product.id),
  config: reviewSnippetsConfig,
  signal: request.signal,
});

const questionsAndAnswersPage = await fetchQuestionsAndAnswersPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  productId: getShopifyNumericId(product.id),
  signal: request.signal,
});

const happyCustomersPage = await fetchHappyCustomersPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
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

const reviewSnippets = createReviewSnippetsData({
  config: reviewSnippetsConfig,
  page: reviewSnippetsPage,
  productId: getShopifyNumericId(product.id),
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
});

const questionsAndAnswers = createQuestionsAndAnswersData({
  page: questionsAndAnswersPage,
  productId: getShopifyNumericId(product.id),
  productTitle: product.title,
  productHandle: product.handle,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
});

const reviewWidgetV3Page = await fetchReviewWidgetV3Page({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  productId: getShopifyNumericId(product.id),
  signal: request.signal,
});

const reviewWidgetV3 = reviewWidgetV3Page
  ? createReviewWidgetV3Data({
      page: reviewWidgetV3Page,
      productId: getShopifyNumericId(product.id),
      productTitle: product.title,
      productHandle: product.handle,
      settings: widgets.resources.settings,
      shopAggregate: {
        count: widgets.allReviewsCounter.count,
        rating: Number(widgets.allReviewsCounter.rating),
      },
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
      shopReviewsCount: happyCustomersPage.numberOfShopReviews,
      config: {showStoreReviews: true},
    })
  : null;

// Server-only: never return SHOPIFY_ADMIN_ACCESS_TOKEN from the loader.
const trustBadgeMetafields = await fetchTrustBadgeMetafields({
  adminAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  apiVersion: env.SHOPIFY_ADMIN_API_VERSION ?? "2026-04",
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  signal: request.signal,
});

const trustBadge = createTrustBadgeData({
  metafields: trustBadgeMetafields,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
});

const happyCustomers = createHappyCustomersData({
  aggregate: {
    count: widgets.allReviewsCounter.count,
    rating: Number(widgets.allReviewsCounter.rating),
  },
  legacyHtml: widgets.allReviewsWidget.html,
  page: happyCustomersPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
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
  {widgets.verifiedReviewsCounter ? (
    <VerifiedReviewsCounter
      data={{ ...widgets.verifiedReviewsCounter, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {widgets.medals ? (
    <JudgeMeMedals
      data={{ ...widgets.medals, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {widgets.ugcMediaGrid ? (
    <UgcMediaGrid
      data={{ ...widgets.ugcMediaGrid, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {trustBadge ? <TrustBadge data={trustBadge} /> : null}
  {happyCustomers ? <HappyCustomers data={happyCustomers} /> : null}
  {aiReviewsSummary ? <AiReviewsSummary data={aiReviewsSummary} /> : null}
  <ReviewSnippets data={reviewSnippets} />
  <QuestionsAndAnswers data={questionsAndAnswers} />
  {reviewWidgetV3 ? <ReviewWidgetV3 data={reviewWidgetV3} /> : null}
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

`includeStyles={false}` prevents the product badge, Verified Reviews Counter, Medals, UGC Media Grid, aggregate counter, carousel, All Reviews Widget, and floating tab from emitting duplicate copies of the shared dashboard CSS; the Review Widget emits it once for all nine. When rendering one widget, use its standalone fetcher and leave `includeStyles` at its default `true` where available. Use `fetchLegacyProductWidgets` when a route needs only the two product widgets.

`VerifiedReviewsCounter` is eligibility-aware. `fetchVerifiedReviewsCounter` returns `null` when Judge.me's public `verified_badge` response is `null`, which currently means the store has not reached the 20-verified-review requirement. Do not substitute the All Reviews count: that includes reviews Judge.me does not classify as verified.

`JudgeMeMedals` is also eligibility-aware. `fetchJudgeMeMedals` returns `null` when Judge.me has no earned-medal markup, and otherwise preserves every earned medal plus the exact verified-only rating and count from Judge.me's cache response. The host needs `judgeme-public-images.imgix.net` in `connect-src` and `img-src`. On compact layouts the component shows three medals at once and rotates through the rest, with its timer released on SPA unmount.

`UgcMediaGrid` is publication-aware. Exact cache markup is used when available; otherwise `fetchUgcMediaGrid` reads the tokenless `/reviews/social_posts` feed and reconstructs only Judge.me's official hidden-JSON shell. Visible markup and interactions still come from the current public bundles. HTTP 404 or an empty feed returns `null`. Instagram media may require `https://*.cdninstagram.com` and `https://*.fbcdn.net` in the host's image, media, and frame CSP directives.

`TrustBadge` is eligibility- and enablement-aware. `fetchTrustBadgeMetafields` needs a server-side Shopify Admin access token because the current `judgeme.trust_badge.*` shop metafields are not exposed through Storefront GraphQL. `createTrustBadgeData` returns `null` for zero verified reviews and, by default, when the badge is disabled. A theme-editor-style harness may explicitly pass `previewWhenDisabled: true` and must label that output as a preview. The normalized browser payload excludes the raw modal's redundant `photo_gallery` customer records. The host must supply the current `v3AssetBaseUrl`; opening the modal then uses Judge.me's tokenless verified-review feed.

`HappyCustomers` is an exact current extension mount with a public-data fallback. `fetchHappyCustomersPage` reads the tokenless `all_reviews_js_based` endpoint, while `createHappyCustomersData` reuses the batched All Reviews aggregate, histogram, and dashboard settings. It returns `null` when `all_reviews_widget_v2025_enabled` is false unless a theme-editor-style harness explicitly requests and labels `previewWhenDisabled`. The exact manager owns Product/Store tabs, filters, sorting, pagination, media, and the Write a review flow. A tab that was not seeded by the loader performs one lazy tokenless browser read. The host must allow `https://judgeme.imgix.net` in `img-src` for reviewer avatars.

`AllReviewsCounter` is the store-wide aggregate, including product and shop reviews. Its standalone fetcher calls `all_reviews_count` and `all_reviews_rating`; the batched loader reads the equivalent values from the `all_reviews_page` header. Dashboard templates are rendered as escaped text, and unsafe `javascript:` destinations are not emitted.

The host application must allow Judge.me's script, style, API, media, and image hosts in its Content Security Policy. Exact extension adapters also require `https://cdn.shopify.com` in script, style, connect, font, and image policies. Happy Customers reviewer avatars additionally require `https://judgeme.imgix.net` in `img-src`. The Hydrogen example in this repository contains the tested configuration. It preserves `'self'` when overriding `scriptSrc` and permits Vite's local blob worker with `workerSrc: ["'self'", 'blob:']`.

`ReviewsCarousel` implements Judge.me's classic carousel, sometimes called the legacy Reviews Carousel. It is not an adapter for the newer Cards, Testimonials, or Videos carousel blocks.

`AllReviewsWidget` uses Judge.me's official platform-independent marker and CDN styling, but React owns its interactive request lifecycle. Judge.me's `arp.js` normally pages through a cache-server contract; the adapter instead captures the same controls and reads `all_reviews_page` with the public token. Do not infer the API batch size from the header's `data-per-page`: on the current store the header says 10 while the endpoint returns 25 reviews per full page. The adapter records the largest observed batch size and uses returned review counts to detect the end.

`FloatingReviewsTab` prefers Judge.me's official markup. Its fallback exists because the official endpoint returns `null` when the Awesome-only tab is unavailable, even though `all_reviews_page` remains readable with the same public token. The fallback uses Judge.me's returned reviews and dashboard settings; it does not invent review content. Its `position` prop mirrors the Shopify app-embed setting because that setting lives in the theme editor rather than the Judge.me API.

`LegacyReviewWidget` intentionally implements Judge.me's public platform-independent Review Widget contract. When a store has the new Review Widget enabled, the fetch helper preserves its dashboard-generated text, colors, and other shared settings but disables the v3-only `review_widget_revamp_enabled` flag for the legacy runtime.

`ReviewWidgetV3` uses the exact current Shopify extension manager and styles. Its initial `reviews_for_widget` read is tokenless and returns structured JSON only when the new widget is enabled; a legacy HTML response becomes `null`. A theme-editor-style harness may set `previewWhenDisabled: true`, but must label the official sample content as a preview. The host supplies the current validated `v3AssetBaseUrl`. Current media CSP can require `vimeo.com` in `connect-src`, `i.vimeocdn.com` in `img-src`, and `player.vimeo.com` in `frame-src`; Judge.me's official sample currently also uses `i.ibb.co` images.

`ReviewsGrid` is an exact v3 client mount. The host must supply the current `https://cdn.shopify.com/extensions/<deployment>/<handle>/assets/` base because Judge.me can change it between extension deployments. Use `fetchReviewsGridPage` beside `fetchLegacyStorefrontWidgets` to add only one request to the product loader, then pass the shared settings and All Reviews aggregate through `createReviewsGridData`. The grid marker is server-rendered, but the review cards are mounted on the client by Judge.me's module.

`CardsCarousel` is an exact hybrid mount. Its page fetch is tokenless; the block shell is server-rendered; Judge.me's current `carousels.css`, `carousels.js`, `media_carousel.js`, and `video_carousel.js` build and move the cards; and the deployment manifest resolves the v3 review lightbox. The adapter seeds the server-fetched reviews before the SPA-root scanner runs, so hydration does not repeat the CDN data request. For `reviewSelection: "cart"`, pass the current cart's product IDs in `selectedProductIds`; the adapter maps them to the equivalent public custom-product read.

`TestimonialsCarousel` is also a hybrid exact mount. Its page fetch uses the same tokenless endpoint with `carousel_type=testimonials`; `carousels.css`, `carousels.js`, and `testimonials_carousel.js` build the one-card-at-a-time quote carousel; and the manifest-resolved lightbox remains shared. React supplies the block's serialized theme-editor configuration and owns navigation, autoplay pause/resume, and unmount cleanup. The full setting surface is typed by `TestimonialsCarouselConfig`; `transitionSpeed: 0` disables autoplay, and `arrowsPosition: "hidden"` removes navigation controls. Cart mode uses the same explicit `selectedProductIds` workaround as Cards Carousel.

`VideosCarousel` is the media-focused exact mount. Its tokenless request sets `carousel_type=videos` and maps `reviewType` to Judge.me's required `video`, `photo_and_video`, or `all` value. The component reuses Judge.me's deployed carousel CSS, media-card builder, player/navigation scanner, and manifest-resolved lightbox. `VideosCarouselConfig` covers the current theme-block selection, star/media filters, Highlight/Perspective layout, sizing, colors, arrows, border/shadow, autoplay, transition, and header controls. Videos-only mode requires at least three returned cards, matching Judge.me's documented minimum. The current fixture verifies photo cards and the image lightbox; iframe playback still requires seeded video reviews.

`PopupReviews` is a native global embed. Its tokenless request maps the dashboard's recent, picture-first, or featured selection to the existing public carousel feed, while `PopupReviewsConfig` comes from the shared Judge.me settings response. Mount it once near the application root in a complete storefront; pass an explicit `pageType` when route metadata is available. Product-picture mode needs `productImageUrlsByHandle` from the host's Storefront API because the public review feed does not consistently include base product images. The adapter never needs the private Judge.me token and never serializes reviewer contact or IP fields.

`AiReviewsSummary` is a store-level exact mount. Query `shop.metafield(namespace: "judgeme", key: "store_summary_widget_data") { value }` with Shopify's Storefront API and pass that value to `createAiReviewsSummaryData`; missing data returns `null`. The public status route is useful for generation diagnostics but does not contain the summary. Layout, visibility, sizing, corner, and color values belong to the Shopify app block, so the headless host must supply them through `AiReviewsSummaryConfig`. Judge.me's current module renders the generated summary, translations, keywords, aggregate, disclaimer, and verified branding; it does not currently consume a separately verified review-highlights field. No private Judge.me token is required.

`ReviewSnippets` is an exact current extension mount backed by `api.judge.me/reviews/reviews_for_review_snippet_widget`. Use `fetchReviewSnippetsPage` beside the shared storefront batch, then pass its result and shared settings to `createReviewSnippetsData`. The React marker carries the current product/cart selection, filters, sizing, arrows, autoplay, media, corner, and color settings. Judge.me's module insists on fetching its own URL, so the adapter gives it the already validated loader response through an exact-URL, GET-only preload bridge and releases that response on unmount. No private token is required. Judge.me officially gates theme installation to Awesome; the current Free-plan public response is a compatibility workaround, not an entitlement guarantee.

`QuestionsAndAnswers` is a native compatibility surface because Judge.me exposes Q&A only as an internal new-Review-Widget tab, not as a standalone extension entry. `fetchQuestionsAndAnswersPage` reads the current tokenless product feed; `submitQuestion` sends Judge.me's real multipart shopper form without either token. The component consumes dashboard labels, colors, typography, corners, reviewer/date settings, pagination, and the moderation success state. Keep the browser POST a simple multipart request: do not set `Content-Type`, because Judge.me's route currently allows the POST response cross-origin but does not answer preflights. Judge.me officially gates its Shopify Q&A UI to Awesome; the public route is an interoperability contract that must be monitored.

The Widget API response is treated as trusted third-party HTML. The helper rejects script tags, inline event handlers, and `javascript:` URLs before the payload reaches server rendering. Judge.me's runtime is loaded from its CDN after React hydration and is never copied into this package.
