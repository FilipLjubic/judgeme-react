# Working Judge.me Reviews Grid spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, Brave Browser

## Result

`ReviewsGrid` is the seventh working React component and the first adapter that runs Judge.me's current Shopify v3 extension code rather than the legacy `cdnwidget.judge.me` runtime. It renders the configured header, aggregate rating, media and text cards, responsive rows/columns, Show more control, and Review Media Gallery lightbox.

A clean Brave reload rendered the configured five-column, one-row grid with `From our customers`, a 4.8 aggregate, 867 reviews, four media cards, one text card, and a working Show more control. Show more loaded the next five reviews. Selecting a media review opened Judge.me's own lightbox with its image, reviewer, date, rating, and body; Close restored the page. The console contained only React's development advisory and no CSP or runtime errors. A Hydrogen Home/history-back cycle remounted the grid successfully.

## Public data contract

The current v3 module reads the first and later pages from a tokenless, CORS-enabled endpoint:

```text
GET https://cdn.judge.me/widgets/reviews_grid_widget_data
  ?shop_domain=STORE.myshopify.com
  &platform=shopify
  &page=1
  &show_media_only=false
  &per_page=5
  &display_order=media_first
  &review_selection=all
```

The response shape observed on 2026-07-13 is:

```ts
interface ReviewsGridResponse {
  current_page: number;
  per_page: number;
  review_selection: string;
  reviews: Array<Record<string, unknown>>;
  total_count: number;
  total_pages: number;
}
```

Review records include their UUID, rating, title/body, reviewer fields, product fields, picture/media/video fields, verification state, and vote counts. The adapter validates the page metadata, each review UUID, and 1–5 rating before returning data to React.

The endpoint supports the current extension's `all`, current product, current collection, custom products, featured, product-review, and store-review selection modes. A selection that requires a product or collection ID is rejected before the request if its context is missing.

No Judge.me token is sent to the grid endpoint. The standalone `fetchReviewsGrid` helper still uses the public Widget API token for shared dashboard settings and aggregate count/rating. A route already using `fetchLegacyStorefrontWidgets` can combine its existing settings and All Reviews aggregate with `fetchReviewsGridPage`, adding only one request to the seven-request legacy storefront batch.

## Exact Shopify extension runtime

The live app embed referenced this deployment-specific asset base:

```text
https://cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/
```

The deployment UUID is not a stable package version. Hosts supply the current base through `JudgeMeProvider.config.v3AssetBaseUrl`; the library validates that it is an HTTPS `cdn.shopify.com/extensions/.../.../assets/` URL. A deployment watcher or theme inspection step can refresh this value when Judge.me publishes another extension build.

The current loader contract is:

```html
<section
  class="jdgm-widget jdgm-reviews-grid-widget"
  data-widget="reviews-grid"
  data-entry-key="reviews-grid-widget/main.js"
  data-entry-point="reviews_grid.js"
></section>
```

The adapter fetches `manifest.json`, traverses the entry's imports and dynamic imports, loads every associated CSS file, seeds `window.jdgm.data.reviewsGridWidget` with the first page plus aggregate data, then executes `reviews_grid.js`. The entry auto-scans matching document roots and mounts Judge.me's Vue component; it does not expose a reusable manager globally.

For SPA remounts, the adapter executes the module with a unique query string and removes `data-entry-point` from completed roots. A later scan therefore processes the new root without mounting over an existing one. It also rejects attempts to initialize two shops or two v3 extension deployments in one document.

## Configuration contract

The public `ReviewsGridConfig` mirrors the data attributes read by the current extension manager:

- review selection, product IDs, collection ID, media-only mode, and display order;
- media grouping, desktop/mobile columns and rows, and maximum width;
- stars, reviewer name, hover title, header text, and average-rating visibility;
- plan flag, corner style, card spacing, and the five widget colors.

The defaults match the current extension module. The Hydrogen harness overrides only desktop columns/rows and mobile columns/rows, demonstrating that the component can receive app-block configuration without owning Judge.me's visual design.

The current component is client-mounted exact v3 DOM. The server emits the marker and bootstrap data, not review-card HTML, so the grid itself is not an SSR review-content surface yet.

## CSP

The host application must allow `https://cdn.shopify.com` in `script-src`, `style-src`, `connect-src`, `font-src`, and `img-src`. The manifest and CSS are fetched dynamically, the module is executed as a script, and its styles may reference Shopify-hosted fonts and images. Existing Judge.me API, CDN, media, and image rules remain necessary for the rest of the widgets.

## Evidence

- Judge.me Reviews Grid Widget: <https://judge.me/help/en/articles/13904539-reviews-grid-widget>
- Judge.me widget catalog: <https://judge.me/help/en/articles/8415708-judge-me-widgets>
- Live Shopify comparison: <https://vanilla-slop.myshopify.com/products/wall-art-poster>

## Implementation locations

- `packages/judgeme-react/src/reviews-grid-api.ts`
- `packages/judgeme-react/src/reviews-grid.tsx`
- `packages/judgeme-react/src/exact-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
- `examples/hydrogen/app/entry.server.tsx`
