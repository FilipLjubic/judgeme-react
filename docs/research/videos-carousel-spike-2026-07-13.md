# Working Judge.me Videos Carousel spike

Date: 2026-07-13

## Evidence

- Judge.me's official [Videos Carousel documentation](https://judge.me/help/en/articles/11883318-videos-carousel)
- the live `vanilla-slop.myshopify.com/products/wall-art-poster` block in Brave
- the current Judge.me Shopify extension deployment under `cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/`
- direct tokenless reads from `cdn.judge.me/reviews/reviews_for_carousel`
- the Hydrogen harness at `http://localhost:3001/products/wall-art-poster`

The deployment UUID and observed endpoint behavior are dated implementation details, not stable package versions. The host continues to supply `v3AssetBaseUrl` instead of the library hardcoding that URL.

## Result

`VideosCarousel` now reproduces the current Shopify app block in Hydrogen without a private Judge.me token. The loader makes one tokenless CDN review read, React server-renders the configured block shell, and Judge.me's current extension scripts build the cards, navigation, media behavior, and review lightbox.

A clean Brave reload rendered the same `Real customer stories` header, 4.78 aggregate, 867-review count, verification treatment, and four photo cards as the live Shopify block. Next moved the active card. Clicking Donna M's card opened Judge.me's own Media Gallery with the review image, rating, reviewer, date, full body, and product CTA. Closing the lightbox restored the page.

The fixture currently has no published video cards. The `videos-only` request contract is implemented and tested, but actual iframe playback/autoplay still needs a seeded video review for browser verification. The live `photos-and-videos` mode and image lightbox are verified.

## Official block contract

Judge.me documents Videos Carousel as a Free-plan Shopify 2.0 block. It requires the Judge.me app embed and can show up to 30 cards. Its theme-editor controls cover:

- all, product, store, current-product, current-collection, featured, custom-product, and cart review selection;
- all, 5-star, 4–5-star, and 3–5-star filters;
- videos only, photos and videos, or any review;
- reviewer name, star size, text size, arrow position, and 600–1600px maximum width;
- sharp, soft, or rounded corners; header/card/star/arrow colors; border and shadow;
- media autoplay, 0–60-second transition speed, Highlight or Perspective layout;
- header text and aggregate-rating visibility.

Videos-only mode requires at least three published video reviews before Judge.me shows the block. Header aggregates remain shop-wide and do not change with the review selection.

## Tokenless data contract

The public read is:

```text
GET https://cdn.judge.me/reviews/reviews_for_carousel
```

The required Videos-specific fields are:

```text
carousel_type=videos
review_type=video | photo_and_video | all
```

The React configuration maps them as follows:

| `VideosCarouselConfig.reviewType` | CDN `review_type` |
| --- | --- |
| `videos-only` | `video` |
| `photos-and-videos` | `photo_and_video` |
| `any-review` | `all` |

Omitting `review_type` returned HTTP 400 on 2026-07-13. The live store's `photo_and_video` request returned four normalized cards, each with a UUID, rating, `card_type: "photo"`, image variants, reviewer data, and product metadata. The endpoint did not require the public Widget API token.

The remaining selection/star/product/language parameters match Cards and Testimonials Carousel. Headless cart mode maps explicit current-cart product IDs to the public `custom_products` read because Judge.me's Shopify cart bridge is not present in Hydrogen.

## Runtime and asset graph

Videos Carousel reuses the current carousel family:

1. `carousels.css` provides the header, Highlight/Perspective card layout, arrows, media overlays, responsive rules, and video controls.
2. `carousels.js` exposes `jdgmCarouselUtils`, header customization, start-index calculation, lightbox delegation, and shared carousel state.
3. `media_carousel.js` exposes `jdgmBuildMediaCards`; it builds video iframes, photo cards, and text fallbacks from the CDN response.
4. `video_carousel.js` scans the document and attaches navigation, swipe, positioning, player controls, autoplay behavior, and per-root cleanup state.
5. `manifest.json` resolves `carousel-lightbox/main.js` and its current CSS/import graph.

The adapter seeds `window.jdgmCarouselMode[blockId]` with the server-fetched reviews before calling those builders. This avoids a second browser CDN review request. Because `video_carousel.js` scans only roots present when it evaluates, the adapter gives every SPA mount a unique query string and releases the player instance, delegated click listener, timers, and mode entry on unmount.

React owns CSP-safe arrow buttons. The Shopify block's inline handler attributes are not copied.

### Current readiness contract

The second live store exposed a false timeout in the adapter on 2026-07-13. Its tokenless `photo_and_video` response contained four photo cards, and Brave showed that Judge.me had built all four cards, selected one active card, set `_videoCarouselInitialized`, and attached a `_videoCarouselInstance` with navigation, timer, centering, and cleanup methods. The block was visible and interactive.

The timeout came from waiting for `_initialPositioningComplete`. The current `video_carousel.js` sets that private flag in its cloned Cards Carousel positioning path, but does not set it for a normal Videos Carousel. Videos readiness now follows the state the current deployment actually establishes: initialized root, attached carousel instance, and an active media card. Empty feeds still use the explicit zero-review branch.

## Configuration parity and limits

The live Highlight block supplied the card dimensions now used by the adapter. Perspective uses the same deployed CSS semantics with smaller secondary-card dimensions supplied by React; it is covered by the typed configuration and static tests but has not yet been compared against a saved Shopify Perspective block.

The adapter intentionally keeps the complete Judge.me review/media object rather than reducing it to a custom card schema. The v3 lightbox consumes fields such as `pictures_urls`, `video_external_ids`, and `media_platform_hosted_video_infos` directly.

`createVideosCarouselData` accepts settings, shared CSS, and shop aggregates from `fetchLegacyStorefrontWidgets`. With Reviews Grid, Cards, Testimonials, and Videos Carousel mounted together, the product route makes eleven Judge.me reads: the seven-request legacy storefront batch plus one tokenless read per exact widget. The roughly 600-field settings object and core CSS remain shared.

## Verification

- `bun run test`: 22 passing tests after adding the Videos request/config coverage.
- `bun run lint`: passed.
- `bun run typecheck`: passed.
- Hydrogen SSR returned HTTP 200 and included `data-judgeme-react-widget="videos-carousel"`.
- Clean Brave reload: four cards rendered with the expected current-store styling.
- Next arrow: active-card navigation worked.
- Photo card: Judge.me Media Gallery opened with the correct review and product CTA; Close worked.
- Second-store regression check: four photo cards, one active card, attached navigation instance, and zero console messages after a clean reload and Next interaction.

Production build verification is run with the final repository gate after documentation changes.

## Follow-up fixtures

- Publish at least three test video reviews to verify Cloudflare- and media-platform-hosted iframe variants.
- Exercise `autoplayMedia: true`, manual play/pause, and carousel movement while a video is active.
- Compare a Shopify Perspective block against the React secondary-card dimensions.
- Exercise a real Hydrogen cart selection with current cart product IDs.
