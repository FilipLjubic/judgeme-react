# Working Judge.me Cards Carousel spike

Observed and verified on 2026-07-13 against:

- `https://vanilla-slop.myshopify.com/products/wall-art-poster`
- the local Hydrogen harness at `http://localhost:3001/products/wall-art-poster`
- Judge.me's current Shopify extension deployment under `cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/`
- Judge.me's official [Cards Carousel documentation](https://judge.me/help/en/articles/12930379-cards-carousel)

This is a dated observation of the current deployment, not a claim that the asset URL or undocumented wire format is permanent.

## Result

Cards Carousel can be reproduced in Hydrogen without using a private Judge.me token. The working adapter uses one tokenless server request for review data, server-renders the configured block shell, then loads Judge.me's deployment-specific carousel CSS/scripts and v3 lightbox module in the browser.

The local component now matches the configured Shopify block: four cards on desktop, media-first ordering, Judge.me's colors and typography, verified branding, automatic/arrow movement, swipe-capable looping, product links, and the current review lightbox.

## Official product contract

Judge.me documents Cards Carousel as a Free-plan Shopify 2.0 app block. It supports up to 30 reviews, mobile responsiveness, a media lightbox, several review sources and star filters, media/recent ordering, media fallbacks, 3–5 desktop cards, optional reviewer/product names, mobile arrows, side/bottom arrows, width/corner/color controls, transition speed, header text, and optional aggregate rating. The Judge.me app embed must be enabled.

Those block settings are not fetched from a public dashboard-settings endpoint. Shopify Liquid serializes the chosen values into the block root and an inline initialization object. A headless adapter therefore needs an equivalent serializable React configuration. The current implementation defaults to the values observed on the test store.

## Public data request

The block reads:

```text
GET https://cdn.judge.me/reviews/reviews_for_carousel
```

The observed Cards request was:

```text
reviews_selection=all
carousel_type=cards
star_rating=all
max_reviews=20
url=https://vanilla-slop.myshopify.com
shop_domain=vanilla-slop.myshopify.com
platform=shopify
primary_language=en
display_order=media_first
```

No `api_token` or browser credential is sent. The response is JSON with a top-level `reviews` array. Each current review contains the UUID, rating, safe-to-display body HTML, reviewer/product fields, verified status, media arrays, a normalized `card_type`, and normalized `picture`/`video` objects used by the card builder and lightbox.

Observed star-filter wire values:

| Theme-editor choice | CDN value     |
| ------------------- | ------------- |
| All                 | `all`         |
| 5 stars             | `5_star`      |
| 4–5 stars           | `4_to_5_star` |
| 3–5 stars           | `3_to_5_star` |

The selection values match the carousel runtime's conditions: `all`, `current_product`, `current_collection`, `custom_products`, `featured_reviews`, `product_reviews`, and `store_reviews`. `current_product` sends `product_ids`; `current_collection` sends `collection_id`; `custom_products` sends repeated `product_ids[]` values.

Judge.me's theme implementation treats `cart` specially and waits for a cart-mode bridge rather than issuing the normal public request. In headless React, the adapter accepts the current cart's product IDs and maps that selection to a `custom_products` public read. That produces the useful cart-scoped review set without depending on the Shopify theme bridge.

## Hybrid browser runtime

Cards Carousel is not one self-contained v3 entry. The live block combines four deployment assets:

1. `carousels.css` supplies the exact block layout and responsive container queries.
2. `carousels.js` supplies shared card/rating/verified/lightbox helpers and carousel state.
3. `media_carousel.js` builds Cards and Videos card DOM from normalized reviews.
4. `video_carousel.js` supplies clones, transforms, looping navigation, automatic movement, swipe, and media controls for both Videos and Cards.

Its review modal is the separate Vite entry `carousel-lightbox/main.js`, currently emitted as `carousel_lightbox.js`. The adapter resolves that filename and its CSS/import graph from the deployment's `manifest.json` instead of assuming the emitted filename will remain stable.

The theme normally invokes carousel navigation with inline `onclick` handlers. The React shell uses ordinary React click handlers that call the same `window.jdgmNextCard` and `window.jdgmPreviousCard` functions, avoiding CSP-unsafe inline JavaScript.

The runtime must execute `video_carousel.js` again for each new SPA root because that script scans only roots present during evaluation and marks them as initialized. A unique query string reruns its scanner while its root-local guard skips existing carousels. Review data is seeded into `window.jdgmCarouselMode` before the scan, so the browser does not repeat the tokenless CDN request.

## Current React contract

The public pieces are:

- `fetchCardsCarouselPage`: one tokenless carousel-data read.
- `fetchCardsCarousel`: standalone data plus public settings/aggregate/core CSS reads.
- `createCardsCarouselData`: combines a carousel page with resources already returned by `fetchLegacyStorefrontWidgets`.
- `CardsCarousel`: renders the block shell and mounts Judge.me's current deployment assets.

On the product harness, the seven-request legacy storefront batch remains shared. Reviews Grid adds one tokenless request and Cards Carousel adds one tokenless request, so the full route currently makes nine Judge.me reads. The large settings/core-CSS resources are reused rather than fetched again.

The consuming app must supply the current Shopify extension `v3AssetBaseUrl`. It must not be hardcoded as a library constant because Judge.me/Shopify deployment IDs and emitted files can change.

## Brave verification

A clean Brave reload on port 3001 showed:

- `Customers are saying`
- aggregate rating `4.78` and count `867`
- verified branding from current Judge.me settings
- four configured desktop cards
- current media-first card images and text fallbacks
- working automatic movement and Previous/Next controls
- the v3 review lightbox opening from a card and closing normally
- Cards Carousel and Reviews Grid remounting after Home/back navigation

No new CSP or runtime error was forwarded after the clean reload and interactive path. Earlier timeout errors in the development log belonged to hot-module replacement roots created while the runtime source was being rebuilt, not the clean verification document.

## Risks and follow-ups

- The carousel endpoint, classic asset filenames, and global functions are undocumented and can drift. Keep a real-browser smoke test against the current deployment.
- The public aggregate reused here is the combined store aggregate. Judge.me's documentation describes verified-review aggregates where available; a store with verified reviews should be compared against the Liquid block before calling the aggregate universally exact.
- Video reviews may introduce Stream, YouTube, or Vimeo hosts only after interaction. The consuming app owns CSP and should extend its allowlist when an exercised media path proves another current origin is required.
- Card bodies are created by Judge.me's own script from Judge.me's public response. Do not treat arbitrary caller-supplied HTML as an equivalent trusted source.

## Reproduction commands

```sh
ctx query "How does Cards Carousel fetch reviews and initialize in Hydrogen?" \
  --cwd /Users/panda/Code/judgeme-react

bun run test
bun run lint
bun run typecheck
bun run build
```
