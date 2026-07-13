# Working Judge.me Reviews Carousel spike

- Date: 2026-07-13
- Store: `vanilla-slop.myshopify.com`
- Harness: Hydrogen 2026.4.3, React 18, installed Brave Browser binary

## Result

`ReviewsCarousel` is the third working library component. It server-renders Judge.me's classic shop-level carousel and lets Judge.me's current browser bundle apply dashboard settings and interaction behavior.

A clean isolated Brave run on `Wall Art Poster` found 15 carousel items. The default theme was visible at 314 pixels high, all three React adapters reported `ready`, and the right arrow moved the carousel to slide 8 with a `translate3d(-3320px, 0, 0)` transform. The page had no console or runtime errors. A second clean run navigated to Home through Hydrogen's client router and back through browser history; all three adapters returned to `ready`, and the remounted carousel still advanced.

This is the classic Reviews Carousel listed in Judge.me's platform-independent widget documentation. It is separate from the newer Cards, Testimonials, and Videos carousel Shopify blocks.

## Public API contract

The public-token request is shop-level and has no product ID:

```text
GET https://judge.me/api/v1/widgets/featured_carousel
  ?shop_domain=STORE.myshopify.com
  &api_token=PUBLIC_TOKEN
```

The live response had one field:

```ts
interface FeaturedCarouselResponse {
  featured_carousel: string;
}
```

The `featured_carousel` value was 18,330 bytes. It contained the `.jdgm-widget.jdgm-carousel.jdgm-carousel--default-theme` marker, 15 review cards, inline display rules, reviewer names, rating labels, review excerpts, and relative product links. `fetchReviewsCarousel` rejects script tags, inline event handlers, and `javascript:` URLs before returning this markup.

## Browser runtime contract

Judge.me's current `loader.js` maps `.jdgm-carousel` to `widget/others.js`. That bundle exposes `jdgm.initializeCarousel()`, applies the `jdgm-carousel--done` completion class, wires the arrows and touch behavior, starts the configured auto-slide timer, and uses the shared `jdgmSettings` object for theme, title, timing, review count, and link behavior.

The bundle schedules its own initialization when it first loads. The React adapter gives that callback one event-loop turn before calling the global initializer itself. This avoids duplicate listeners on the initial server-rendered marker while still covering a carousel inserted after client navigation. The component clears Judge.me's per-carousel auto-slide interval when it unmounts.

## Shared-runtime SPA fix

The first Home/back test exposed a Review Widget failure next to the healthy remounted carousel. Judge.me's loader had prefetched `widget/form.js` and `widget/media.js`, but it had not executed them. Its public `initializeWidgets()` function calls form, question, submission, and media initializers without checking whether those functions exist, so the React adapter timed out before setup.

The shared runtime now requests both scripts and their `form.css`/`media.css` assets before manual Review Widget initialization, then waits for the required functions. A fresh Brave Home/back cycle confirmed `jdgm--done-setup-widget`, `jdgm-carousel--done`, all three React status attributes at `ready`, and no console or page errors.

## Shared resource batching

The standalone `fetchReviewsCarousel` call requests `featured_carousel`, `settings`, and `html_miracle`. Product pages that render all three implemented widgets should use `fetchLegacyStorefrontWidgets`, which makes five concurrent requests:

```text
product_review
preview_badge
featured_carousel
settings
html_miracle
```

The loader returns compact markup records and one shared `resources` object. In the Hydrogen harness, the badge and carousel set `includeStyles={false}` while the Review Widget emits the shared dashboard CSS once.

## Current limits

- `initializeCarousel()` scans the document rather than accepting a root. A page with multiple newly inserted carousels needs a dedicated multi-instance navigation test before that case can be claimed.
- The endpoint's product links are relative. They work with the current `/products/<handle>` Hydrogen routes, but consumers with a different URL scheme need a link-rewrite hook.
- Gallery-theme full-review modals and auto-slide timing have not been exercised yet.
- Empty-carousel behavior still needs a store with no eligible featured reviews.
- Cards, Testimonials, and Videos carousels use a different Shopify extension/data contract and remain unimplemented.

## Implementation locations

- `packages/judgeme-react/src/reviews-carousel.tsx`
- `packages/judgeme-react/src/legacy-api.ts`
- `packages/judgeme-react/src/legacy-runtime.ts`
- `examples/hydrogen/app/routes/products.$handle.tsx`
