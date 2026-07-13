# Working Judge.me Verified Reviews Counter spike

- Date: 2026-07-13
- Store: authorized store configured in the ignored Hydrogen `.env`
- Harness: Hydrogen 2026.4.3, React 18, Brave Browser

## Result

`VerifiedReviewsCounter` is the fifteenth working React component. It uses Judge.me's exact public `verified_badge` markup, shared dashboard settings/CSS, and current legacy runtime rather than estimating a verified count from the general review feed.

The configured store returned 866 verified reviews. Computer Use confirmed the counter in the user's already-open Brave product page as an accessible link described as `866 by Judge.me Logo`, pointing to the store's Judge.me reviews site. The current configured presentation is branded, horizontal, and Judge.me teal. No private token was read, sent, serialized, logged, or stored.

The previous Free-plan fixture remains useful negative coverage: its response is `null`, which the public fetcher represents as `null` rather than fabricating a counter or throwing for a normal ineligible store.

## Official eligibility and configuration

Judge.me's current help article describes the Verified Reviews Counter as a Free-plan widget that displays a store's total verified reviews and phrases eligibility as “more than 20” verified reviews. The live CDN removes only counts below 20 (`20 > count`), matching the API schema's earlier “at least 20” wording. The adapter does not guess eligibility: it trusts the endpoint's `null`/markup response and preserves the CDN's guard. Current dashboard choices include:

- branded or classic presentation;
- horizontal or vertical branded orientation;
- default Judge.me or custom color;
- an optional All Reviews Page link.

The app embed remains the normal Shopify prerequisite. The official platform-independent guide also lists the counter among the supported external-storefront widgets, although that managed flow is Awesome-only.

## Public data contract

The adapter uses one CORS-enabled public Widget API read:

```text
GET https://judge.me/api/v1/widgets/verified_badge
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
```

An eligible response has this shape:

```json
{"verified_badge":"<div class=\"jdgm-widget jdgm-verified-badge\">...</div>"}
```

The 2026-07-13 authorized response was 615 bytes. Sanitized semantic structure:

```html
<div class="jdgm-widget jdgm-verified-badge">
  <style>.jdgm-verified-badge { display: none }</style>
  <div class="jdgm-verified-badge__wrapper">
    <div class="jdgm-verified-badge__image" data-url="/…png"></div>
    <div class="jdgm-verified-badge__total">866</div>
    <div class="jdgm-verified-badge__text">Verified Reviews</div>
    <div class="jdgm-verified-badge__stars">…</div>
  </div>
</div>
```

An ineligible store returns HTTP 200 with:

```json
{"verified_badge":null}
```

`fetchVerifiedReviewsCounter` validates the markup, parses the exact count, and returns `VerifiedReviewsCounterData | null`. The standalone helper shares concurrent `settings` and `html_miracle` reads with the other legacy adapters. `fetchLegacyStorefrontWidgets` adds only `verified_badge` to its shared batch.

## Dashboard settings contract

The public `settings` response on the eligible store supplied:

```json
{
  "verified_count_badge_style": "branded",
  "verified_count_badge_orientation": "horizontal",
  "verified_count_badge_color_style": "judgeme_brand_color",
  "verified_count_badge_color": "#108474",
  "is_verified_count_badge_a_link": false,
  "verified_count_badge_url": "",
  "verified_count_badge_show_jm_brand": true,
  "verified_badge_custom_css": ""
}
```

The endpoint markup contains the count and initial classic content. The shared settings control the final presentation. The component intentionally has no branded/classic/orientation/color React props; Judge.me's dashboard remains the source of truth.

## Current CDN runtime

On 2026-07-13, `https://cdnwidget.judge.me/loader.js` maps `.jdgm-verified-badge` to `widget/others.js`. That secondary bundle:

1. removes roots below the 20-review threshold;
2. adds the branded or legacy `vintage` style class;
3. replaces the endpoint's text/stars with the current branded SVG when configured;
4. applies horizontal/vertical orientation and the configured color;
5. adds the Judge.me branding treatment;
6. wraps the root with `.jdgm-verified-count-badget` and applies the dashboard or Judge.me reviews-site URL;
7. reveals the root.

The initial document-ready scan handles SSR roots. `initializeVerifiedReviewsCounter` waits for the same base/secondary runtime and performs the equivalent component-scoped transformation only when an SPA-mounted root missed that first scan. Safe links receive `noopener noreferrer` when opened in another tab.

Current branded assets come from `judgeme-public-images.imgix.net`; the classic image path uses `s3.amazonaws.com/me.judge.public-static-assets`. A host CSP therefore needs the imgix host in both `connect-src` and `img-src`, and the S3 host in `img-src` if classic mode must be supported.

## Request-efficient composition

The legacy storefront batch now makes eight requests:

```text
product_review
preview_badge
featured_carousel
reviews_tab
verified_badge
all_reviews_page
settings
html_miracle
```

The counter is shop-level and never receives a product `external_id`. The full Hydrogen product loader now makes fifteen Judge.me reads: the eight-request legacy batch plus one tokenless read each for Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Pop-up Reviews, Review Snippets, and Questions & Answers. AI Reviews Summary still adds no Judge.me request because its content comes from Shopify's Storefront metafield.

The home page also calls the standalone helper. That gives the current harness an independent store-level verification surface even when product-route data or Storefront/Judge.me hostnames differ.

## Verification

- `bun run test`: 33 passing tests, including eligible and `null` responses plus shared-batch coverage.
- `bun run lint`: passed.
- `bun run typecheck`: passed.
- `bun run build`: passed for the library and Hydrogen client/server bundles.
- Brave with the restarted port-3001 server: the current branded counter rendered with count 866, the Judge.me logo, and its configured reviews-site destination.
- The visible Floating Reviews Tab and Videos Carousel console errors are separate existing adapter issues on the newly configured store; no Verified Reviews Counter runtime or CSP error was present.

## Evidence

- Judge.me Verified Reviews Counter: <https://judge.me/help/en/articles/8420851-verified-reviews-counter>
- Judge.me widget catalog: <https://judge.me/help/en/articles/8415708-judge-me-widgets>
- Judge.me platform-independent widgets: <https://judge.me/help/en/articles/8394958-platform-independent-widgets>
- Judge.me Vintage-theme Liquid example: <https://judge.me/help/en/articles/8205142-adding-judge-me-widgets-in-vintage-themes>
- Live public Widget API and CDN assets inspected on 2026-07-13.

## Implementation locations

- `packages/judgeme-react/src/verified-reviews-counter.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `packages/judgeme-react/test/core.test.mjs`
- `examples/hydrogen/app/routes/_index.tsx`
- `examples/hydrogen/app/routes/products.$handle.tsx`
- `examples/hydrogen/app/entry.server.tsx`
