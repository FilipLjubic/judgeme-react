# judgeme-react

Bring Judge.me's Shopify widgets to a React or headless storefront, including the styles and settings merchants already manage in Judge.me.

```sh
bun add judgeme-react
```

> [!WARNING]
> This is an unofficial, reverse-engineered compatibility library. It is not affiliated with or endorsed by Judge.me. It talks to public Judge.me APIs and CDN endpoints, reads public Shopify storefront data, and loads parts of Judge.me's current Shopify extension runtime. Judge.me can change those internals without warning, so pin the package version and test upgrades against a real store.

> [!TIP]
> These docs are written for coding agents. The recommended setup is to open your storefront repository in Codex, Claude Code, Cursor, or another agent that can inspect and edit the project, then give it the full [`SETUP_PROMPT.md`](https://github.com/FilipLjubic/judgeme-react/blob/main/packages/judgeme-react/SETUP_PROMPT.md). It will ask for the missing store choices first, then handle the provider, loaders, CSP, widget selection, fallbacks, and verification. Manual instructions remain below for reference and review.

## Why this exists

Judge.me works well in a Liquid theme because its app embed, app blocks, generated markup, settings payload, CSS, and browser runtime all arrive together. A headless React storefront does not get any of that automatically.

Judge.me's [official Hydrogen package](https://www.npmjs.com/package/@judgeme/shopify-hydrogen) is a much smaller, client-side integration. Its current release exposes eight older widgets, documents rendering flicker, and does not reproduce the current Shopify app-block runtime. `judgeme-react` takes the less tidy route: it reconstructs the pieces a Liquid storefront receives and adapts them to a React lifecycle.

That means this package can:

- reuse dashboard-level Judge.me colors, labels, branding, locale strings, and legacy widget CSS;
- mount current Shopify widget modules for newer surfaces such as Review Widget v3, Reviews Grid, and the new carousels;
- server-load initial review data instead of waiting for a client-only document scan;
- keep widgets isolated, so one broken or disabled Judge.me response does not take down the product page;
- expose typed React configuration for settings that normally live only on a Shopify theme block.

There is a trade-off. This gets much closer to the Shopify theme experience than a small API wrapper, but it is coupled to undocumented behavior. If you want a boring, permanent data contract, use Judge.me's supported APIs and build your own review UI instead.

## What carries over from Judge.me

| Configuration source | What happens in headless React |
| --- | --- |
| Judge.me dashboard settings returned by its public storefront payload | Reused automatically where the widget exposes them: colors, labels, branding, locale, rating display, legacy CSS, and feature flags |
| Judge.me review data and generated shop metafields | Loaded by the server adapters and passed to the matching widget |
| Shopify app embed | Must be enabled on a public Online Store theme so the library can discover the store's current Judge.me extension deployment |
| Shopify theme-editor app-block settings | They do not exist in the public Judge.me settings payload. Pass their typed equivalents through each component's `config` |
| Awesome-plan or content-gated features | The component renders only when Judge.me returns real eligible data, unless the package documents a public compatibility fallback |

## Get started with a coding agent

The fastest route is to give an agent the package's full integration brief. It asks you for the store, widgets, loading preference, feature state, and credentials before touching the app, then uses the working Hydrogen implementation as its reference.

1. Open [`SETUP_PROMPT.md`](https://github.com/FilipLjubic/judgeme-react/blob/main/packages/judgeme-react/SETUP_PROMPT.md).
2. Copy the whole prompt into Codex or your coding agent from inside the storefront repository.
3. Answer its setup questions in one message.
4. Let it implement and verify the integration.

The prompt recommends a server-first product integration, but it can defer below-the-fold widgets when that fits the existing app better.

## See it running

The [Hydrogen example](https://github.com/FilipLjubic/judgeme-react/tree/main/examples/hydrogen) is the compatibility harness and the best source to copy from. It includes the provider, server loaders, automatic asset discovery, CSP, nullable widget composition, and all implemented storefront components.

[The standalone gallery](https://github.com/FilipLjubic/judgeme-react/blob/main/docs/WIDGET_GALLERY.md) provides the same captures on one page. Every component is also shown below so npm users do not have to leave this README to understand the catalog.

Widgets with no eligible production data stay unmounted. The current live fixture has no published UGC, Q&A, or video-review playback case; those gaps are documented instead of being disguised as live customer content.

## Component gallery

Every image is a Brave capture of one component with the surrounding product page removed. Dashboard colors, labels, branding, locale strings, and star treatment are live Judge.me settings. Shopify theme-block choices come from the example's typed React config.

### Product review surfaces

#### Star Rating Badge

Compact product rating for a title, buy box, or product card.

![Star Rating Badge](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/star-rating-badge.jpeg)

#### Review Widget v3

Judge.me's current Shopify Review Widget with product/store tabs, filters, review cards, and the Write a review flow.

![Review Widget v3](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/review-widget-v3.jpeg)

#### Legacy Review Widget

The public platform-independent Review Widget and fallback for stores that do not return the v3 feed.

![Legacy Review Widget](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/legacy-review-widget.jpeg)

#### Questions & Answers

An independently placeable React Q&A feed and form. This screenshot uses Judge.me's visibly labeled, read-only `sample_data` preview because the fixture store has no published questions.

![Questions and Answers](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/questions-and-answers.jpeg)

### Store-wide reviews and trust

#### Happy Customers

Judge.me's current All Reviews v2025 experience with its histogram, review streams, filters, sorting, and pagination.

![Happy Customers](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/happy-customers.jpeg)

#### All Reviews Widget

The platform-independent All Reviews surface with product/shop streams and React-owned navigation.

![All Reviews Widget](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/all-reviews-widget.jpeg)

#### All Reviews Counter

Combined store rating and review count using the merchant's branded dashboard treatment.

![All Reviews Counter](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/all-reviews-counter.jpeg)

#### Verified Reviews Counter

Judge.me's exact branded verified-review badge. Judge.me returns it only after the store reaches its verified-review threshold.

![Verified Reviews Counter](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/verified-reviews-counter.jpeg)

#### Judge.me Medals

The medals currently earned by the store, together with Judge.me's verified-review summary.

![Judge.me Medals](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/judge-me-medals.jpeg)

#### Trust Badge

The compact Trust Badge. Selecting it opens Judge.me's verified-review modal.

![Trust Badge](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/trust-badge.jpeg)

#### AI Reviews Summary

Judge.me's generated shop summary, sourced from its Shopify metafield and rendered by the current extension module.

![AI Reviews Summary](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/ai-reviews-summary.jpeg)

### Carousels and visual proof

#### Cards Carousel

The current visual review-card carousel and media lightbox surface.

![Cards Carousel](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/cards-carousel.jpeg)

#### Testimonials Carousel

One-at-a-time quote cards with React-owned arrows and autoplay lifecycle.

![Testimonials Carousel](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/testimonials-carousel.jpeg)

#### Videos Carousel

The current media carousel in photo/video selection mode. The fixture has photo cards but no published video playback case, so this image demonstrates the media layout rather than iframe playback.

![Videos Carousel](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/videos-carousel.jpeg)

#### Classic Reviews Carousel

Judge.me's older fixed-height Reviews Carousel for storefronts that use its classic design.

![Classic Reviews Carousel](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/reviews-carousel.jpeg)

#### Review Snippets

The compact rotating product or cart review strip. Its loader first tries Judge.me's dedicated tokenless feed and automatically normalizes the public Cards Carousel feed when that route is unavailable. `page.requestUrl` remains the URL expected by Judge.me's browser module, while `page.sourceUrl` identifies the public feed that supplied the reviews. Neither path needs a private token.

![Review Snippets](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/review-snippets.jpeg)

#### Reviews Grid

Judge.me's current extension-driven review and media grid.

![Reviews Grid](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/reviews-grid.jpeg)

#### UGC Media Grid

The Instagram shopping grid rendered through Judge.me's current browser runtime. This screenshot uses a clearly documented local post fixture because the live store has no published UGC posts.

![UGC Media Grid fixture](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/ugc-media-grid.jpeg)

### Global overlays

#### Floating Reviews Tab

The open global drawer returned by Judge.me's exact `reviews_tab` path. Stores without the paid endpoint can use the package's public All Reviews fallback.

![Floating Reviews Tab](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/floating-reviews-tab.jpeg)

#### Pop-up Reviews

The native React compatibility version of Judge.me's timed review notification.

![Pop-up Reviews](https://raw.githubusercontent.com/FilipLjubic/judgeme-react/main/docs/images/widgets/popup-reviews.jpeg)

## Manual quick start

### 1. Get the Judge.me values

In Judge.me Admin, open **Settings > Integrations > View API tokens**.

| Environment variable | Value | Browser-safe? |
| --- | --- | --- |
| `JUDGEME_SHOP_DOMAIN` | Permanent `store.myshopify.com` domain | Yes |
| `JUDGEME_PUBLIC_TOKEN` | Judge.me **Public API Token** | Yes, although keeping configuration server-owned is cleaner |
| `JUDGEME_STOREFRONT_URL` | Public Online Store page with the Judge.me app embed enabled | Yes; used for server-side v3 asset discovery |
| `JUDGEME_V3_ASSET_BASE_URL` | Optional last-known-good extension asset URL | Yes; normally leave this empty |

Do not use the Judge.me private token. None of the current adapters need it.

Shopify Headless, Storefront API, Customer Account API, and optional Shopify Admin credentials belong to the host app. The [Hydrogen example guide](https://github.com/FilipLjubic/judgeme-react/tree/main/examples/hydrogen#readme) shows where to get those values and which ones must remain server-only.

#### Where `v3AssetBaseUrl` comes from

`v3AssetBaseUrl` is not a token or a value exposed in Judge.me Admin. It is the public directory for the store's current Judge.me Shopify theme-extension assets. Its validated shape is:

```text
https://cdn.shopify.com/extensions/<deployment-id>/<extension-handle>/assets/
```

The deployment identifiers can change whenever Judge.me publishes its Shopify extension, so the library must not hardcode one. Resolve it in a server loader from the public Online Store URL where the Judge.me app embed is enabled:

```ts
import {resolveJudgeMeV3AssetDeployment} from "judgeme-react/server";

const judgeMeAssets = await resolveJudgeMeV3AssetDeployment({
  shopDomain: context.env.JUDGEME_SHOP_DOMAIN,
  storefrontUrl: context.env.JUDGEME_STOREFRONT_URL,
  fallbackAssetBaseUrl:
    context.env.JUDGEME_V3_ASSET_BASE_URL || undefined,
  signal: request.signal,
});

const v3AssetBaseUrl = judgeMeAssets.assetBaseUrl;
```

The resolver fetches that public storefront page on the server, extracts its Shopify-extension asset candidates, and accepts only a deployment whose `manifest.json` contains the Judge.me modules expected by this package. It caches successful discovery and can temporarily reuse a previous success after a refresh error.

Pass `judgeMeAssets.assetBaseUrl` through loader data to `JudgeMeProvider`. `JUDGEME_V3_ASSET_BASE_URL` is only an optional input to the resolver when automatic discovery is unavailable; it is not the normal source of the provider value. If you want a production fallback, copy a previously returned `judgeMeAssets.assetBaseUrl` into that env variable and refresh it after Judge.me deployment changes. The value is public, but it is version-specific.

### 2. Fetch widget data on the server

This starter fetches the product badge and legacy Review Widget in one batch:

```ts
import {
  fetchLegacyProductWidgets,
  getShopifyNumericId,
} from "judgeme-react/server";

const judgeMe = await fetchLegacyProductWidgets({
  productId: getShopifyNumericId(product.id),
  publicToken: context.env.JUDGEME_PUBLIC_TOKEN,
  shopDomain: context.env.JUDGEME_SHOP_DOMAIN,
  signal: request.signal,
});

return {product, judgeMe};
```

Every widget result is nullable. Keep that property when composing larger loaders.

### 3. Mount the provider and components

Mount `JudgeMeProvider` once near the app root. Components own their required styles; callers do not select or match a stylesheet to a widget.

| Widget implementation | How its styles load |
| --- | --- |
| Legacy Judge.me markup | The component emits the dashboard CSS carried by its data |
| Native React adapter | The component emits its package-owned CSS |
| Exact extension widget | The runtime resolves that widget's recursive CSS graph from the current deployment manifest, then ensures the shared dashboard/font CSS exists before mounting |

For exact widgets, loader-supplied shared CSS is installed immediately when available. If it was omitted, the browser makes one public Judge.me storefront-cache request per shop and installs the returned CSS with the current document CSP nonce. No private token is used. You do not need to mount `JudgeMeWidgetStyles` or set `includeStyles`.

```tsx
import {
  JudgeMeProvider,
  LegacyReviewWidget,
  StarRatingBadge,
} from "judgeme-react/react";

<JudgeMeProvider
  config={{
    shopDomain: judgeMeShopDomain,
    publicToken: judgeMePublicToken,
    v3AssetBaseUrl, // judgeMeAssets.assetBaseUrl from the server loader
  }}
>
  {judgeMe.starRatingBadge ? (
    <StarRatingBadge
      data={{...judgeMe.starRatingBadge, ...judgeMe.resources}}
    />
  ) : null}

  {judgeMe.reviewWidget ? (
    <LegacyReviewWidget
      data={{...judgeMe.reviewWidget, ...judgeMe.resources}}
    />
  ) : null}
</JudgeMeProvider>
```

When composing exact widget data from a shared batch, passing `resources.styles` to its `create*Data` helper avoids that fallback browser request. It is an optional request optimization, not correctness wiring: forgetting it is safe because the exact runtime retrieves the public CSS before mounting. `JudgeMeWidgetStyles` and `includeStyles` remain accepted only for compatibility with earlier releases; `includeStyles` no longer disables required CSS.

Use the split entry points to keep the security boundary obvious:

| Import | Use it for |
| --- | --- |
| `judgeme-react/server` | Fetchers, normalizers, data combiners, Shopify ID helpers, and v3 asset discovery |
| `judgeme-react/react` | Provider, components, props, and client runtime events |
| `judgeme-react` | Compatibility entry that exports both sides; avoid it in strict server/client module systems |

### 4. Copy the CSP allowlist

The host application owns Content Security Policy. Exact widgets need Judge.me APIs and media plus the store's current `cdn.shopify.com` extension assets. Video, Instagram, reviewer avatars, and branded verification marks add their own origins.

Do not guess the list from an error at a time. Copy the tested policy from the example's [`entry.server.tsx`](https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/app/entry.server.tsx), then merge it with the storefront's existing checkout, analytics, and platform sources. Hydrogen/Vite must keep `'self'` in `scriptSrc` and use `workerSrc: ["'self'", "blob:"]`; do not add `blob:` to `scriptSrc`.

## Pick your widgets

A good product-page starting set is `StarRatingBadge` near the title, `ReviewWidgetV3` below the product content with `LegacyReviewWidget` as a fallback, and `CardsCarousel` or `ReviewSnippets` for social proof. Add overlays only after the main page is stable.

| Component | Best used for | Implementation |
| --- | --- | --- |
| `StarRatingBadge` | Compact product rating near the title | Public legacy cache + dashboard runtime |
| `ReviewWidgetV3` | Current product/store review list and Write a review form | Current Shopify extension module |
| `LegacyReviewWidget` | Platform-independent Review Widget and v3 fallback | Public legacy cache + dashboard runtime |
| `CardsCarousel` | Visual review cards | Current carousel endpoint and extension assets |
| `TestimonialsCarousel` | One-at-a-time quote carousel | Current carousel endpoint and extension assets |
| `VideosCarousel` | Photo/video review cards | Current media scripts; real playback needs video reviews |
| `ReviewsCarousel` | Judge.me's classic carousel | Public legacy cache + dashboard runtime |
| `ReviewSnippets` | Compact rotating product/cart reviews | Dedicated tokenless feed, public Cards fallback + current extension module |
| `ReviewsGrid` | Dense visual review/media grid | Public tokenless feed + current extension module |
| `HappyCustomers` | Current All Reviews v2025 experience | Public feed + current extension manager |
| `AllReviewsWidget` | Standalone product/store review streams | Public Widget API + React-owned controls |
| `AllReviewsCounter` | Store-wide average and review count | Public aggregate data + dashboard treatment |
| `VerifiedReviewsCounter` | Judge.me verified-review badge | Exact public badge; hidden below 20 verified reviews |
| `JudgeMeMedals` | Earned Judge.me medals | Exact public cache markup and settings |
| `TrustBadge` | Verified-review trust badge and modal | Shopify metafields + current extension module |
| `AiReviewsSummary` | Judge.me-generated store summary | Shopify metafield + current extension module |
| `UgcMediaGrid` | Instagram shopping/review media | Public cache or tokenless social feed + Judge.me runtime |
| `QuestionsAndAnswers` | Product Q&A feed and submission form | Native React surface over public tokenless routes |
| `FloatingReviewsTab` | Global side-tab review drawer | Exact public tab or All Reviews fallback |
| `PopupReviews` | Timed global review notification | Native React app-embed-style surface |

All component props and block-level configuration are typed. The full route in the [example](https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/app/routes/products.%24handle.tsx) shows how the shared batch and the exact/native adapters fit together without repeating the large settings payload.

## Merchant activation

Installing a component does not enable the corresponding Judge.me feature. Start by enabling **Judge.me** under **Shopify Admin > Online Store > Themes > Customize > App embeds** on the published theme.

| Feature | Plan/eligibility | Merchant action before production data appears |
| --- | --- | --- |
| New Review Widget | Free | In Judge.me, open **Settings > Widgets > Review Widget** and upgrade the widget version if the store still uses legacy |
| Happy Customers, new version | Awesome | Upgrade it under **Settings > Widgets > Happy Customers Widget** |
| Trust Badge | Free + verified reviews | Enable it under **Settings > Widgets > Customize**; the headless server may need Shopify Admin metafield access |
| Questions & Answers | Awesome UI | Enable customer questions; submitted questions remain hidden until explicitly published |
| AI Reviews Summary | Awesome + more than five text reviews | Add its app block once on a real Online Store template and wait for Judge.me to generate the shop metafield |
| UGC Media Grid | Instagram content | Connect a professional Instagram account and publish fetched posts in Judge.me |
| Videos Carousel | Published media reviews | Publish matching video reviews; videos-only mode stays hidden below three cards |
| Verified Reviews Counter | At least 20 verified reviews | No toggle; the component returns `null` below Judge.me's threshold |
| Judge.me Medals | Earned medals | No toggle; only medals returned by Judge.me are rendered |

Judge.me officially gates Floating Reviews Tab, Pop-up Reviews, Review Snippets, Q&A, AI Reviews Summary, and Happy Customers to Awesome. Some currently have public-data compatibility paths in this package. Those paths are interoperability workarounds, not a promise that Judge.me will keep the routes available or grant the same entitlement forever.

## Loading strategy

The default architecture is server-first data with client enhancement:

1. Fetch and validate the initial public payload in the route loader.
2. Server-render safe legacy markup or the exact widget marker.
3. Hydrate the React component.
4. Load Judge.me's browser module for forms, filters, lightboxes, media, and other interactions.

For below-the-fold widgets, the host can defer the fetch or mount behind an intersection observer. Do not stream Judge.me-owned SSR markup through Suspense until the host has tested that widget's hydration race. Global overlays such as `FloatingReviewsTab` and `PopupReviews` should mount once outside the normal vertical widget stack.

## Failure behavior

- A disabled endpoint or ineligible feature becomes `null`.
- Malformed rows are removed without discarding valid siblings.
- A failed optional widget must not reject the product loader.
- Unsafe executable markup, mismatched product data, and mismatched shop data remain hard failures for that widget.
- Sample Q&A, summaries, reviews, counts, UGC, and media are never presented as live customer content.

## Known limits

- Judge.me's undocumented endpoints and extension modules can change between deployments.
- Exact widgets need browser JavaScript; they are not pure React Server Components.
- One document can host one Shopify store and one Judge.me extension deployment.
- Automatic v3 asset discovery needs a public Online Store page. A password-protected or rate-limited theme may need a cached last-known-good `JUDGEME_V3_ASSET_BASE_URL`.
- Theme-editor block settings must be passed as typed config because Shopify does not expose the Liquid block instance to the headless app.
- The current fixture still lacks real video playback, published Q&A moderation, and published UGC. Those are live-verification gaps, not missing components.
- Customer Account, checkout, Thank you, and Order status extensions run in Shopify-owned surfaces and are outside this storefront package.

## Package contract

- ESM only
- React 18.3 or React 19
- TypeScript declarations for every public entry point
- No runtime dependency on Hydrogen
- Judge.me private token is never required
- Optional Shopify Admin credentials stay server-only

## License and trademark

MIT © 2026 Filip Ljubic. See [LICENSE](./LICENSE).

Judge.me and its related marks belong to their respective owner. This package is an independent compatibility project.
