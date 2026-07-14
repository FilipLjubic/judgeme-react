# Judge.me Trust Badge spike

Date: 2026-07-14
Status: implemented and Brave-verified

## Question

Can Judge.me's current Shopify Trust Badge be mounted in a React/Hydrogen storefront with the store's real Judge.me configuration and modal, without putting a private credential in the browser?

## Conclusion

Yes. The current Trust Badge is a hybrid Shopify/Judge.me integration:

1. Judge.me writes the badge configuration, verified aggregates, and modal bootstrap to eight shop metafields in the `judgeme` namespace.
2. Those metafields are not Storefront API-visible on the current fixture, so Hydrogen must read them server-side through Shopify Admin GraphQL.
3. The browser mounts Judge.me's deployment-specific `trust-badge/main.js` entry and recursive manifest CSS.
4. Opening the modal lazily reads verified reviews from Judge.me's tokenless CDN API.

The Shopify Admin access token is therefore a server-loader input only. The React component receives a strictly normalized public display payload; it never receives the token or the redundant `photo_gallery` review records embedded in the raw modal metafield.

## First-party observations

The observations below were made against the authorized Hydrogen fixture and the current Judge.me Shopify extension on 2026-07-14.

### Metafields

Shopify Admin GraphQL returned these shop metafields:

- `judgeme.trust_badge.enabled`
- `judgeme.trust_badge.structure`
- `judgeme.trust_badge.color`
- `judgeme.trust_badge.star`
- `judgeme.trust_badge.verified_reviews_count`
- `judgeme.trust_badge.verified_average_rating`
- `judgeme.trust_badge.total_reviews_count`
- `judgeme.trust_badge.modal_data`

The fixture had complete real badge/modal data but `enabled=false`. Its aggregate observation was 866 verified reviews, 869 total reviews, and a 4.8 verified average. The harness deliberately labels its rendered version as a disabled preview instead of changing the store or claiming the feature is enabled.

A Storefront API query for the same keys returned `null`. This is why `fetchTrustBadgeMetafields` accepts a Shopify Admin access token and is documented as server-only.

### Badge bootstrap

The current entry scans:

```text
.jdgm-trust-badge-widget[data-entry-point]
```

It reads badge JSON from:

```html
<script type="application/json" data-badge-data>
  ...
</script>
```

The current badge fields are:

- `verified_average_rating` (with `average_rating` as a compatibility fallback)
- `verified_reviews_count`
- `total_reviews_count`
- `is_certified`

The component uses script-safe JSON escaping for the inline inert payload.

### Modal bootstrap

The entry parses the root's `data-modal-json`. The current module consumes only:

- `shop_name`
- `shop_logo_url`
- `member_since`
- `average_rating`
- `is_certified`
- `verified_reviews_count`
- `total_reviews_count`
- `rating_distribution` with `1_star` through `5_star`
- `ai_summary.text` and `ai_summary.last_updated`
- `sentiment_tags[]` with `name` and `sentiment`

The raw metafield also contained fields such as `features`, `transparency_score`, `photo_gallery`, and `shop_has_reviews_with_media`, but the current entry did not read them. `photo_gallery` duplicated reviewer names, review bodies, and media. The adapter strips those unused fields before loader serialization and lets the modal obtain current review cards from its own public feed.

### Theme-editor configuration

The entry reads these data attributes from the badge root's parent:

- `data-structure`: `default`, `outline`, or `filled`
- `data-shop-structure`: `outline` or `filled`
- `data-color`: `default`, `black`, `white`, or `brand`
- `data-shop-color`: `black`, `white`, or `brand`
- `data-star`: `default`, `black`, `white`, or `brand`
- `data-shop-star`: `black`, `white`, or `brand`
- `data-alignment`: `left`, `center`, or `right`
- `data-layout-variant`: `standalone` for the Hydrogen component

The adapter preserves the Judge.me dashboard values as `shopDefaults` and keeps block overrides as a separate typed `config`. A filled badge cannot use the same resolved background and star color.

### Exact extension lifecycle

The current manifest entry key is `trust-badge/main.js`; the manifest resolves the concrete entry file and recursive CSS for the current deployment. The library does not hardcode a deployment UUID.

The module exposes `window.__trustBadgeInitializer.widgetManagers`, keyed by root element. The React adapter:

1. serializes document scans so two SPA roots do not race;
2. evaluates a uniquely queried module for each pending root;
3. waits for `data-mounted="true"`, `.jdgm-trust-badge`, and the root's manager;
4. removes `data-entry-point` after initialization;
5. stores and destroys only that root's manager on unmount;
6. defers disposal by one task so React development Strict Mode can cancel a transient cleanup.

### Lazy verified-review feed

Opening the current modal calls:

```text
GET https://cdn.judge.me/reviews/all_reviews_js_based
```

with the effective parameters:

```text
widget_type=trust-badge
review_type=verified-reviews
sort_by=created_at
sort_dir=desc
page=1
per_page=10
shop_domain=<permanent Shopify domain>
platform=shopify
```

Filters, search, sorting, and pagination adjust that tokenless request. The browser feed's observed total did not exactly match the metafield count, so the adapter does not infer or reconcile one aggregate from the other.

## Public API and security boundary

`fetchTrustBadgeMetafields`:

- must run on the server;
- sends `X-Shopify-Access-Token` only in the Admin request header;
- validates the stable Admin API version and permanent Shopify domain;
- returns only raw metafield values, never the access token.

`createTrustBadgeData`:

- validates counts, ratings, shop identity, URLs, distribution, AI summary, and sentiment tags;
- returns `null` if no verified review exists;
- returns `null` when the feature is disabled unless `previewWhenDisabled` is explicit;
- marks that explicit case as `source="disabled-preview"`;
- strips every raw modal field the current runtime does not use.

`TrustBadge`:

- requires the host-supplied current `v3AssetBaseUrl`;
- renders only public display data;
- loads Judge.me's exact current module and CSS;
- delegates the full modal and verified-review interactions to that module.

## Request budget

Trust Badge adds no initial Judge.me data read to the complete product loader. It adds one Shopify Admin GraphQL read. Judge.me's verified-review request is lazy and occurs only when the shopper opens the modal.

## CSP

The initial badge uses the origins already required by the exact v3 adapters: `cdn.shopify.com`, Judge.me API/CDN hosts, and the store's Shopify/CDN image hosts. The modal can display review images and videos, so the existing review-media CSP rules still apply. No new origin was observed in the current fixture.

## Validation record

- `fetchTrustBadgeMetafields` returned the real authorized fixture payload without exposing the Admin token in its URL or loader data.
- The Hydrogen SSR response contains the clearly labeled disabled preview and only the sanitized modal fields.
- `bun run test`, `bun run lint`, `bun run typecheck`, and `bun run build` passed after adding the adapter.
- The 42-test core suite covers Admin request construction, unbound fetch, normalization, sanitization, disabled preview, eligibility, and invalid filled colors.
- A clean Brave reload at the 400 px harness viewport rendered the exact disabled preview with a 4.8 rating and 866 verified reviews, with no console messages after the console was cleared.
- Clicking the badge opened Judge.me's exact modal with the live verified-rating distribution, `Most Recent` sorting control, verified review cards, other-language reviews, and pagination.
- A Home → Back navigation remounted the product widgets and rendered the Trust Badge again with the same 4.8/866 payload.
- Search, changing a filter/sort value, modal media playback, and a dedicated close-button assertion still need targeted fixtures or a quieter browser pass; they are not claimed as verified here.

## Sources

- Judge.me, [Trust Badge](https://judge.me/help/en/articles/15281873-trust-badge), accessed 2026-07-14.
- Current deployment `manifest.json` and manifest-resolved `trust-badge/main.js`, inspected from the authorized store's `JUDGEME_V3_ASSET_BASE_URL` on 2026-07-14.
- Authorized Shopify Admin and Storefront GraphQL responses, inspected locally on 2026-07-14; no credential or raw customer record was retained in this report.
- Current tokenless Judge.me verified-review CDN response, inspected locally on 2026-07-14.
