# @judgeme-react/core

Alpha React adapters for Judge.me storefront widgets, built for headless Shopify and Hydrogen.

The package is intentionally framework-neutral. Hydrogen is a consumer under `examples/hydrogen`, not a dependency of this package.

This is a compatibility project rather than an official Judge.me package. It combines documented public Widget API reads, tokenless CDN reads, Shopify metafields, and current Judge.me browser modules. Pin alpha versions and run the compatibility harness before upgrading.

## Install

The package is ESM-only and expects React 18.3 or 19:

```sh
bun add @judgeme-react/core
```

Server loaders fetch and validate public Judge.me data. React components receive those serializable payloads and progressively initialize the matching browser runtime. Never pass a Judge.me private token or Shopify Admin token to `JudgeMeProvider`.

## Get your Judge.me credentials

This package needs the store's permanent `*.myshopify.com` domain and its **Public API Token**:

1. Open the [Judge.me admin](https://judge.me/).
2. Go to **Settings > Integrations**.
3. Click **View API tokens** in the top-right corner.
4. Copy the **Public API Token** and the shop domain shown on that page.
5. Store them in server environment variables such as `JUDGEME_PUBLIC_TOKEN` and `JUDGEME_SHOP_DOMAIN`.

The public token is designed for public Widget API GET requests and is available without the Awesome plan. It may be serialized to `JudgeMeProvider`, although keeping the environment variable on the server still avoids accidental logging and configuration drift. See Judge.me's official [API credential guide](https://judge.me/help/en/articles/8409180-using-judge-me-api).

Do not use the **Private API Token** for this package. The current adapters do not need it, and it must never enter loader data, browser JavaScript, React props/context, logs, fixtures, or committed files.

Shopify Headless, Storefront API, Customer Account API, and optional Shopify Admin credentials belong to the consuming application rather than this framework-neutral package. The repository's `examples/hydrogen` README explains where to obtain and how to map them for Hydrogen.

The package has three public entry points:

- `@judgeme-react/core/server` contains fetchers, normalizers, data combiners, Shopify ID helpers, and v3 asset discovery. Import it only from server loaders or server modules.
- `@judgeme-react/core/react` is the client boundary for providers, components, and component prop types.
- `@judgeme-react/core` remains the all-in-one compatibility entry point for Hydrogen and other bundlers without React Server Components.

## Quick start

Fetch Judge.me data in the product loader. The public token is valid for these public Widget API reads; the private Judge.me token is not used.

```ts
import {
  fetchLegacyProductWidgets,
  getShopifyNumericId,
} from "@judgeme-react/core/server";

const judgeMe = await fetchLegacyProductWidgets({
  productId: getShopifyNumericId(product.id),
  publicToken: context.env.JUDGEME_PUBLIC_TOKEN,
  shopDomain:
    context.env.JUDGEME_SHOP_DOMAIN ?? context.env.PUBLIC_STORE_DOMAIN,
  signal: request.signal,
});

return {product, judgeMe};
```

Mount the provider once near the application root, then render each nullable widget independently. Batched legacy widgets should share one `JudgeMeWidgetStyles` mount.

```tsx
import {
  JudgeMeProvider,
  JudgeMeWidgetStyles,
  LegacyReviewWidget,
  StarRatingBadge,
} from "@judgeme-react/core/react";

<JudgeMeProvider
  config={{
    shopDomain: judgeMeShopDomain,
    publicToken: publicJudgeMeToken,
    v3AssetBaseUrl,
  }}
>
  <JudgeMeWidgetStyles data={judgeMe.resources} />

  {judgeMe.starRatingBadge ? (
    <StarRatingBadge
      data={{...judgeMe.starRatingBadge, ...judgeMe.resources}}
      includeStyles={false}
    />
  ) : null}

  {judgeMe.reviewWidget ? (
    <LegacyReviewWidget
      data={{...judgeMe.reviewWidget, ...judgeMe.resources}}
      includeStyles={false}
    />
  ) : null}
</JudgeMeProvider>;
```

The repository's `examples/hydrogen` app demonstrates the complete provider, CSP, asset discovery, shared loader, graceful per-widget degradation, and all implemented widgets. If you want an AI coding agent to integrate the package into an existing storefront, copy [the setup prompt](./SETUP_PROMPT.md) into that project.

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
| New Shopify v3 Review Widget | Implemented with the tokenless structured feed, exact deployment manager/styles, dashboard settings, and review form          |

Every current `JUDGE_ME_WIDGETS` catalog entry has a data adapter, public component, tests, and a Hydrogen integration. The review-widget entry offers both the platform-independent legacy implementation and the exact current Shopify v3 implementation.

## Merchant activation

Installing a React component does not enable the matching Judge.me feature. Judge.me splits configuration across its admin, Shopify app embeds, Shopify app blocks, generated metafields, and the review data itself.

Start with the shared app embed:

1. In Shopify Admin, go to **Online Store > Themes > Customize > App embeds**.
2. Enable **Judge.me** on the published theme.
3. Save the theme.
4. Point `JUDGEME_STOREFRONT_URL` at a public HTTPS page on that theme so the server can discover the current extension deployment.

You do not need to add every Judge.me app block to the Online Store theme just to render its React counterpart. Some features still need a dashboard upgrade, an app block, or eligible content before Judge.me returns production data:

| Widget or feature                                                                                                             | Plan    | Merchant action                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [New Review Widget](https://judge.me/help/en/articles/12460582-customizing-the-review-widget-new-version)                     | Free    | Open **Judge.me Admin > Settings > Widgets > Review Widget**, click **Upgrade now**, then confirm **Upgrade Widget**. Newer installations may already use it. The legacy and new widgets are separate package components.                                                 |
| [Happy Customers, new version](https://judge.me/help/en/articles/13653546-customizing-the-happy-customers-widget-new-version) | Awesome | Open **Settings > Widgets > Happy Customers Widget**, click **Upgrade now**, then confirm. The migration can take several minutes.                                                                                                                                        |
| [Trust Badge](https://judge.me/help/en/articles/15281873-trust-badge)                                                         | Free    | Publish at least one verified review. Then open **Settings > Widgets > Customize**, enable **Trust Badge** under Install, and save. The package also needs a server-only Shopify Admin token to read its shop metafields.                                                 |
| [Questions & Answers](https://judge.me/help/en/articles/8420858-questions-and-answers-widget-q-a-widget)                      | Awesome | Open **Settings > Widgets > Questions and Answers**, enable **Let customers ask questions**, and save. Submitted questions remain hidden until a merchant explicitly publishes them under **Reviews > Customer questions**; replying does not publish them automatically. |
| [AI Reviews Summary](https://judge.me/help/en/articles/13672572-ai-reviews-summary-widget)                                    | Awesome | Collect more than five published text reviews, then add the **AI Reviews Summary (Paid)** block to an Online Store 2.0 template with real data selected. Wait for Judge.me to generate `shop.metafields.judgeme.store_summary_widget_data`.                               |
| [UGC Media Grid](https://judge.me/help/en/articles/8420861-ugc-instagram-shopping-widget)                                     | Free    | Connect a professional Instagram account under **Settings > Social sharing > Connect**. Then open **Settings > Widgets > UGC Instagram Shopping** and publish at least one fetched post.                                                                                  |
| [Videos Carousel](https://judge.me/help/en/articles/11883318-videos-carousel)                                                 | Free    | Publish reviews with real video media. Videos-only mode currently stays hidden below three matching cards.                                                                                                                                                                |
| Verified Reviews Counter                                                                                                      | Free    | No toggle is needed, but Judge.me requires at least 20 verified published reviews. Below that threshold the fetcher returns `null`.                                                                                                                                       |
| Judge.me Medals                                                                                                               | Free    | No toggle is needed. Only medals earned under Judge.me's eligibility rules are returned.                                                                                                                                                                                  |

Judge.me officially gates Floating Reviews Tab, Pop-up Reviews, Review Snippets, Questions & Answers, AI Reviews Summary, and Happy Customers to the Awesome plan. This package has public-data compatibility paths for some of them:

- `FloatingReviewsTab` falls back to the public All Reviews feed when the official endpoint returns `null`.
- `PopupReviews` is implemented in React and does not need the separate Pop-up Widget app embed to mount in Hydrogen.
- Review Snippets and Q&A currently have tokenless public routes. Their availability on a lower plan is not an entitlement guarantee, and Judge.me can close or change those routes.

Production fetchers return `null` or an honest empty state when a feature is disabled or lacks eligible content. Sample feeds and disabled previews require explicit opt-in and must be visibly labeled.

### Theme block settings do not sync to React

Shopify theme-editor settings belong to one Liquid app-block instance. They are not all present in Judge.me's public settings response, so changing a block in the theme editor does not update the Hydrogen component.

Pass block-level values through the component's typed config. This includes review selection, product IDs, columns, rows, maximum width, card sizing, arrows, autoplay, transitions, per-instance colors, and empty-state behavior. Global Judge.me labels, legacy colors, and branding settings are reused where the public settings response exposes them.

## Known limitations

- This is an unofficial compatibility layer. Exact widgets use deployment-specific Shopify extension modules and tokenless endpoints that Judge.me can change without a public API version bump.
- Automatic asset discovery can fail when the Online Store page is password-protected, rate-limited, or unavailable. Cache the discovered deployment and keep an optional last-known-good `JUDGEME_V3_ASSET_BASE_URL` fallback for cold starts.
- Exact widgets need Judge.me's browser JavaScript for their complete layout, forms, media, lightboxes, and controls. They are not pure server components.
- Judge.me's mutable browser globals support one Shopify store and one extension deployment per document.
- The host application owns CSP. It must allow the Judge.me API/CDN, current `cdn.shopify.com` extension assets, review media hosts, and any required video frame origins.
- The Judge.me private token is never needed in React. The Shopify Admin token used for Trust Badge and the optional AI-summary fallback is also server-only. Do not serialize either token through loaders, provider config, logs, fixtures, or browser bundles.
- Shopify Customer Account, checkout, Thank you, and Order status extensions run in Shopify-owned UI-extension surfaces and are outside this storefront package.
- Live fixture coverage still needs real video playback, published Q&A with moderation, and published UGC. These are verification gaps rather than missing component implementations.

## Fixture verification

Implementation coverage and live-state verification are tracked separately:

| Verification tier                  | Widgets and states                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live enabled data and interactions | Star Rating Badge, Verified Reviews Counter, Judge.me Medals, Trust Badge, Happy Customers, AI Reviews Summary, All Reviews Counter, classic Reviews Carousel, legacy Review Widget, multilingual v3 Review Widget, All Reviews Widget, exact Floating Reviews Tab, Reviews Grid, Cards Carousel photo mode, Testimonials Carousel, Pop-up Reviews, and Review Snippets |
| Correct live empty/disabled state  | UGC Media Grid and Questions & Answers                                                                                                                                                                                                                                                                                                                                  |
| Partial media verification         | Videos Carousel photo/video selection, navigation, and image lightbox are verified; actual video iframe playback and autoplay still need a published video-review fixture                                                                                                                                                                                               |

Before a stable release, close the remaining real-state gaps with authorized fixtures: a published video review, published Q&A plus one end-to-end moderated submission, and published UGC. Disabled previews and sample feeds are never presented as production store data.

## Current API boundary

- `JudgeMeProvider` exposes public store configuration and injected runtime adapters. `onRuntimeStatusChange` observes exact-widget loading/ready/error transitions; `onRuntimeError` provides a central monitoring hook and replaces default console logging.
- `resolveJudgeMeV3AssetDeployment` discovers the current Judge.me Shopify extension from public theme HTML, validates manifest sentinels, caches the result, serves stale cache on transient refresh failure, and accepts a last-known-good fallback URL.
- `normalizeJudgeMeV3AssetBaseUrl` validates a manually supplied deployment URL without performing a network request.
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
- `fetchLegacyStorefrontWidgets` fetches all nine implemented legacy widgets, reuses one Medals/UGC cache response for shared settings/CSS, and reuses All Reviews data for the aggregate counter and Free-plan Floating Tab fallback. Every widget field is nullable: one failed endpoint or invalid payload removes only that widget.
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
- `fetchAiReviewsSummaryMetafield` reads that one public-display metafield through server-only Shopify Admin GraphQL when Storefront GraphQL returns `null`; the access token is sent only in the request header.
- `createAiReviewsSummaryData` combines the metafield value with the app block's layout settings and shared public settings.
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

## Automatic v3 asset discovery

Exact widgets depend on Judge.me's current Shopify extension deployment. Resolve that URL in a server loader instead of hardcoding a deployment UUID:

```ts
import { resolveJudgeMeV3AssetDeployment } from "@judgeme-react/core";

const deployment = await resolveJudgeMeV3AssetDeployment({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  storefrontUrl: env.JUDGEME_STOREFRONT_URL,
  fallbackAssetBaseUrl: env.JUDGEME_V3_ASSET_BASE_URL,
});
```

`storefrontUrl` must be a public HTTPS Online Store page where the Judge.me app embed is enabled. The resolver extracts every Shopify extension asset base, fetches each `manifest.json`, and accepts only a deployment containing the current Judge.me sentinel entries. Successful results are cached for 15 minutes and may be served stale for 24 hours when a refresh fails. Discovery has a five-second timeout. `fallbackAssetBaseUrl` should be the last deployment verified by your compatibility job; it is used when Shopify blocks or rate-limits theme HTML reads.

Pass only the resolved public URL to React:

```tsx
<JudgeMeProvider
  config={{
    shopDomain: env.JUDGEME_SHOP_DOMAIN,
    publicToken: env.JUDGEME_PUBLIC_TOKEN,
    v3AssetBaseUrl: deployment.assetBaseUrl,
  }}
  onRuntimeError={({ widget, phase, error }) => {
    reportError(error, { widget, phase });
  }}
>
  {children}
</JudgeMeProvider>
```

The resolver is server-only operational logic. Do not call it from a browser component and do not derive `storefrontUrl` from shopper input.

## Implemented widgets

Fetch the nine legacy widgets plus the v3 grid, Cards, Testimonials, Videos, Popup, Review Snippets, Questions & Answers, Happy Customers, the new Review Widget, and Trust Badge data in a server loader. The exact-cache legacy batch makes seven requests: `product_review`, `preview_badge`, `featured_carousel`, `reviews_tab`, `verified_badge`, `all_reviews_page`, and one platform-independent cache read containing Medals, UGC, `settings`, and `html_miracle`. If UGC is absent from that response, one tokenless social-post compatibility read is added. The same All Reviews response supplies `AllReviewsWidget`, the aggregate values and histogram for `AllReviewsCounter` and `HappyCustomers`, and the Floating Tab fallback when `reviews_tab` is `null`.

Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Pop-up Reviews, Review Snippets, Happy Customers, and an enabled new Review Widget each add one public request and reuse the batch's settings. Fetch Questions & Answers only when `normalizeQuestionsAndAnswersConfig(settings).dashboardEnabled` is true; do not use the sample endpoint as storefront content. AI Reviews Summary adds no Judge.me request: read its metafield with Storefront GraphQL first and use `fetchAiReviewsSummaryMetafield` as a server-only Admin fallback when necessary. Trust Badge requires its own server-only Admin metafield read. The batch and standalone exact fetchers isolate optional dependencies, discard malformed collection rows, and default malformed optional metadata. Unsafe HTML and mismatched product or selection data still fail closed. Awaiting the resulting payload keeps Judge.me-owned DOM outside a streamed Suspense boundary and prevents its runtime from racing hydration.

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
  fetchAiReviewsSummaryMetafield,
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
  JudgeMeWidgetStyles,
  LegacyReviewWidget,
  normalizeQuestionsAndAnswersConfig,
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

const qnaEnabled = normalizeQuestionsAndAnswersConfig(
  widgets.resources.settings,
).dashboardEnabled;
const questionsAndAnswersPage = qnaEnabled
  ? await fetchQuestionsAndAnswersPage({
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
      productId: getShopifyNumericId(product.id),
      signal: request.signal,
    })
  : null;

const happyCustomersPage = await fetchHappyCustomersPage({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  signal: request.signal,
});

const aggregate = widgets.allReviewsCounter
  ? {
    count: widgets.allReviewsCounter.count,
    rating: Number(widgets.allReviewsCounter.rating),
    }
  : null;

const reviewsGrid = aggregate
  ? createReviewsGridData({
      aggregate,
      page: reviewsGridPage,
      settings: widgets.resources.settings,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
    })
  : null;

const cardsCarousel = aggregate
  ? createCardsCarouselData({
      aggregate,
      page: cardsCarouselPage,
      settings: widgets.resources.settings,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
      styles: widgets.resources.styles,
    })
  : null;

const testimonialsCarousel = aggregate
  ? createTestimonialsCarouselData({
      aggregate,
      page: testimonialsCarouselPage,
      settings: widgets.resources.settings,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
      styles: widgets.resources.styles,
    })
  : null;

const videosCarousel = aggregate
  ? createVideosCarouselData({
      aggregate,
      config: { reviewType: "photos-and-videos" },
      page: videosCarouselPage,
      settings: widgets.resources.settings,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
      styles: widgets.resources.styles,
    })
  : null;

const popupReviews = createPopupReviewsData({
  page: popupReviewsPage,
  settings: widgets.resources.settings,
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
});

// Server-only fallback: never return SHOPIFY_ADMIN_ACCESS_TOKEN from the loader.
const storefrontSummary = shop.judgeMeStoreSummaryWidgetData?.value ?? null;
const adminSummary =
  !storefrontSummary && env.SHOPIFY_ADMIN_ACCESS_TOKEN
    ? await fetchAiReviewsSummaryMetafield({
        adminAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        apiVersion: env.SHOPIFY_ADMIN_API_VERSION ?? "2026-04",
        shopDomain: env.JUDGEME_SHOP_DOMAIN,
        signal: request.signal,
      })
    : null;
const aiReviewsSummary = createAiReviewsSummaryData({
  metafieldValue: storefrontSummary ?? adminSummary,
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

const questionsAndAnswers = questionsAndAnswersPage
  ? createQuestionsAndAnswersData({
      page: questionsAndAnswersPage,
      productId: getShopifyNumericId(product.id),
      productTitle: product.title,
      productHandle: product.handle,
      settings: widgets.resources.settings,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
    })
  : null;

const reviewWidgetV3Page = await fetchReviewWidgetV3Page({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  productId: getShopifyNumericId(product.id),
  signal: request.signal,
});

const reviewWidgetV3 = reviewWidgetV3Page && aggregate
  ? createReviewWidgetV3Data({
      page: reviewWidgetV3Page,
      productId: getShopifyNumericId(product.id),
      productTitle: product.title,
      productHandle: product.handle,
      settings: widgets.resources.settings,
      shopAggregate: aggregate,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
      shopReviewsCount: happyCustomersPage.numberOfShopReviews,
      config: { showStoreReviews: true },
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

const happyCustomers = aggregate && widgets.allReviewsWidget
  ? createHappyCustomersData({
      aggregate,
      legacyHtml: widgets.allReviewsWidget.html,
      page: happyCustomersPage,
      settings: widgets.resources.settings,
      shopDomain: env.JUDGEME_SHOP_DOMAIN,
    })
  : null;
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
  <JudgeMeWidgetStyles data={widgets.resources} />
  {widgets.starRatingBadge ? (
    <StarRatingBadge
      data={{ ...widgets.starRatingBadge, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {widgets.allReviewsCounter ? (
    <AllReviewsCounter
      data={{ ...widgets.allReviewsCounter, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
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
  {questionsAndAnswers ? (
    <QuestionsAndAnswers data={questionsAndAnswers} />
  ) : null}
  {reviewWidgetV3 ? <ReviewWidgetV3 data={reviewWidgetV3} /> : null}
  {cardsCarousel ? <CardsCarousel data={cardsCarousel} includeStyles={false} /> : null}
  {testimonialsCarousel ? <TestimonialsCarousel data={testimonialsCarousel} includeStyles={false} /> : null}
  {videosCarousel ? <VideosCarousel data={videosCarousel} includeStyles={false} /> : null}
  {widgets.reviewsCarousel ? (
    <ReviewsCarousel
      data={{ ...widgets.reviewsCarousel, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {widgets.reviewWidget ? (
    <LegacyReviewWidget
      data={{ ...widgets.reviewWidget, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {widgets.allReviewsWidget ? (
    <AllReviewsWidget
      data={{ ...widgets.allReviewsWidget, ...widgets.resources }}
      includeStyles={false}
    />
  ) : null}
  {reviewsGrid ? <ReviewsGrid data={reviewsGrid} /> : null}
  {widgets.floatingReviewsTab ? (
    <FloatingReviewsTab
      data={{ ...widgets.floatingReviewsTab, ...widgets.resources }}
      includeStyles={false}
      position="right"
    />
  ) : null}
  <PopupReviews data={popupReviews} pageType="product" />
</JudgeMeProvider>
```

`JudgeMeWidgetStyles` emits the shared dashboard CSS once for a batched response. Keep `includeStyles={false}` on every legacy component in that batch, including `LegacyReviewWidget`, so they do not emit duplicate copies. Mounting the shared styles explicitly is important even when the route uses exact v3 components: Judge.me's current v3 Review Widget still references the `JudgemeStar` icon font declared by the shared CSS. When rendering one legacy widget from a standalone fetcher, omit `JudgeMeWidgetStyles` and leave `includeStyles` at its default `true`. Use `fetchLegacyProductWidgets` when a route needs only the two product widgets.

`VerifiedReviewsCounter` is eligibility-aware. `fetchVerifiedReviewsCounter` returns `null` when Judge.me's public `verified_badge` response is `null`, which currently means the store has not reached the 20-verified-review requirement. Do not substitute the All Reviews count: that includes reviews Judge.me does not classify as verified.

`JudgeMeMedals` is also eligibility-aware. `fetchJudgeMeMedals` returns `null` when Judge.me has no earned-medal markup, and otherwise preserves every earned medal plus the exact verified-only rating and count from Judge.me's cache response. The host needs `judgeme-public-images.imgix.net` in `connect-src` and `img-src`. On compact layouts the component shows three medals at once and rotates through the rest, with its timer released on SPA unmount.

`UgcMediaGrid` is publication-aware. Exact cache markup is used when available; otherwise `fetchUgcMediaGrid` reads the tokenless `/reviews/social_posts` feed and reconstructs only Judge.me's official hidden-JSON shell. Visible markup and interactions still come from the current public bundles. HTTP 404 or an empty feed returns `null`. Instagram media may require `https://*.cdninstagram.com` and `https://*.fbcdn.net` in the host's image, media, and frame CSP directives.

`TrustBadge` is eligibility- and enablement-aware. `fetchTrustBadgeMetafields` needs a server-side Shopify Admin access token because the current `judgeme.trust_badge.*` shop metafields are not exposed through Storefront GraphQL. `createTrustBadgeData` returns `null` for zero verified reviews and, by default, when the badge is disabled. A theme-editor-style harness may explicitly pass `previewWhenDisabled: true` and must label that output as a preview. The normalized browser payload excludes the raw modal's redundant `photo_gallery` customer records. The host must supply the current `v3AssetBaseUrl`; opening the modal then uses Judge.me's tokenless verified-review feed.

`HappyCustomers` is an exact current extension mount with a public-data fallback. `fetchHappyCustomersPage` reads the tokenless `all_reviews_js_based` endpoint, while `createHappyCustomersData` reuses the batched All Reviews aggregate, histogram, and dashboard settings. It returns `null` when `all_reviews_widget_v2025_enabled` is false unless a theme-editor-style harness explicitly requests and labels `previewWhenDisabled`. The exact manager owns Product/Store tabs, filters, sorting, pagination, media, and the Write a review flow. A tab that was not seeded by the loader performs one lazy tokenless browser read. The host must allow `https://judgeme.imgix.net` in `img-src` for reviewer avatars.

`AllReviewsCounter` is the store-wide aggregate, including product and shop reviews. Its standalone fetcher calls `all_reviews_count` and `all_reviews_rating`; the batched loader reads the equivalent values from the `all_reviews_page` header. Dashboard templates are rendered as escaped text, and unsafe `javascript:` destinations are not emitted.

The host application must allow Judge.me's script, style, API, media, and image hosts in its Content Security Policy. Exact extension adapters also require `https://cdn.shopify.com` in script, style, connect, font, and image policies. Happy Customers reviewer avatars additionally require `https://judgeme.imgix.net` in `img-src`. The Hydrogen example in this repository contains the tested configuration. It preserves `'self'` when overriding `scriptSrc` and permits Vite's local blob worker with `workerSrc: ["'self'", 'blob:']`.

`ReviewsCarousel` implements Judge.me's classic carousel, sometimes called the legacy Reviews Carousel. It is not an adapter for the newer Cards, Testimonials, or Videos carousel blocks. Its card theme assumes Shopify's conventional `border-box` sizing while applying fixed heights, padding, and `overflow: hidden`; the component supplies that sizing rule within its own root so host resets cannot clip the reviewer footer.

`AllReviewsWidget` uses Judge.me's official platform-independent marker and CDN styling, but React owns its interactive request lifecycle. Judge.me's `arp.js` normally pages through a cache-server contract; the adapter instead captures the same controls and reads `all_reviews_page` with the public token. Do not infer the API batch size from the header's `data-per-page`: on the current store the header says 10 while the endpoint returns 25 reviews per full page. The adapter records the largest observed batch size and uses returned review counts to detect the end.

`FloatingReviewsTab` prefers Judge.me's official markup. Its fallback exists because the official endpoint returns `null` when the Awesome-only tab is unavailable, even though `all_reviews_page` remains readable with the same public token. The fallback uses Judge.me's returned reviews and dashboard settings; it does not invent review content. Its `position` prop mirrors the Shopify app-embed setting because that setting lives in the theme editor rather than the Judge.me API.

`LegacyReviewWidget` intentionally implements Judge.me's public platform-independent Review Widget contract. When a store has the new Review Widget enabled, the fetch helper preserves its dashboard-generated text, colors, and other shared settings but disables the v3-only `review_widget_revamp_enabled` flag for the legacy runtime.

`ReviewWidgetV3` uses the exact current Shopify extension manager and styles. Its initial `reviews_for_widget` read is tokenless and returns structured JSON only when the new widget is enabled; a legacy HTML response becomes `null`. The normalizer accepts both Judge.me's older top-level `reviews`/`pagination` contract and its current primary-/other-language streams. It removes malformed rows, fills invalid optional metadata from the valid page content, and passes the sanitized payload to the exact manager. A theme-editor-style harness may set `previewWhenDisabled: true`, but must label the official sample content as a preview. The host supplies the current validated `v3AssetBaseUrl`. The adapter delays its legacy `.jdgm-review-widget` marker until Judge.me's old runtime has snapshotted legacy roots, preventing Happy Customers' modal preloader from initializing the v3 root as a legacy form. Current media CSP can require `vimeo.com` in `connect-src`, `i.vimeocdn.com` in `img-src`, and `player.vimeo.com` in `frame-src`; Judge.me's official sample currently also uses `i.ibb.co` images.

`ReviewsGrid` is an exact v3 client mount. The host must supply the current `https://cdn.shopify.com/extensions/<deployment>/<handle>/assets/` base because Judge.me can change it between extension deployments. Use `fetchReviewsGridPage` beside `fetchLegacyStorefrontWidgets` to add only one request to the product loader, then pass the shared settings and All Reviews aggregate through `createReviewsGridData`. The grid marker is server-rendered, but the review cards are mounted on the client by Judge.me's module.

`CardsCarousel` is an exact hybrid mount. Its page fetch is tokenless; the block shell is server-rendered; Judge.me's current `carousels.css`, `carousels.js`, `media_carousel.js`, and `video_carousel.js` build and move the cards; and the deployment manifest resolves the v3 review lightbox. The adapter seeds the server-fetched reviews before the SPA-root scanner runs, so hydration does not repeat the CDN data request. For `reviewSelection: "cart"`, pass the current cart's product IDs in `selectedProductIds`; the adapter maps them to the equivalent public custom-product read.

`TestimonialsCarousel` is also a hybrid exact mount. Its page fetch uses the same tokenless endpoint with `carousel_type=testimonials`; `carousels.css`, `carousels.js`, and `testimonials_carousel.js` build the one-card-at-a-time quote carousel; and the manifest-resolved lightbox remains shared. React supplies the block's serialized theme-editor configuration and owns navigation, autoplay pause/resume, and unmount cleanup. The full setting surface is typed by `TestimonialsCarouselConfig`; `transitionSpeed: 0` disables autoplay, and `arrowsPosition: "hidden"` removes navigation controls. Cart mode uses the same explicit `selectedProductIds` workaround as Cards Carousel.

`VideosCarousel` is the media-focused exact mount. Its tokenless request sets `carousel_type=videos` and maps `reviewType` to Judge.me's required `video`, `photo_and_video`, or `all` value. The component reuses Judge.me's deployed carousel CSS, media-card builder, player/navigation scanner, and manifest-resolved lightbox. `VideosCarouselConfig` covers the current theme-block selection, star/media filters, Highlight/Perspective layout, sizing, colors, arrows, border/shadow, autoplay, transition, and header controls. Videos-only mode requires at least three returned cards, matching Judge.me's documented minimum. The current fixture verifies photo cards and the image lightbox; iframe playback still requires seeded video reviews.

`PopupReviews` is a native global embed. Its tokenless request maps the dashboard's recent, picture-first, or featured selection to the existing public carousel feed, while `PopupReviewsConfig` comes from the shared Judge.me settings response. Mount it once near the application root in a complete storefront; pass an explicit `pageType` when route metadata is available. Product-picture mode needs `productImageUrlsByHandle` from the host's Storefront API because the public review feed does not consistently include base product images. The adapter never needs the private Judge.me token and never serializes reviewer contact or IP fields.

`AiReviewsSummary` is a store-level exact mount. First query `shop.metafield(namespace: "judgeme", key: "store_summary_widget_data") { value }` with Shopify's Storefront API. If Shopify returns `null` even though Judge.me has generated the summary, call `fetchAiReviewsSummaryMetafield` from the server with a Shopify Admin token and pass the returned string to `createAiReviewsSummaryData`; missing data from both paths returns `null`. The public status route is useful for generation diagnostics but does not contain the summary. Layout, visibility, sizing, corner, and color values belong to the Shopify app block, so the headless host must supply them through `AiReviewsSummaryConfig`. Judge.me's current module renders the generated summary, translations, keywords, aggregate, disclaimer, and verified branding; it does not currently consume a separately verified review-highlights field. No private Judge.me token is required, and the Shopify Admin token must never cross the loader boundary.

`ReviewSnippets` is an exact current extension mount backed by `api.judge.me/reviews/reviews_for_review_snippet_widget`. Use `fetchReviewSnippetsPage` beside the shared storefront batch, then pass its result and shared settings to `createReviewSnippetsData`. The React marker carries the current product/cart selection, filters, sizing, arrows, autoplay, media, corner, and color settings. Judge.me's module insists on fetching its own URL, so the adapter gives it the already validated loader response through an exact-URL, GET-only preload bridge and releases that response on unmount. No private token is required. Judge.me officially gates theme installation to Awesome; the current Free-plan public response is a compatibility workaround, not an entitlement guarantee.

`QuestionsAndAnswers` is a native compatibility surface because Judge.me exposes Q&A only as an internal new-Review-Widget tab, not as a standalone extension entry. Check `normalizeQuestionsAndAnswersConfig(settings).dashboardEnabled` before fetching or mounting it. `fetchQuestionsAndAnswersPage` reads the current tokenless product feed; `submitQuestion` sends Judge.me's real multipart shopper form without either token. The component consumes dashboard labels, colors, typography, corners, reviewer/date settings, pagination, and the moderation success state. Keep the browser POST a simple multipart request: do not set `Content-Type`, because Judge.me's route currently allows the POST response cross-origin but does not answer preflights. Judge.me officially gates its Shopify Q&A UI to Awesome; the public route is an interoperability contract that must be monitored. Never present `preview_mode=sample_data` as published storefront questions.

In a combined loader, render every nullable result from `fetchLegacyStorefrontWidgets` independently and wrap each v3/optional adapter construction in its own error boundary. The batch retries shared resources through the standalone settings endpoints when its cache payload is unusable, then falls back to empty settings and any recoverable CSS. It also falls back to the aggregate endpoints if `all_reviews_page` fails. Collection adapters discard malformed records and default optional pagination or summary fields. They still reject executable HTML, mismatched product IDs, and mismatched selection data.

The Widget API response is treated as trusted third-party HTML. The helper rejects script tags, inline event handlers, and `javascript:` URLs before the payload reaches server rendering. Judge.me's runtime is loaded from its CDN after React hydration and is never copied into this package.
