# Judge.me Happy Customers spike

Date: 2026-07-14
Status: implemented; exact extension mount and tab switching Brave-verified

## Question

Can the new Judge.me Happy Customers Widget be used in React/Hydrogen with the store's dashboard configuration even when the normal Shopify block and its bootstrap metafield are not available to a headless storefront?

## Conclusion

Yes, with a compatibility fallback. The current widget is Judge.me's All Reviews v2025 implementation. Its Shopify block normally combines a shop metafield with a deployment-specific extension manager. The same manager accepts explicit `fallbackData`, and its review feed is available from a tokenless Judge.me CDN endpoint. A headless adapter can therefore:

1. read the existing shared public Judge.me settings;
2. fetch the first review page from the tokenless Happy Customers endpoint;
3. reuse the legacy All Reviews header for the aggregate rating and histogram;
4. import the current deployment's `AllReviewsWidgetV2025Manager` directly;
5. pass the normalized CDN response as `fallbackData` and let Judge.me own rendering and later interactions.

The current authorized store has the new widget disabled and no `all_reviews_widget_v2025_data` metafield. The Hydrogen harness consequently labels its rendering as a disabled preview. It does not claim the Awesome-plan feature is enabled.

## Official product contract

Judge.me's current help center describes Happy Customers as an Awesome-plan widget that displays product and store reviews, normally in two tabs. It can be placed on home, product, collection, page, blog, article, cart, and collection-list templates. The Judge.me app embed is a prerequisite for the standard Shopify installation.

Judge.me distinguishes the new and legacy versions. The current new version is not page-builder compatible and does not support pinned reviews. Its dashboard controls include header and review-card themes, aggregate display, histogram, media gallery, search, filters, sorting, pagination, column/card controls, colors, typography, reviewer metadata, AI insights, and custom CSS. Shopify's block owns placement controls such as maximum width and review/tab selection.

The documented Vintage-theme root is:

```html
<div
  class="jdgm-widget jdgm-all-reviews-widget-v2025"
  data-widget="all-reviews-v2025"
  data-auto-install="false"
  data-entry-point="all_reviews_widget_v2025.js"
  data-entry-key="all-reviews-widget-v2025/main.js"
></div>
```

The normal Liquid path assigns `shop.metafields.judgeme.all_reviews_widget_v2025_data` to `jdgm.data.allReviewsWidgetV2025` when that metafield exists.

## First-party extension observations

The observations below were made against the authorized store's current Judge.me Shopify extension on 2026-07-14.

### Manifest and manager

The current manifest contains:

- `all-reviews-widget-v2025/main.js`, resolved to the auto-scanning entry;
- `all-reviews-widget-v2025/AllReviewsWidgetV2025Manager.js`, resolved to the importable manager;
- recursive Review Widget layout CSS.

The entry scans `.jdgm-all-reviews-widget-v2025[data-entry-point]`, creates a private manager map, and does not expose that map globally. Re-evaluating the auto-scanner would make SPA ownership awkward. The adapter instead imports the manifest-resolved manager module and instantiates its named `AllReviewsWidgetV2025Manager` export for one React root.

The constructor accepts:

```text
new AllReviewsWidgetV2025Manager(root, { fallbackData, settingsOverrides })
```

`initialize()` returns a Vue mount object with `app.unmount()`. The React adapter retains the manager per root, removes the entry-point marker after mount, and calls that unmount function during deferred SPA cleanup. The deferred task lets React development Strict Mode cancel a transient disposal.

### Public CDN endpoint

The initial page uses:

```text
GET https://cdn.judge.me/reviews/all_reviews_js_based
```

with:

```text
shop_domain=<permanent Shopify domain>
platform=shopify
widget_type=all-reviews-widget-v2025
page=1
```

Product reviews are the default. Store and combined streams add `review_type=shop-reviews` and `review_type=all-reviews`, respectively. No Judge.me token is sent.

The current response contains:

- `reviews` and `pagination`;
- `primary_language_reviews` and its pagination;
- `other_language_reviews` and its pagination;
- `primary_language`;
- `number_of_product_reviews` and `number_of_shop_reviews`;
- `custom_form_filters_and_averages`.

The 2026-07-14 authorized observation was 839 product reviews and 30 store reviews. The default `reviews` array was empty while the primary- and other-language arrays contained the visible first page. The adapter detects that shape and sets `multi_language_sorting_enabled` in the fallback bootstrap so the exact widget does not render an empty list.

### Aggregates and histogram

The tokenless CDN response does not include the widget's average rating or histogram. The complete product loader already has Judge.me's legacy All Reviews response, whose header includes the average/count and whose histogram rows include `data-rating`, `data-frequency`, and usually `data-percentage`.

`createHappyCustomersData` converts those rows into the array expected by the current `StarRatingHistogram` component:

```ts
{rating: 5, frequency: 761, percentage: 88}
```

Missing rows are filled with zeroes. This reuses current first-party data without adding aggregate requests or estimating review counts.

### Tab behavior

The first server read matches the configured initial view. For the default two-tab mode, the fallback deliberately does not pretend that the unrequested tab has cached review records. Switching tabs makes Judge.me's manager perform the matching tokenless CDN read. Sorting, filters, search, and pagination remain owned by the exact manager and use the same public endpoint.

The write-review button remains visible because this is a standalone Happy Customers mount, not the manager's `entryPoint="embedded"` mode. Judge.me's current manager uses the legacy core/form scripts for that store-review modal, so the normal app-embed/core runtime contract still applies.

## Public API and security boundary

`fetchHappyCustomersPage`:

- normalizes the permanent Shopify domain;
- makes one tokenless CDN request;
- validates pagination, counts, review UUIDs/ratings, JSON values, and review HTML;
- rejects script tags, inline event handlers, and `javascript:` URLs;
- retains its request URL and resolved stream type so composition cannot mix responses.

`createHappyCustomersData`:

- combines that page with shared settings, aggregate values, and legacy histogram markup;
- validates app-block controls;
- returns `null` while `all_reviews_widget_v2025_enabled` is false unless `previewWhenDisabled` is explicit;
- labels that explicit case as `source="disabled-preview"`.

`HappyCustomers`:

- requires the host-supplied current `v3AssetBaseUrl`;
- uses Judge.me's exact current deployment CSS and manager;
- passes no customer identity fields and no private credentials;
- owns only the root lifecycle while Judge.me owns the rendered controls.

## Request budget

Happy Customers adds one initial tokenless Judge.me CDN read to the full product loader. The route therefore makes fifteen Judge.me reads with exact cached UGC or sixteen when the UGC compatibility/empty check is needed. Switching to a tab that was not seeded makes one lazy browser read.

## CSP

The existing exact-v3 allowlist covers the module graph through `cdn.shopify.com` and the public API through `*.judge.me`. The live Happy Customers cards also requested reviewer avatars from:

```text
https://judgeme.imgix.net
```

That origin must be present in the host's `img-src`. The Brave pass caught and corrected this missing directive. The existing `judgeme-public-images.imgix.net` rule remains separately required for Judge.me verification assets.

## Validation record

- `bun run test` passed with 45 core tests after the adapter was added.
- The tests cover the exact tokenless request, multi-language response, disabled-preview gate, histogram conversion, config bounds, and executable-markup rejection.
- A clean Brave reload mounted the exact current widget with the dashboard title, histogram, Write a review button, Product reviews (839), Store reviews (30), filters, sorting, review cards, other-language section, and pagination.
- Clicking Store reviews issued the lazy public read and replaced the product cards with store-review cards and three pages of navigation.
- Brave exposed the missing `judgeme.imgix.net` avatar CSP rule; the Hydrogen host allowlist now includes it in `img-src`.

### 2026-07-15 write-review runtime ordering correction

The exact Happy Customers manager can render before Judge.me's shared legacy core has finished defining the form helpers used by its **Write a review** action. Configuring the exact runtime first leaves `window.jdgm.widgetPath` unavailable, which prevents the form from opening and produces a `window.jdgm.widgetPath is not a function` warning.

`initializeHappyCustomersRoot` now awaits `ensureJudgeMeCoreRuntime` with the widget's public token, shared settings, and permanent shop domain before calling `configureExactRuntime`. The package owner browser-verified this ordering against the authorized Brave harness on 2026-07-15: **Write a review** opened and the warning disappeared. A source-order regression test keeps that initialization boundary explicit.

## Sources

- Judge.me, [Happy Customers Widget](https://judge.me/help/en/articles/8201189-happy-customers-widget), accessed 2026-07-14.
- Judge.me, [Customizing the Happy Customers Widget (new version)](https://judge.me/help/en/articles/13653546-customizing-the-happy-customers-widget-new-version), accessed 2026-07-14.
- Current authorized deployment `manifest.json`, `all_reviews_widget_v2025.js`, manifest-resolved manager, Review Widget header, and histogram modules, inspected 2026-07-14.
- Current tokenless Judge.me Happy Customers CDN responses and authorized Brave harness, inspected 2026-07-14. No credential or raw review record was retained in this report.
