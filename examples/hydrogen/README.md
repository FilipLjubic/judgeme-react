# Judge.me React Hydrogen harness

This is the real-store integration harness for `@judgeme-react/core`. It mounts the implemented `StarRatingBadge`, `VerifiedReviewsCounter`, `AllReviewsCounter`, `AiReviewsSummary`, `ReviewSnippets`, `ReviewsCarousel`, `LegacyReviewWidget`, `AllReviewsWidget`, `FloatingReviewsTab`, `ReviewsGrid`, `CardsCarousel`, `TestimonialsCarousel`, `VideosCarousel`, and `PopupReviews` on product routes. It is not a second publishable package.

## Local setup

From the repository root:

```sh
bun install
cp examples/hydrogen/.env.example examples/hydrogen/.env
bun run dev
```

The local storefront runs at `http://localhost:3001`. Port 3000 is intentionally left free for other projects.

Populate `.env` with the Shopify Headless channel values and these Judge.me values:

```dotenv
JUDGEME_SHOP_DOMAIN=store.myshopify.com
JUDGEME_PUBLIC_TOKEN=your-public-widget-api-token
JUDGEME_V3_ASSET_BASE_URL=https://cdn.shopify.com/extensions/current-deployment/judgeme-handle/assets/
```

`JUDGEME_PRIVATE_TOKEN` is reserved for future server-only adapters. The current product widgets do not use it, and it must never be sent through route data or React context.

Open a published product at `/products/<handle>`. The route fetches the product badge, Verified Reviews Counter, shop-wide aggregate counter, classic carousel, legacy Review Widget, All Reviews Widget, Floating Reviews Tab, v3 Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Pop-up Reviews, Review Snippets, and Questions & Answers before returning loader data. It also requests `shop.metafields.judgeme.store_summary_widget_data` in the existing Shopify product query for AI Reviews Summary. The seven legacy components share one settings/CSS payload; the grid, three carousels, native popup, snippets, and Q&A reuse those resources while each adds one tokenless public request. AI Reviews Summary adds no Judge.me data request. The All Reviews response supplies the aggregate-counter values and is also reused for the floating tab when Judge.me returns no official tab markup on a Free-plan store. The home page independently fetches the store-level Verified Reviews Counter so it remains testable without product data.

Review Snippets is placed directly below the AI summary in the vertical widget stack. Its loader call uses the public v2 snippet endpoint; a narrowly scoped preload bridge gives the exact current Judge.me module that response when it initializes, so the browser does not repeat the request. The current Free-plan fixture returns five product reviews even though Judge.me officially presents the theme block as an Awesome-plan widget.

Judge.me only creates the store-summary metafield for an enabled AI Reviews Summary. The current Free-plan test store returns `null`, so this harness substitutes a conspicuously labeled local fixture for lifecycle testing; production library consumers receive `null` when no real metafield is present and should omit the component.

`JUDGEME_V3_ASSET_BASE_URL` is the current Judge.me Shopify extension `assets/` directory visible in the theme's app-embed loader. It is deployment-specific and should be refreshed when Judge.me publishes a new extension build.

## CSP

The tested host policy is in `app/entry.server.tsx`. When changing it:

- preserve `'self'` when supplying a custom Hydrogen `scriptSrc`;
- allow Judge.me's CDN, API, media, and frame hosts;
- allow `cdn.shopify.com` in `scriptSrc`, `styleSrc`, `connectSrc`, `fontSrc`, and `imgSrc` for v3 manifests, modules, CSS, fonts, and images;
- allow `judgeme-public-images.imgix.net` in both `connectSrc` and `imgSrc` because the branded verification helper fetches its SVG before rendering it;
- allow `s3.amazonaws.com` in `imgSrc` when supporting the classic Verified Reviews Counter image;
- use `workerSrc: ["'self'", 'blob:']` for Vite's local blob worker instead of adding `blob:` to `scriptSrc`.

## Verification

```sh
bun run test
bun run lint
bun run typecheck
bun run build
```

Compilation checks do not prove the third-party widget is healthy. Runtime changes also require a clean Brave reload of a product with representative reviews and a relevant interaction check, such as moving a carousel or Review Snippets, opening the AI summary accordion, opening the write-review modal, changing the All Reviews stream, changing the floating tab's review stream, or opening an exact-widget lightbox.

This app started from Shopify's Hydrogen Skeleton template. Refer to the [Hydrogen documentation](https://shopify.dev/docs/storefronts/headless/hydrogen) for storefront and Customer Account API setup.
