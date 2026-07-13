# Working Judge.me Floating Reviews Tab spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, installed Brave Browser binary

## Result

`FloatingReviewsTab` is the fourth working component. It has an exact path for stores where Judge.me returns the official widget and a fallback for stores where that response is plan-gated.

The current test store is on the Free plan. Its public and private tokens both received HTTP 200 with `reviews_tab: null`. The public `all_reviews_page` endpoint still returned the configured header and review HTML: 867 total reviews, split into 837 product reviews and 30 shop reviews. The adapter uses that payload to build the floating shell without copying reviews into library code or using the private token.

A clean Brave run verified the four adapters mounted at the time of this spike. The later five-adapter clean run is recorded in `all-reviews-widget-spike-2026-07-13.md`.

- all four React adapters reached `ready`;
- the right-side button used the dashboard label `★ Reviews`;
- opening the tab displayed the configured `Let customers speak for us` title, 25 product reviews, the rating histogram, media gallery, and sorting controls;
- switching to Shop Reviews loaded 25 reviews, then Load More appended the remaining 5 and hid itself;
- Lowest Rating returned one-star reviews first;
- selecting the one-star histogram row returned exactly 9 one-star reviews;
- Escape closed the tab, removed the body scroll lock, and returned focus to the tab button;
- Home followed by browser Back remounted all four widgets at `ready`, with one tab root, one subtab control, one sort control, and 25 reviews;
- Brave recorded no console or page errors.

## Official API contract

Judge.me documents this public-token request:

```text
GET https://judge.me/api/v1/widgets/reviews_tab
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
  &page=1
  &per_page=5
```

The OpenAPI document lists optional `page`, `per_page`, and `review_type` parameters but omits the response schema. The adapter accepts either direct HTML or an object with an `html` field. The current Free-plan response was:

```ts
interface ReviewsTabResponse {
  page: number | string;
  reviews_tab: null | string | { html?: string };
}
```

`fetchFloatingReviewsTab` passes valid official markup through after rejecting script tags, inline event handlers, and `javascript:` URLs. This exact path still needs a live Awesome-plan fixture because the test store cannot produce it.

## Free-plan fallback

When `reviews_tab` is `null`, the adapter requests the first configured review stream from:

```text
GET https://judge.me/api/v1/widgets/all_reviews_page
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
  &page=1
  &review_type=product-reviews|shop-reviews
```

The response has two HTML fields:

```ts
interface AllReviewsPageResponse {
  all_reviews: string;
  all_reviews_header: string;
}
```

On this store, each full product-review page contained 25 reviews. Shop reviews returned 25 on page 1, 5 on page 2, and none on page 3. The header carried the combined counts, 4.78 average rating, histogram, gallery data, and dashboard-generated labels and styles.

The fallback wraps those fields in Judge.me's `.jdgm-widget.jdgm-revs-tab` DOM contract. Subsequent public browser requests support:

- `review_type` for Product Reviews and Shop Reviews;
- `page` for Load More;
- `filter_rating` for histogram filtering;
- `sort_by` and `sort_dir` for the configured sort menu.

The test store's private token produced the same `reviews_tab: null` result, so private credentials do not bypass the plan check. They are not used by this component.

## Browser runtime and SPA behavior

Judge.me's current `loader.js` maps `.jdgm-revs-tab` to `widget/others.js` and also loads the media helper. The secondary bundle applies the tab style, review styling, media gallery, subtabs, filters, pagination, modal mask, and document scroll lock.

There is no public Floating Tab initializer. The bundle runs a private setup function only for roots present during its first document-ready pass, and its global open/close functions retain the wrapper collection from that pass. That breaks a tab inserted after Hydrogen navigation.

The React adapter therefore keeps Judge.me's review customization/media functions but owns the root lifecycle:

- moves the returned header into the modal shell when needed;
- applies the requested `left`, `right`, or `bottom` position;
- binds root-local open, close, mask, and Escape handlers;
- releases the body scroll lock on unmount;
- restores missing sort controls on an SPA remount;
- captures fallback controls before Judge.me requests the unavailable `reviews_tab` endpoint.

The `position` prop is intentional. Position is a Shopify theme app-embed setting, not part of the Judge.me Widget API settings response, so a headless consumer must supply it.

## Shared request batching

The standalone exact call requests `reviews_tab`, `settings`, and `html_miracle`. The Free-plan path adds a follow-up `all_reviews_page` request after `reviews_tab` returns `null`.

`fetchLegacyStorefrontWidgets` now starts these seven requests together:

```text
product_review
preview_badge
featured_carousel
reviews_tab
all_reviews_page
settings
html_miracle
```

`all_reviews_page` supplies the standalone `AllReviewsWidget` and is reused by the Free-plan Floating Tab fallback, so that path does not make a duplicate request. All five components receive compact markup records plus one shared dashboard resources object.

## Current limits

- The exact `reviews_tab` response needs an Awesome-plan browser fixture.
- The fallback covers reading, switching, filtering, sorting, media, and pagination. It does not yet reproduce the Awesome-only Write a Store Review flow.
- Search and custom-form filters have not been added to the fallback.
- Empty-state behavior needs a store with no published product or shop reviews.
- The fallback depends on undocumented filter/sort parameters accepted by `all_reviews_page`; contract tests should keep watching them.

## Evidence

- Judge.me Floating Reviews Tab help: <https://judge.me/help/en/articles/8415920-floating-reviews-tab>
- Judge.me platform-independent widgets: <https://judge.me/help/en/articles/8394958-platform-independent-widgets>
- Judge.me OpenAPI YAML: <https://judge.me/api/docs.yaml>
- Judge.me cache-server guide: <https://judge.me/help/en/articles/8409211-retrieving-cached-widgets-from-the-judge-me-cache-server>

## Implementation locations

- `packages/judgeme-react/src/floating-reviews-tab.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
