# Judge.me widget activation hardening result

Date: 2026-07-14
Store: `moon-phase-prints.myshopify.com`
Hydrogen product: `/products/classic-moon-phase-canvas-print`

## Outcome

The enabled Judge.me storefront widgets render in Hydrogen with their live data and current deployment assets. A clean Private Brave reload produced zero console messages, and the new Review Widget's Write a review flow opened and closed successfully.

The merchant has correctly enabled the new Review Widget, Happy Customers, Trust Badge, AI Reviews Summary, and Floating Reviews Tab. The counters, medals, carousels, popup, snippets, grids, and legacy compatibility surfaces also returned usable live data. Q&A remains disabled with zero published questions, and UGC remains unconfigured because no Instagram account/post is connected.

## Fixes that made the page reliable

### Multilingual Review Widget response

Judge.me's live `reviews_for_widget` response has an empty top-level `reviews` list and separates content into `primary_language_reviews` and `other_language_reviews`, each with its own pagination object. The package accepts that contract and the older top-level contract. It exposes normalized streams to React and gives Judge.me's exact manager a sanitized payload with malformed rows removed.

### Optional-widget fault isolation

Each legacy batch endpoint, optional widget fetch, and `create*Data` call now has its own failure boundary. Batch widget fields are nullable, and malformed collection rows are discarded without removing valid siblings. One changed response or unavailable deployment asset returns `null` only for the affected widget. The detailed parser and recovery rules are in `graceful-degradation-hardening-2026-07-14.md`.

### Real AI summary through Shopify Admin fallback

The real `judgeme.store_summary_widget_data` metafield exists but is not visible through the current Storefront GraphQL query. The loader now tries Storefront first, then reads only that metafield through server-only Admin GraphQL. Only the JSON value reaches the browser; the Admin token remains in the request header and is never serialized.

### Honest Q&A and UGC states

The standalone Q&A adapter checks `review_widget_qna_enabled`. When false, it performs no question read and renders nothing. Judge.me sample questions are not used as storefront content. UGC likewise stays unmounted until the merchant connects a professional Instagram account and publishes at least one post.

### Legacy/v3 modal collision

Happy Customers preloads Judge.me's legacy review-form bundle. That bundle snapshots `.jdgm-review-widget` roots and previously mistook the directly managed v3 root for a legacy product widget, producing a delayed unhandled `false` rejection. The v3 root now receives its official legacy marker only after the legacy snapshot is ready. Happy Customers and the v3 Write a review flow remain functional, and the rejection is gone.

## Live verification

- Verified Reviews Counter: 866.
- Happy Customers: 839 product reviews and 30 store reviews.
- Review Widget v3: 337 product reviews, 4.88 average, 65 primary-language pages, and four other-language pages.
- AI Reviews Summary: real generated metafield content, not a local fixture.
- Trust Badge, exact Floating Reviews Tab, Medals, Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel photo/video mode, Review Snippets, Pop-up Reviews, legacy Review Widget, All Reviews Widget, counters, and classic carousel rendered.
- Standalone Q&A and UGC were absent, matching their current dashboard/data state.
- Private Brave console: zero messages after a clean reload and after opening/closing the v3 review form.

## Automated verification

- `bun run test`: 58 passed, 0 failed after the graceful-degradation regressions were added.
- `bun run lint`: passed for the package and Hydrogen harness.
- `bun run typecheck`: passed for the package and Hydrogen harness.
- `bun run build`: package and production Hydrogen build passed.

The build still prints existing Hydrogen/React Router deprecation and future-flag warnings. They are unrelated to Judge.me runtime behavior.

## Remaining fixture gaps

1. Publish a real video review and verify iframe playback, autoplay, and cleanup.
2. Enable Q&A, publish multiple pages, submit one dedicated test question, and verify moderation/publication.
3. Connect Instagram and publish UGC image/video posts through Judge.me's normal flow.

No token, private review record, or copied third-party bundle is stored in this report.
