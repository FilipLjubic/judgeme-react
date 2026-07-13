# Working Judge.me Star Rating Badge spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, installed Brave Browser binary

## Result

`StarRatingBadge` is the second real library component. It server-renders Judge.me's configured product rating markup and uses Judge.me's current public runtime for dashboard text rules and click behavior.

A clean isolated Brave run on `Wall Art Poster` verified:

- average rating `4.78` and review count `837`;
- the store's configured teal stars and review text;
- `jdgm-preview-badge--with-link` and `jdgm--done-setup` runtime classes;
- `data-judgeme-react-runtime-status="ready"` for both the badge and Review Widget after 16 seconds;
- clicking the badge scrolled the Review Widget to approximately 30 pixels from the viewport top;
- no console or page errors.

## Public API contract

The public-token request is:

```text
GET https://judge.me/api/v1/widgets/preview_badge
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
  &external_id=SHOPIFY_NUMERIC_PRODUCT_ID
```

The live response shape was:

```ts
interface PreviewBadgeResponse {
  product_external_id: number | string;
  badge: string;
}
```

The 515-byte `badge` value contained `.jdgm-prev-badge` markup with `data-average-rating`, `data-number-of-reviews`, `data-number-of-questions`, accessible star labeling, and review text. `fetchStarRatingBadge` validates the returned product ID and rejects scripts, inline event handlers, and `javascript:` URLs before returning the markup.

## Marker and runtime contract

The component emits:

```html
<div class="jdgm-widget jdgm-preview-badge" data-id="SHOPIFY_NUMERIC_ID">
  <!-- preview_badge HTML -->
</div>
```

Judge.me's current `loader.js` maps `.jdgm-preview-badge` to `widget/main.js`. That entry exposes `jdgm.customizeBadges()`, applies configured text/question behavior, wires the badge to the matching Review Widget, and adds `jdgm--done-setup`.

On a product page with a matching Review Widget, clicking the badge opens the configured review tab if necessary and scrolls to the widget. On a product-card/listing surface, the badge can be wrapped in the product link; Judge.me reads the closest anchor and appends `#judgeme_product_reviews` when navigating.

## Shared resource batching

Both product widgets require the same `settings` and `html_miracle` resources. Calling the two standalone fetchers would make six requests and serialize the roughly 600-field settings object twice.

`fetchLegacyProductWidgets` instead performs four concurrent requests:

```text
product_review
preview_badge
settings
html_miracle
```

It returns compact `reviewWidget` and `starRatingBadge` markup records plus one shared `resources` object. The Hydrogen route combines each markup record with `resources` at render time. `StarRatingBadge` uses `includeStyles={false}` there so only the Review Widget emits the shared dashboard CSS.

## Shared-runtime race found during verification

The first two-widget run exposed a latent Review Widget status error. Judge.me's own document-ready callback had already added `jdgm--done-setup-widget`, but the React adapter continued waiting for lazy form/media methods that are not stable after initial setup. It timed out even though the Review Widget was visibly initialized.

The adapter now treats Judge.me's setup class as authoritative before waiting for the manual initializer. This keeps the initial document path clean while preserving the manual initializer for a future client-navigation test where Judge.me has not already processed the marker.

## Remaining validation

- Exercise the badge inside a linked product card without a same-page Review Widget.
- Verify empty and zero-review behavior against `hide_badge_preview_if_no_reviews`.
- Verify client-side navigation between two products and back.
- Add a DOM/runtime contract test when the package gains a browser-test harness.
- Test dashboard changes to badge text visibility, question text, alignment, and colors without rebuilding Hydrogen.

## Implementation locations

- `packages/judgeme-react/src/star-rating-badge.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
