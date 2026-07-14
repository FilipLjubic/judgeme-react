# Working Judge.me Medals spike

- Date: 2026-07-14
- Store: authorized store configured in the ignored Hydrogen `.env`
- Harness: Hydrogen, React 18, Brave Browser at `http://localhost:3001`

## Result

`JudgeMeMedals` is the sixteenth working React component. It uses Judge.me's exact platform-independent Medals response, preserves the store's earned-medal and verified-review markup, and applies the current public runtime behavior without requiring the Awesome-plan installation UI or a Storefront-visible Judge.me metafield.

The authorized store returned six earned medals, a verified-only rating of 4.78, and 866 verified reviews. At a 400px responsive width, Brave rendered three medals at a time and the component-owned rotation advanced through the remaining medals. The adapter reached `data-judgeme-react-runtime-status="ready"` with zero console messages.

No private token is used, serialized, logged, committed, or stored in ctx.

## Official behavior

Judge.me's current Medals help article describes a Free-plan widget that combines:

- the verified-review star rating and review count;
- Judge.me verification branding;
- earned authenticity, transparency, review-volume, monthly-record, and top-shop medals.

The widget starts earning medals after at least 10 verified reviews while at least 80% of verified reviews are published. Its normal Shopify installation requires the Judge.me app embed. The public dashboard settings include background and element colors, a monochromatic presentation, verification placement, and the widget title.

The official Liquid contract remains:

```liquid
{{ shop.metafields.judgeme.medals }}
```

That app-owned metafield returned `null` through both public and private Storefront API reads on the headless fixture, so it is not a reliable Hydrogen data contract.

## Exact public cache contract

Judge.me's current `widget_preloader.js` requests this public platform-independent cache route whenever it finds `.jdgm-medals-wrapper`:

```text
GET https://cache.judge.me/widgets/shopify/STORE.myshopify.com
  ?public_token=PUBLIC_WIDGET_TOKEN
  &medals=1
```

The response contains all three values needed by a standalone React adapter:

```json
{
  "settings": "<script>window.jdgmSettings = {...}</script>...",
  "html_miracle": "<style>...</style>",
  "medals": "<div class=\"jdgm-medals-wrapper jdgm-hidden jdgm-widget\">...</div>"
}
```

The exact Medals markup includes:

- every earned `.jdgm-medal-wrapper`, with relative official asset paths and accessible descriptions;
- `.jdgm-rating__stars[data-score]` for the verified-only rating;
- `.jdgm-rating__count[data-value]` for the exact verified-review count;
- the Judge.me reviews-site destination;
- the verified-branding shell expected by the current runtime.

The current fixture returned six earned medals. “Up to three” is a visible-at-once mobile layout rule, not a reason to discard the remaining earned medals: the current runtime rotates through all six.

`fetchJudgeMeMedals` validates non-executable markup, the exact widget roots, the numeric rating/count, and the earned medal count. An empty or `null` response becomes `null` rather than a fabricated widget.

## Dashboard settings and runtime

The 2026-07-14 public settings payload included:

```json
{
  "medals_widget_background_color": "#f9fafb",
  "medals_widget_border_color": "#f9fafb",
  "medals_widget_custom_css": "",
  "medals_widget_elements_color": "#108474",
  "medals_widget_position": "footer_all_pages",
  "medals_widget_title": "Judge.me Review Medals",
  "medals_widget_use_monochromatic_version": false,
  "medals_widget_verified_text_position": "right",
  "widget_verified_by_judgeme_text_in_store_medals": "Verified by Judge.me",
  "widget_show_store_medals": true
}
```

`loader.js` maps `.jdgm-medals` to `widget/others.js` and `.jdgm-medal__image` to `widget/media.js`. The media bundle loads the official medal assets, renders stars and verification branding, applies rebranding/monochrome settings, switches to the compact layout below 680px, and rotates more than three medals every three seconds.

The official media bundle creates that mobile interval without retaining its ID. The React component temporarily masks the three auto-scan class names while the public helpers load, then performs the same transformation for its own root and retains its interval for cleanup. This avoids leaked rotations after SPA unmounts and stale React Strict Mode effects.

The current non-monochrome helper emitted `<img>` medal assets. Readiness accepts the runtime's `<img>` or inline `<svg>` output. Medal assets use `judgeme-public-images.imgix.net`, which is already required in the host's `connect-src` and `img-src` policies.

## Request-efficient composition

The cache response contains the `settings` and `html_miracle` payloads that Judge.me's own platform-independent bootstrap uses. `fetchLegacyStorefrontWidgets` therefore reuses this one response for Medals and the shared settings/CSS rather than making separate Widget API resource requests.

The eight implemented legacy widgets now require seven reads:

```text
product_review
preview_badge
featured_carousel
reviews_tab
verified_badge
all_reviews_page
cache.judge.me Medals + settings + html_miracle
```

The full Hydrogen product loader now makes fourteen Judge.me reads: the seven-request legacy batch plus one public read each for Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Pop-up Reviews, Review Snippets, and Questions & Answers. AI Reviews Summary still adds no Judge.me read because its production content comes from Shopify's Storefront metafield.

## Cloudflare Workers detail

Cloudflare's global `fetch` must be called unbound. Calling `context.fetchImplementation(...)` binds the request context as `this` and causes an `Illegal invocation` error in MiniOxygen even though Node accepts it. The cache adapter first copies the injected function to a local variable, then calls it. A regression test asserts that the injected fetch receives `this === undefined`.

## Verification

- Exact standalone cache fetch and nullable response tests pass.
- Shared-batch coverage confirms Medals and resources use one cache request.
- `bun run test`: 36 passing tests.
- `bun run lint`: passed.
- `bun run typecheck`: passed.
- Brave clean reload at 400px: six accessible earned medals, rating 4.78, verified count 866, `ready` status, zero console messages.
- Mobile rotation probe: `scrollLeft` advanced from 43 to 192 after one interval.

## Evidence

- Judge.me Medals: <https://judge.me/help/en/articles/8420884-judge-me-medals>
- Judge.me platform-independent widgets: <https://judge.me/help/en/articles/8394958-platform-independent-widgets>
- Current public `widget_preloader.js`, `loader.js`, `widget/others.js`, and `widget/media.js`, inspected 2026-07-14.
- Current authorized cache response and Brave runtime, inspected 2026-07-14.

## Implementation locations

- `packages/judgeme-react/src/judge-me-medals.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `packages/judgeme-react/test/core.test.mjs`
- `examples/hydrogen/app/routes/products.$handle.tsx`
- `examples/hydrogen/app/styles/app.css`
