# Working Judge.me Review Widget spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, Brave

## Result

The first real library component works on the free Judge.me plan. The Hydrogen product route server-renders Judge.me's configured legacy Review Widget, then Judge.me's own public browser runtime enables its interactive behavior.

The clean full-page Brave test showed:

- the `Wall Art Poster` product route at HTTP 200;
- 837 reviews and a 4.78 average rendered with the store's teal styling;
- rating histogram, sorting UI, review content, and pagination controls;
- a working **Write a review** button that opened Judge.me's multi-step review modal;
- zero console errors after a full reload with the final CSP and hydration changes.

No review was submitted during verification.

## Why the official bootstrap did not work

Judge.me's official Hydrogen package inserts a `.jdgm-widget.jdgm-review-widget` marker, downloads `widget_preloader.js`, and asks the Awesome-plan cache server for the settings and widget markup.

For this free-plan store, the equivalent cache request returned HTTP 404:

```text
https://cache.judge.me/widgets/shopify/vanilla-slop.myshopify.com
```

The public Widget API did work. The spike therefore replaces only the cache-server fetch step; it still delegates browser rendering and interactions to Judge.me's own CDN runtime.

## Working data flow

The server fetches three documented public-token endpoints in parallel:

```text
GET https://judge.me/api/v1/widgets/product_review
GET https://judge.me/api/v1/widgets/settings
GET https://judge.me/api/v1/widgets/html_miracle
```

The product request uses Shopify's numeric product ID as `external_id`. The settings response contained a JSON assignment with 619 fields plus dashboard CSS. On the inspected store it reported:

```text
widget_version = "3.0"
review_widget_revamp_enabled = true
widget_load_with_code_splitting = true
modal_write_review_flow = true
platform = "shopify"
```

`fetchLegacyReviewWidget` parses the `jdgmSettings` object as JSON without evaluating the returned script, extracts only style contents, validates the product ID, and rejects executable widget markup. The returned serializable data contract is:

```ts
interface LegacyReviewWidgetData {
  productId: string;
  html: string;
  styles: string;
  settings: Record<string, JsonValue>;
}
```

The `product_review` endpoint returns the legacy Review Widget DOM even when the store has Judge.me's new Review Widget enabled. The adapter therefore sets `review_widget_revamp_enabled` to `false` for the browser runtime. It preserves the remaining dashboard settings and CSS but does not claim exact v3 parity.

## Browser initialization

`LegacyReviewWidget` emits the required marker before hydration:

```html
<div class="jdgm-widget jdgm-review-widget" data-id="SHOPIFY_NUMERIC_ID">
  <!-- Judge.me product_review HTML -->
</div>
```

After hydration it sets the public `window.jdgm` credentials, assigns the parsed `window.jdgmSettings`, and loads this third-party script once:

```text
https://cdnwidget.judge.me/loader.js
```

The loader code-splits Judge.me's current CSS and JS. The adapter waits for `jdgm.initializeWidgets`, initializes the component root, and reports readiness only after Judge.me adds `jdgm--done-setup-widget`.

Judge.me dynamically creates some `javascript:void(0)` links. A component-scoped mutation observer replaces those URLs with `#` while retaining Judge.me's event listeners, avoiding strict-CSP violations.

## Hydrogen requirements

The example CSP explicitly allows Judge.me CDN/API hosts plus review media, YouTube/Vimeo frames, and Shopify's consent script. Supplying a custom Hydrogen `scriptSrc` replaces its default list, so the example includes `'self'` explicitly. It also sets `worker-src 'self' blob:` because Vite's local-development client creates a blob worker; without `worker-src`, browsers fall back to `script-src` and block it. `blob:` is intentionally limited to workers rather than being allowed for arbitrary scripts.

The public token is serialized through the provider; the private token is not used or exposed.

The widget payload is currently awaited in the product loader instead of streamed through `Suspense`. During the initial experiment, resolving the deferred Judge.me subtree while its runtime started produced React's “Suspense boundary received an update before it finished hydrating” error. Awaiting the payload removed the race and yielded a clean browser console. This adds uncached route latency and should later be offset with Oxygen caching or a settings-level cache.

## Security boundary

Before server rendering, widget markup is rejected if it contains:

- `<script>` tags;
- inline `on*` handlers;
- `javascript:` `href` or `src` values.

The settings assignment is parsed as JSON rather than executed. CSS and validated HTML still originate from Judge.me and must be treated as trusted third-party storefront content.

## Remaining validation

- Verify pagination changes the review page, not only that the controls initialize without CSP errors.
- Verify client-side navigation away from and back to a product route.
- Verify review submission through the final network response using a disposable review.
- Add Oxygen caching so settings/CSS are not fetched once per product request.
- Test empty, photo, video, question, translated, and customer-account-restricted states.
- Compare a dashboard style/text edit against Hydrogen without rebuilding.
- Build a separate exact-v3 adapter; this component deliberately targets the legacy public DOM contract.

## Implementation locations

- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-review-widget.tsx`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
- `examples/hydrogen/app/entry.server.tsx`
