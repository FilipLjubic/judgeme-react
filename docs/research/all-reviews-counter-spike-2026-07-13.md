# Working Judge.me All Reviews Counter spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, Brave Browser

## Result

`AllReviewsCounter` is the sixth working React component. It reproduces Judge.me's shop-wide rating/count widget with public Widget API data, the dashboard's text/style settings, shared CSS, and the current `widget/others.js` runtime.

The live Free-plan store rendered the configured branded treatment in Brave: 4.8 out of 5 stars based on 867 reviews, including the same teal stars, verification mark, copy, and spacing as the counter on the Shopify theme. The React shell deliberately avoids Judge.me's `javascript:void(0)` link when the dashboard has not configured a safe destination.

A final clean Brave reload and Home/back remount verified that all six adapters reached `ready`, the counter retained its score, five stars, copy, and Verified treatment, and the rebranded SVG loaded without a CSP/runtime console error. Opening the remounted Floating Reviews Tab also confirmed its stable-container listeners and body scroll lock, and Escape closed it cleanly.

## Public data contract

Standalone reads use these CORS-enabled endpoints:

```text
GET https://judge.me/api/v1/widgets/all_reviews_count
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN

GET https://judge.me/api/v1/widgets/all_reviews_rating
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
```

The current responses are:

```json
{"all_reviews_count":867}
{"all_reviews_rating":"4.78"}
```

Judge.me's OpenAPI description defines these as the total and average across published product and shop reviews. They therefore intentionally differ from the product Star Rating Badge on the test product, which reports 837 product reviews.

`fetchAllReviewsCounter` requests the two aggregate values plus `settings` and `html_miracle`. It validates a non-negative integer count and a finite 0–5 rating before building server-rendered markup.

## Liquid and dashboard settings contract

Judge.me's official Liquid example uses these markers and attributes:

```html
<div class="jdgm-widget jdgm-all-reviews-text">
  <span class="jdgm-all-reviews-rating" data-score="4.78"></span>
  <span
    class="jdgm-all-reviews-text__text"
    data-score="4.78"
    data-number-of-reviews="867"
    data-locale="en"
  >
    Customers rate us 4.8/5 based on 867 reviews.
  </span>
</div>
```

The live settings select the `branded` style and supply a Liquid-style template equivalent to `{{ all_reviews_rating | round: 1 }} out of 5 stars based on {{ all_reviews_count }} reviews`. The adapter replaces only those known rating/count placeholders, escapes the result as text, and falls back to safe English copy if another unresolved Liquid token remains. It also honors the text/branded mode, optional stars, color, custom style declarations, and a safe HTTP(S) or relative dashboard URL.

The public API supplies data, while the settings payload supplies presentation. No private token is needed or serialized.

## CDN runtime and SPA behavior

The current `loader.js` maps `.jdgm-all-reviews-text__text` and `.jdgm-all-reviews-rating` to `widget/others.js`. That secondary bundle exposes `jdgm.buildStarsFor` and applies the branded verification treatment.

On initial document load, Judge.me's ready callback normally processes the server-rendered markers. For a later SPA mount, `initializeAllReviewsCounter` explicitly requests `widget/others.js` when its star helper is not already present, waits for the helper, then repairs the component-scoped root. It reapplies the dashboard style class, star visibility, numeric score, configured color and custom declarations, and removes loader-injected hiding. For the branded style, it calls the already-loaded `_renderVerifiedJudgeme` or `_renderVerifiedByJudgeme` helper when the first-pass-only callback did not add branding to the remounted root.

The component uses no boolean visual-mode props: Judge.me dashboard settings remain the source of truth. `includeStyles` only controls whether a standalone component emits the shared settings/CSS payload.

The rebranded verification helper fetches `https://judgeme-public-images.imgix.net/judgeme/logos/verified-checkmark.svg` before inserting the image. A host CSP must therefore allow `judgeme-public-images.imgix.net` in both `connect-src` and `img-src`; allowing only images produces a blocked `connect-src` request.

Loading this secondary bundle earlier also made a pre-existing Floating Reviews Tab race reproducible in React development Strict Mode. Two overlapping async initializations could finish out of order, letting the stale effect dispose the current listeners while the component still reported `ready`. The tab initializer now checks that its originating effect is current immediately before binding. Its click/change controls are delegated from the stable outer React container because Judge.me can clone or replace the inner `.jdgm-revs-tab` subtree.

## Seven-request storefront batch

`fetchLegacyStorefrontWidgets` does not call the standalone count/rating endpoints. The existing `all_reviews_page` header already includes `data-number-of-reviews="867"` and `data-average-rating="4.78"`, so the batch constructs the counter from that response and the shared settings.

The full product route therefore remains seven requests:

```text
product_review
preview_badge
featured_carousel
reviews_tab
all_reviews_page
settings
html_miracle
```

That one `all_reviews_page` response now supplies the All Reviews Widget, the Free-plan Floating Reviews Tab fallback, and the All Reviews Counter aggregate values.

## Verified Reviews Counter limitation

> Superseded for implementation status by `verified-reviews-counter-spike-2026-07-13.md`. The observations below remain the dated result for the original zero-verified-review fixture.

The similarly named Verified Reviews Counter is a separate widget and has not been faked.

On 2026-07-13, `GET /api/v1/widgets/verified_badge` returned HTTP 200 with `{"verified_badge":null}` using both public and private tokens. A private server-only aggregate check found 867 published reviews and zero verified published reviews; all current review records reported `verified_status="not-yet"`. No review content or private token was stored.

Judge.me's current OpenAPI description says the store needs at least 20 verified reviews before the Verified Reviews Count Badge is available. Credentials cannot manufacture that state. A real adapter can be completed once the fixture has enough verified reviews or a sanitized non-null response is captured from another authorized test store.

## Evidence

- Judge.me platform-independent widgets: <https://judge.me/help/en/articles/8394958-platform-independent-widgets>
- Judge.me Liquid widget examples: <https://judge.me/help/en/articles/8395227-judge-me-widget-codes-for-liquid-files>
- Judge.me OpenAPI YAML: <https://judge.me/api/docs.yaml>
- Live Shopify comparison: <https://vanilla-slop.myshopify.com/products/wall-art-poster>

## Implementation locations

- `packages/judgeme-react/src/all-reviews-counter.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
