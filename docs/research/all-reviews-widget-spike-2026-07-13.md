# Working Judge.me All Reviews Widget spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, Brave Browser

## Result

`AllReviewsWidget` is the fifth working React component. It mirrors Judge.me's platform-independent All Reviews Widget with the store's public Widget API token, dashboard settings/CSS, and current CDN review helpers. No private token is used or sent to the browser.

A clean Brave run verified:

- all five adapters reached `ready` after a full reload and after Home followed by browser Back;
- the initial Product Reviews stream showed the configured combined header, 837 product reviews, 30 shop reviews, the media gallery, histogram, and sort control;
- switching to Shop Reviews loaded the store-review stream and switching back cleared an active rating filter;
- selecting the one-star histogram row returned the expected empty shop-review result without leaving a stale loader;
- Lowest Rating returned one-star product reviews first;
- the dashboard's scroll-loading mode appended the next product page;
- Product Reviews and Shop Reviews expose button semantics and respond to keyboard activation;
- Brave showed no runtime errors; the only console message was React's development-tools suggestion.

## Official marker and CDN behavior

Judge.me's platform-independent guide documents this marker:

```html
<div class="jdgm-widget jdgm-all-reviews-widget">
  <div class="jdgm-all-reviews__body"></div>
</div>
```

The current `loader.js` maps `.jdgm-all-reviews-widget` to `widget/arp.js`. That bundle exposes `jdgm.AllReviewsPage`, customizes the returned reviews, and normally owns paging through Judge.me's cache-server path. It also performs a delayed DOM pass that can recreate the subtab elements.

The React adapter keeps the official root/classes and CDN customization, but owns the interactive request lifecycle. Capture listeners intercept subtabs, histogram filters, sorting, button pagination, and the configured scroll sentinel before `arp.js` can use its cache-server callback. A scoped mutation observer restores `role="button"` and `tabindex="0"` when the CDN bundle recreates tabs.

## Public Widget API contract

Initial and subsequent reads use:

```text
GET https://judge.me/api/v1/widgets/all_reviews_page
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
  &page=1
  &review_type=product-reviews|shop-reviews
```

The response is:

```ts
interface AllReviewsPageResponse {
  all_reviews: string;
  all_reviews_header: string;
}
```

Subsequent reads add the endpoint's accepted `filter_rating`, `sort_by`, and `sort_dir` parameters. Every returned HTML fragment is checked for script tags, inline event handlers, and `javascript:` URLs before insertion.

The dashboard currently sets `widget_first_sub_tab="product-reviews"` and `all_reviews_page_load_reviews_on="scroll"`. The returned header reports 4.78 from 867 reviews: 837 product and 30 shop reviews.

## Page-size mismatch

The header contains `data-per-page="10"`, but direct tests of pages 1, 2, and 3 returned 25 distinct review IDs per full page. Treating the header value as the public endpoint's batch size would hide controls incorrectly or require an unnecessary extra request near the end.

The adapter therefore records the number of reviews observed in the first response as `data-page-size`. It keeps the largest batch observed in the current document, which lets a small shop-review or filtered response switch safely to a larger product stream. End-of-stream detection uses three signals:

- the response is empty;
- the response contains fewer reviews than the observed endpoint batch size;
- the accumulated review count reaches the product/shop total from the header.

The header's `data-per-page` remains intact for Judge.me styling and metadata, but it does not control the direct Widget API pager.

## SSR, batching, and SPA lifecycle

`fetchAllReviewsWidget` fetches `all_reviews_page`, `settings`, and `html_miracle` for standalone use. `initialReviewType` can override the dashboard's first tab without adding boolean mode props.

`fetchLegacyStorefrontWidgets` starts these seven requests together:

```text
product_review
preview_badge
featured_carousel
reviews_tab
all_reviews_page
settings
html_miracle
```

The All Reviews response also supplies the Free-plan Floating Reviews Tab fallback, so that path still makes seven total requests rather than requesting `all_reviews_page` twice. All five components reconstruct their payloads from one shared settings/CSS record.

The server renders the configured header, first review stream, subtabs, spinner, footer, and scroll sentinel. After hydration, the component loads Judge.me's runtime once, applies review/media customization, then binds and disposes only its own root listeners and observers. The same-product Home/Back check confirms the root can be remounted without duplicating controls or leaving stale handlers.

## Current limits

- The native `arp.js` cache-server request/response format is not used; the compatibility adapter depends on the public `all_reviews_page` behavior.
- Search and custom-form filters are not implemented.
- Empty-state rendering still needs a live store with no published reviews.
- The filter/sort parameters are accepted today but are not fully described in Judge.me's public schema, so browser contract checks should continue to watch them.

## Evidence

- Judge.me platform-independent widgets: <https://judge.me/help/en/articles/8394958-platform-independent-widgets>
- Judge.me OpenAPI YAML: <https://judge.me/api/docs.yaml>
- Judge.me cache-server guide: <https://judge.me/help/en/articles/8409211-retrieving-cached-widgets-from-the-judge-me-cache-server>

## Implementation locations

- `packages/judgeme-react/src/all-reviews-widget.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
