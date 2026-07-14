# Judge.me new Review Widget v3 spike

- Date observed: 2026-07-14
- Storefront harness: Shopify Hydrogen on `http://localhost:3001`
- Browser: Brave

## Outcome

The exact current Shopify Review Widget can be mounted in React without a private Judge.me token. The adapter combines Judge.me's tokenless structured review feed, the store's shared public dashboard settings, the current Shopify extension deployment, and the legacy core runtime required by the review form.

The current authorized store has the new Review Widget disabled. Its CDN request therefore returns legacy HTML instead of v3 JSON. Production behavior is to return `null`; the Hydrogen harness explicitly opts into Judge.me's official sample endpoint and labels the result as a disabled-feature preview. This avoids presenting sample reviews as store data.

Judge.me documents the new Review Widget as a Shopify app block whose layout, content, filters, colors, and review form are customized from the Judge.me dashboard and theme editor. Judge.me's platform-independent installation guide still documents only the legacy widget, so the exact v3 mount is a compatibility adapter rather than an official headless integration contract:

- [Customizing the Review Widget (new version)](https://judge.me/help/en/articles/12460582-customizing-the-review-widget-new-version)
- [Adding the Review Widget on your product page](https://judge.me/help/en/articles/11424925-adding-the-review-widget-on-your-product-page)
- [Platform-independent widgets](https://judge.me/help/en/articles/8394958-platform-independent-widgets)

## Data contract

The initial product page is a tokenless request:

```text
GET https://cdn.judge.me/reviews/reviews_for_widget
  ?shop_domain=<permanent-myshopify-domain>
  &platform=shopify
  &product_id=<numeric-shopify-product-id>
  &page=1
```

The response has two observed shapes:

1. A v3-enabled store returns structured JSON containing `reviews`, `average_rating`, `number_of_reviews`, `number_of_questions`, `histogram`, `pagination`, `photo_gallery`, keywords, medals, and custom-form filter metadata.
2. A store with v3 disabled returns the legacy `{html, page, total_count}` shape. The adapter returns `null` unless `previewWhenDisabled` is explicitly enabled.

The theme-editor preview source is also tokenless:

```text
GET https://api.judge.me/reviews/sample_review_widget_data
  ?shop_domain=<permanent-myshopify-domain>
  &platform=shopify
  &review_type=product
```

On 2026-07-14 the official sample contained 15 unmistakably labeled sample reviews, five initial review records, and a Vimeo ID whose oEmbed resource returned HTTP 404. The adapter removes video IDs only from the disabled-preview payload. It never changes video metadata returned by the real CDN feed.

## Extension/runtime contract

The current deployment manifest maps:

- `review-widget/main.js` to the Review Widget entry and `layout-*.css`.
- `review-widget/ReviewWidgetManager.js` to the directly importable manager module.

The React root preserves the app block datasets for product ID, title, handle, Store reviews visibility/count, shop aggregate rating/count, maximum width, and the three empty-state modes: `empty_widget`, `hide_widget`, and `other_products_reviews`.

Initialization is:

1. Load Judge.me's public legacy core runtime so the Write a review form has its expected shared behavior.
2. Merge the shared public dashboard settings into `window.jdgmSettings` and enable the revamp flag for this exact root.
3. Seed `window.jdgm.data.reviewWidget[productId]` with the validated loader payload.
4. Load the deployment's manifest CSS and import `ReviewWidgetManager`.
5. Construct the manager for the root and await `initialize()`.
6. Require `.jdgm-widget-revamp .jm-review-widget` before reporting ready.
7. On SPA unmount, call the manager-owned Vue app's `unmount()`, clear the root, and release any preview response retained by the fetch bridge.

The current manager performs later product/store tab and pagination reads itself. The disabled-preview path therefore installs a narrow, reference-counted fetch bridge for the exact matching product request only. All real store-review, form, and unrelated fetches continue to the browser's original `fetch`.

## CSP

The consuming Hydrogen app owns CSP. In addition to the existing Judge.me and Shopify deployment origins, the current v3 media path needs:

- `connect-src https://vimeo.com` for Vimeo oEmbed metadata.
- `img-src https://i.vimeocdn.com` for Vimeo thumbnails.
- `img-src https://i.ibb.co` only for Judge.me's current official sample images.
- `frame-src https://player.vimeo.com` when a real Vimeo review is played.

The broken official sample Vimeo ID is suppressed in preview mode, but the legitimate origins remain allowed for real review media.

## Brave verification

After a clean reload in the user's Hydrogen Brave window:

- the exact deployment stylesheet and current dashboard settings rendered;
- the header, histogram, Write a review button, Filters control, sorting, Product reviews tab, and Store reviews tab were present;
- Write a review opened Judge.me's modal with the current product and rating inputs, then closed cleanly;
- switching to Store reviews loaded the authorized store's published store reviews and selected the tab;
- the console remained at `0 messages` after the CSP/sample-video fix.

### Submission follow-up

A later clean run against the user's current authorized store exercised the complete live form rather than stopping after open/close. The browser advanced through rating, required review content and title, required reviewer name and email, and the optional media step. The final **Next step** control on the media page is the submission action; Judge.me accepted the request and rendered its processing state with an email-confirmation requirement.

The test used an unmistakable test title/body and a reserved `example.com` address. That address cannot complete the confirmation step, so this verifies the Hydrogen browser-to-Judge.me submission path and Judge.me's accepted response, but not email delivery, moderation, verification, or eventual publication.

## Known limits

- The store used for the original observation did not have v3 enabled, so that first render used the explicitly labeled official sample preview. The later authorized-store run returned the live current widget and real review data.
- Live submission acceptance is verified. Email confirmation, moderation, verification, and eventual publication remain unverified because the test intentionally used a non-receivable reserved address.
- Live v3 product pagination and filter requests still need a focused interaction trace.
- Real v3 video playback still needs a published video-review fixture. The official sample's current Vimeo item is unusable because the upstream fixture is gone.
- The deployment asset base is intentionally host-supplied and validated. Shopify extension deployment URLs must not be hardcoded as permanent library constants.
