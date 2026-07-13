# Working Judge.me Testimonials Carousel spike

Observed and implemented on 2026-07-13 against:

- `https://vanilla-slop.myshopify.com/products/wall-art-poster`
- the local Hydrogen harness at `http://localhost:3001/products/wall-art-poster`
- Judge.me's current Shopify extension deployment under `cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/`
- Judge.me's official [Testimonials Carousel documentation](https://judge.me/help/en/articles/11625803-testimonials-carousel)

This is a dated deployment observation. The extension URL, classic asset filenames, global functions, and undocumented CDN response shape can change.

## Result

Testimonials Carousel can be reproduced in Hydrogen without a private Judge.me token. The server reads a tokenless review list, React renders the configured block shell, and Judge.me's current deployment builds the one-review-at-a-time quote cards and review lightbox in the browser.

The public React configuration covers the current Shopify editor surface: review source, star filter, maximum review count, quote size/style, product-name size, verified presentation, card height, text and star sizes, arrow position, width, corners, colors, border, shadow, transition speed, header text, and aggregate visibility.

## Official product contract

Judge.me documents Testimonials Carousel as a Free-plan Shopify 2.0 app block that requires the Judge.me app embed. It displays one text review at a time, up to 30 reviews, and supports home, product, collection, page, blog, article, and cart templates. The aggregate header always represents all published product and store reviews, independently of the review subset shown in the carousel.

The documented review sources are all, product, store, current product, current collection, featured, custom products, and cart. Star filters are all, 5, 4–5, and 3–5. Custom products accepts up to ten products and combines their reviews in most-recent order.

The current layout/styling options are:

- quote mark size: small, medium, large, extra large, hidden
- product name size: small, medium, large, extra large, hidden
- verified reviewer: badge or text
- card height: compact, medium, tall, extra tall
- text size: extra small, small, medium, large, extra large, huge
- star size: small, medium, large, hidden
- arrows: sides, bottom, hidden
- width: 600–1600px
- corners: sharp, soft, rounded
- quote style: serif, typewritten, basic, bold, cartoon, sans serif
- card, stars/quotes, text, and arrow colors
- optional border and drop shadow
- transition: 0–60 seconds; zero disables movement
- editable header and optional aggregate rating

Judge.me documents no AI summary, write-review button, or cross-store-syndicated reviews in this block.

## Public data request

The block reads:

```text
GET https://cdn.judge.me/reviews/reviews_for_carousel
```

The request reproduced against the test store was:

```text
reviews_selection=all
carousel_type=testimonials
star_rating=all
max_reviews=20
url=https://vanilla-slop.myshopify.com
shop_domain=vanilla-slop.myshopify.com
platform=shopify
primary_language=en
```

No token or browser credential is required. The response contains a top-level `reviews` array. The observed 20-review response includes UUID, rating, body HTML, reviewer and verified state, product title/URL, translations, and the same normalized media fields used by the shared carousel lightbox.

The star wire values match Cards Carousel:

| React/editor value | CDN value     |
| ------------------ | ------------- |
| `all`              | `all`         |
| `5`                | `5_star`      |
| `4-5`              | `4_to_5_star` |
| `3-5`              | `3_to_5_star` |

Current product adds `product_ids`; current collection adds `collection_id`; custom products uses repeated `product_ids[]`. The Shopify cart implementation depends on a theme bridge. In Hydrogen, the adapter maps explicit current-cart product IDs to the equivalent `custom_products` public read and preserves `cart` as the caller-facing selection.

## Live Liquid and CSS contract

The live root is `.jdgm-widget.jdgm-testimonials-carousel` with a unique `data-jdgm-block-id`. Its current serialized CSS variables were:

```text
--max-width: 1100px
--text-color: #000000
--card-color: #F9F9F9
--border-radius: 8px
--border: none
--box-shadow: none
--quote-size: 24px
--quote-aspect: 1.52
--text-size: 24px
--text-size-mobile: 20px
--line-clamp: 3
--line-clamp-mobile: 4
--stars-size: 24px
--stars-color: #108474
--product-name-size: 16px
--arrows-color: #000000
--slides-count: 20
```

The quote mark itself is a Liquid-serialized SVG data URL. It is not supplied by the browser bundle or a stable asset URL. The React adapter generates the selected typographic quote style and keeps the CSS variable overrideable through the component `style` prop if a consumer captures the exact serialized SVG from its Shopify block.

## Browser runtime

Testimonials uses four current deployment pieces:

1. `carousels.css` supplies the exact shared header, card, arrow, clamp, and responsive layout.
2. `carousels.js` supplies aggregate/verified helpers, accessible active-card state, lightbox delegation, and shared carousel state.
3. `testimonials_carousel.js` builds `.jdgm-testimonial` cards from the server-fetched reviews and supplies simple navigation when the shared advanced navigation is absent.
4. the manifest entry `carousel-lightbox/main.js` supplies the current v3 review lightbox.

The adapter seeds `window.jdgmCarouselMode` and calls the builder directly, so the browser does not issue a second review request. React arrows call Judge.me's global next/previous functions without Liquid's inline `onclick` attributes. React also owns the autoplay interval so it can pause on hover or focus and remove the interval, focus/pointer listeners, and delegated lightbox listener during SPA unmount.

## Public React contract

- `fetchTestimonialsCarouselPage`: one tokenless review-list read.
- `fetchTestimonialsCarousel`: standalone review data plus public aggregate/settings/core-CSS reads.
- `createTestimonialsCarouselData`: combines the page with resources already returned by `fetchLegacyStorefrontWidgets`.
- `TestimonialsCarousel`: renders the shell and initializes the current deployment builder, styling, navigation, autoplay, and lightbox.

On the Hydrogen product route, the seven-request legacy batch remains shared. Reviews Grid, Cards Carousel, and Testimonials Carousel each add one tokenless read, making ten Judge.me requests total without repeating the large settings/CSS payload.

## Brave verification

A clean Brave reload on port 3001 showed the configured aggregate header and exactly one accessible active testimonial. The Next control changed the active review, automatic movement continued at the configured interval, and selecting the active card opened Judge.me's current v3 review lightbox with reviewer, date, title, body, rating, and product action.

The clean console contained only React's development-tools notice: no Testimonials runtime, CSP, or network error appeared. A Home/back SPA cycle rebuilt the testimonial root, resumed automatic movement, and left the component interactive.

## Risks and follow-ups

- Theme-editor values are serialized by Liquid and are not returned as a reusable public dashboard configuration. Headless callers must keep an equivalent React config or capture values from the theme block.
- The six quote silhouettes live in Liquid as data URLs rather than a stable extension asset. The typed styles work in React, while a captured `--quote-bg` style override provides literal store parity when required.
- The browser runtime is global and current-deployment-specific. Continue rejecting two shops or two extension deployments in one document.
- Card bodies are built by Judge.me's script from Judge.me's response. Do not treat arbitrary caller HTML as equivalent trusted input.
- Automatic translation depends on current Judge.me settings and translated review fields in the public response; test a multilingual storefront before claiming locale parity.

## Reproduction commands

```sh
ctx query "How does Testimonials Carousel fetch, configure, and initialize in Hydrogen?" \
  --label testimonials-carousel-spike-2026-07-13 \
  --cwd /Users/panda/Code/judgeme-react

bun run test
bun run lint
bun run typecheck
bun run build
```
