# Judge.me widget activation audit

Date: 2026-07-14
Store: `moon-phase-prints.myshopify.com`
Hydrogen product: `/products/classic-moon-phase-canvas-print`

## Result

The merchant setup is correct for the new Review Widget, Happy Customers, Trust Badge, AI Reviews Summary, Floating Reviews Tab, counters, carousels, snippets, popup, medals, and the remaining review surfaces tested here. Q&A is still disabled and has no published questions; UGC is still waiting for an Instagram connection and a published post.

The empty Hydrogen page was an adapter failure, not an activation failure. Judge.me changed the live Review Widget feed to separate primary- and other-language streams. The parser rejected that shape, and the route's all-or-nothing loader hid every widget. Both problems are now fixed.

## What is enabled

### New Review Widget

The tokenless `reviews_for_widget` endpoint returns the new structured widget payload for the audited product:

- 337 reviews at 4.88 average;
- five primary-language reviews and three other-language reviews on the first page;
- `primary_language_pagination` and `other_language_pagination` objects;
- product medals, histogram data, review summary text, and AI summary text.

The public settings response still says `review_widget_revamp_enabled: false`, but it also contains a `review_widget_revamp_dual_publish_end_date` of 2026-07-28. The endpoint is better evidence of the active renderer during this migration window. This is not a simple "new widget is off" case.

The previous parser expected one top-level `pagination` object. It now accepts both contracts, exposes the two language streams and pagination objects, and preserves the untouched response for Judge.me's exact manager.

### Happy Customers

`all_reviews_widget_v2025_enabled` is `true`. The current CDN response contains:

- 839 product reviews and 30 shop reviews;
- ten primary-language reviews and three other-language reviews on page one;
- the dashboard's new-widget colors, layout, paging, and header settings.

The package currently labels the data source `cdn-fallback`, but the merchant activation itself is correct.

### Trust Badge

The public settings and the eight Admin metafields both report the badge as enabled. The public badge payload is complete and includes the configured structure, colors, verified average, and verified count.

### AI Reviews Summary

The Judge.me widget catalog says `Installed`, and the live theme has an `AI Reviews Summary (Paid)` app block. The theme-editor preview renders Judge.me's sample summary.

The real `judgeme.store_summary_widget_data` shop metafield also exists. The Admin API returned a JSON payload last updated on 2026-07-06 with rating, review count, summary text, keywords, histogram, photo gallery, medals, and translations. Judge.me's status endpoint reports that the store has enough reviews and is not currently generating.

The Storefront API query still returns `null` for this metafield, but the server now falls back to a Shopify Admin GraphQL read and serializes only the public metafield string. The Hydrogen page renders the real generated summary; no local fixture is used.

### Other live data

- Verified Reviews Counter: 866 verified reviews.
- Judge.me Medals: exact public markup is present.
- Videos Carousel: four photo/video-mode cards are available.
- Cards Carousel: 20 cards are available.
- Testimonials Carousel: 20 cards are available.
- Review Snippets: five cards are available through the public endpoint.
- Floating Reviews Tab: the exact `reviews_tab` response is now available, so Hydrogen does not need the public All Reviews fallback on this store.
- Pop-up Reviews: five reviews and the complete dashboard configuration are available. It is configured for product pages after five seconds, but `popup_widget_hide_on_mobile` is `true`.

## What is not fully enabled

### Questions and Answers

The older global setting `enable_question_anwser` is `true`, but the setting used by the new widget is `review_widget_qna_enabled: false`. The live product feed contains zero published questions.

The Hydrogen route now checks the dashboard setting before fetching Q&A. Because it is disabled, the route performs no question read and renders no standalone Q&A component. It does not request or display `preview_mode=sample_data`.

### UGC Instagram Shopping

UGC is not configured. The public UGC markup is absent, and the Judge.me admin still shows `Connect Instagram`. A professional Instagram account must be connected and at least one post published before this widget can render real content.

### Online Store install links

The Judge.me catalog still shows `Install` for Pop-up Reviews, Review Snippets, and Floating Reviews Tab on the selected `hydrogen-redirect-theme`. Those links add Shopify app embeds or app blocks to the Online Store theme. They are not required by the native Hydrogen adapters, but they matter if the same widgets should also run inside the redirect theme itself.

AI Reviews Summary is already installed as an Online Store app block. The theme preview also exposes a Floating Reviews Tab trigger, even though the catalog continues to offer its install link; the exact Judge.me endpoint is active regardless.

## Why the Hydrogen page was empty

The route loaded all Judge.me data in one `Promise.all` and wrapped the whole operation in one `try/catch`. The changed Review Widget response threw during normalization, so the catch returned `null` for the entire widget collection.

The route now keeps the shared legacy storefront batch as its required base and isolates each optional read and adapter construction. A future failure in one v3 deployment, endpoint, or parser returns `null` for that widget without suppressing the others.

## Fixes completed

1. Normalized `primary_language_reviews`, `other_language_reviews`, and both pagination objects while keeping backward compatibility with the old top-level stream.
2. Isolated optional widget network and construction failures.
3. Added the server-only Admin fallback for the real AI Reviews Summary metafield.
4. Removed Q&A sample mode and made the dashboard enablement setting authoritative for the standalone adapter.
5. Prevented the legacy form runtime from snapshotting the directly managed v3 Review Widget. This removes Judge.me's delayed `Uncaught (in promise) false` while preserving both Happy Customers and v3 Write a review flows.

UGC remains intentionally unmounted until Instagram is connected and a post is published. Live Q&A publication, moderation, and submission still need an enabled Awesome-plan fixture.

## Verification performed

- Inspected the signed-in Judge.me and Shopify theme-editor UI in Brave.
- Read current public Judge.me settings and tokenless widget responses.
- Read only the presence and schema of required Shopify Admin metafields; no credential or raw customer data was recorded.
- Reproduced the original Review Widget parser error directly with Bun 1.3.14, then added regression coverage for the multilingual payload.
- Fetched a fresh Hydrogen product response and confirmed that enabled widgets are serialized independently, with Q&A/UGC absent rather than sampled.
- Performed a clean Private Brave reload. The console reported zero messages; Happy Customers rendered 839 product and 30 store reviews; Review Widget v3 rendered 337 reviews with primary- and other-language pagination; AI Reviews Summary rendered the real metafield; Trust Badge, exact Floating Tab, counters, carousels, snippets, popup, medals, and remaining enabled surfaces appeared.
- Opened and closed the v3 Write a review modal after the runtime-collision fix.
