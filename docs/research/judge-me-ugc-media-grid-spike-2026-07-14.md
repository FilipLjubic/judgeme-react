# Working Judge.me UGC Media Grid spike

- Date: 2026-07-14
- Store: authorized store configured in the ignored Hydrogen `.env`
- Harness: Hydrogen, React 18, Brave Browser at `http://localhost:3001`

## Result

`UgcMediaGrid` is the seventeenth working React component. It preserves Judge.me's current hidden-JSON grid contract and lets the official legacy bundles render the dashboard title, subtitle, buttons, lazy media, pagination, product attachments, and gallery lightbox.

There are two server paths:

1. Prefer exact `ugc_media_grid` markup from Judge.me's public platform-independent cache response.
2. When that field is absent, read the tokenless public social-post feed and reconstruct only Judge.me's official wrapper, page-size attribute, and hidden JSON node. Judge.me's unmodified renderer still owns all visible markup and behavior.

The authorized store currently has no published Instagram posts. Its cache response omits `ugc_media_grid`, and its public social-post route returns HTTP 404, so the production component correctly remains unmounted. A temporary local one-image fixture exercised the real initializer and lightbox without adding fake customer content to the repository. A clean Brave reload left every production adapter ready, no adapters loading or errored, and zero console messages.

No private token is used, serialized, logged, committed, or stored in ctx.

## Official Shopify and plan behavior

Judge.me's current UGC Instagram Shopping documentation lists the widget on the Free plan. It displays approved Instagram photos and videos, normally starts with up to nine posts, and remains hidden until at least one post is published. The normal Shopify installation requires the Judge.me app embed and the Instagram Shopping Grid app block. Instagram authorization expires after two months and must be renewed for the widget to keep receiving media.

The official Liquid contract is:

```liquid
<div class="jdgm-widget jdgm-ugc-media-wrapper">
  {{ shop.metafields.judgeme.ugc_media_grid }}
</div>
```

Judge.me's separate platform-independent guide lists UGC Media Grid support but gates that external-storefront bootstrap behind the Awesome plan. This adapter's tokenless fallback is therefore an interoperability workaround for a Free-plan Shopify store using Hydrogen, not a guarantee that Judge.me will preserve the route indefinitely.

## Cache and fallback contracts

`widget_preloader.js` requests UGC when it finds `.jdgm-ugc-media-wrapper`:

```text
GET https://cache.judge.me/widgets/shopify/STORE.myshopify.com
  ?public_token=PUBLIC_WIDGET_TOKEN
  &ugc_media_grid=1
```

The same request may combine `medals=1`. It also returns `settings` and `html_miracle`, so `fetchLegacyStorefrontWidgets` requests Medals, UGC, dashboard settings, and shared CSS in one cache read.

Exact UGC content is the same structure used by Judge.me's Liquid metafield:

```html
<div class="jdgm-ugc-media" data-per-page="6">
  <div
    class="jdgm-ugc-media-data jdgm-hidden"
    data-json="[...]"
  ></div>
</div>
```

The app block or Liquid snippet supplies the outer `.jdgm-widget.jdgm-ugc-media-wrapper`. The React adapter adds that official shell when the cache returns only the inner metafield content.

If cache content is absent, the compatibility read is:

```text
GET https://api.judge.me/reviews/social_posts
  ?url=STORE.myshopify.com
  &shop_domain=STORE.myshopify.com
  &platform=shopify
  &per_page=9
  &page=1
```

The request uses neither the public nor private Judge.me token and currently responds with `Access-Control-Allow-Origin: *`. HTTP 404 is Judge.me's empty/unavailable state. A successful response contains `posts`, `page`, `per_page`, and `total`; current post media types include `IMAGE`, `VIDEO`, and `CAROUSEL_ALBUM`.

The fallback validates post IDs, HTTPS media and thumbnail URLs, media types, product arrays, page size, and JSON serializability before HTML-encoding the payload into the hidden data attribute. It never renders API strings directly as React markup.

## Dashboard settings and current runtime

The public settings response currently contains the complete UGC dashboard surface:

- title, subtitle, maximum width, arrow color, and timestamp visibility;
- primary “Buy now” button text, background, text, border, and radius;
- secondary “Load more” button text, background, text, border, and radius;
- “View reviews” button text, colors, border, radius, and destination.

`loader.js` maps `.jdgm-ugc-media` to `widget/others.js` and `widget/media.js`, and maps the widget to `media.css`. The current bundles:

- parse `.jdgm-ugc-media-data[data-json]`;
- render thumbnails and title/subtitle;
- lazy-load pictures;
- page through the tokenless `/reviews/social_posts` route;
- render Instagram captions and linked product attachments in the popup;
- open image or video media in the legacy gallery lightbox.

Both bundles scan the document when evaluated. The React component temporarily masks `.jdgm-ugc-media-wrapper` and `.jdgm-ugc-media`, waits for the public helpers, restores only its root, assigns a unique grid ID, and calls Judge.me's exposed `_transformJsonData` function. This prevents a first-document scan from racing React hydration or missing an SPA-mounted root. On unmount it closes any UGC lightbox and releases the body-open class; the shared document delegates remain installed once for the one supported Judge.me shop.

## CSP and external media

Instagram assets observed on the current public compatibility fixture used `*.cdninstagram.com`; Judge.me-hosted thumbnails used `judgeme.imgix.net`. Facebook-hosted Instagram assets may also use `*.fbcdn.net`. The Hydrogen host therefore adds the Instagram and Facebook wildcard origins to `img-src`, `media-src`, and `frame-src`, while the existing `https://*.judge.me` policy covers the public feed and Judge.me media.

## Request-efficient composition

When the cache includes UGC, the legacy storefront batch remains seven reads:

```text
product_review
preview_badge
featured_carousel
reviews_tab
verified_badge
all_reviews_page
cache.judge.me Medals + UGC + settings + html_miracle
```

When UGC is absent from cache, the compatibility social-post check is an eighth read. The current authorized store takes this path and receives a nullable 404. The complete Hydrogen loader is therefore fourteen Judge.me reads for an exact-cache store and fifteen for the current compatibility/empty path.

## Verification

- Exact cache normalization, official wrapper repair, settings/CSS reuse, tokenless fallback, and nullable 404 tests pass.
- Shared-batch coverage confirms Medals, UGC, settings, and CSS use one cache request when exact UGC is available.
- Public compatibility probe: six initial posts, one second-page post, then an empty third page.
- `bun run test`: 39 passing tests.
- `bun run lint`: passed.
- `bun run typecheck`: passed.
- `bun run build`: passed for the library and Hydrogen production bundles.
- Temporary local initializer fixture: one transformed thumbnail, dashboard title/subtitle, unique root ID, and working gallery open interaction.
- Brave clean production reload: UGC correctly absent, no runtime errors/loading states, zero console messages.

## Evidence

- UGC Instagram Shopping Widget: <https://judge.me/help/en/articles/8420861-ugc-instagram-shopping-widget>
- Platform-independent widgets: <https://judge.me/help/en/articles/8394958-platform-independent-widgets>
- Liquid code for Judge.me widgets: <https://judge.me/help/en/articles/12058208-liquid-code-for-judge-me-widgets>
- Current public `widget_preloader.js`, `loader.js`, `widget/others.js`, and `widget/media.js`, inspected 2026-07-14.
- Current authorized cache/social-post responses and Brave runtime, inspected 2026-07-14.
- Public rendering compatibility fixture, inspected 2026-07-14: <https://zivvys.com/>

## Implementation locations

- `packages/judgeme-react/src/ugc-media-grid.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `packages/judgeme-react/test/core.test.mjs`
- `examples/hydrogen/app/routes/products.$handle.tsx`
- `examples/hydrogen/app/entry.server.tsx`
