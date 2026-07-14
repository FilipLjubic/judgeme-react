# Judge.me React Hydrogen harness

This is the real-store integration harness for `@judgeme-react/core`. It mounts the implemented `StarRatingBadge`, `VerifiedReviewsCounter`, `JudgeMeMedals`, `UgcMediaGrid`, `TrustBadge`, `AllReviewsCounter`, `AiReviewsSummary`, `ReviewSnippets`, `QuestionsAndAnswers`, `ReviewsCarousel`, `LegacyReviewWidget`, `AllReviewsWidget`, `FloatingReviewsTab`, `ReviewsGrid`, `CardsCarousel`, `TestimonialsCarousel`, `VideosCarousel`, and `PopupReviews` on product routes. It is not a second publishable package.

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
JUDGEME_STOREFRONT_URL=https://store.myshopify.com/products/published-product
JUDGEME_V3_ASSET_BASE_URL=https://cdn.shopify.com/extensions/current-deployment/judgeme-handle/assets/
SHOPIFY_ADMIN_ACCESS_TOKEN=your-server-only-admin-api-token
SHOPIFY_ADMIN_API_VERSION=2026-04
```

`JUDGEME_PRIVATE_TOKEN` is reserved for future server-only Judge.me adapters. The current product widgets do not use it, and it must never be sent through route data or React context.

`SHOPIFY_ADMIN_ACCESS_TOKEN` is used only by the server loader to read Judge.me's Trust Badge shop metafields and to fall back to the AI Reviews Summary metafield when Shopify does not expose it through the Storefront API. Never return it from a loader, log it, or expose it through `JudgeMeProvider`. `SHOPIFY_ADMIN_API_VERSION` defaults to the stable `2026-04` version in the harness.

Open a published product at `/products/<handle>`. The route fetches the product badge, Verified Reviews Counter, Medals, UGC Media Grid, Trust Badge, shop-wide aggregate counter, classic carousel, legacy Review Widget, All Reviews Widget, Floating Reviews Tab, v3 Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Pop-up Reviews, Review Snippets, Happy Customers, and the new Review Widget before returning loader data. Questions & Answers is fetched only when the current dashboard setting enables it. The legacy components share one settings/CSS payload, but each returned widget is nullable and rendered independently. Malformed collection rows are discarded, optional metadata gets a safe fallback, and one deployment or response-shape failure no longer blanks the page. Unsafe markup and product/selection mismatches still fail closed. The All Reviews response supplies aggregate values and the floating-tab fallback when Judge.me returns no official tab markup. The home page independently fetches the store-level Verified Reviews Counter so it remains testable without product data.

The existing Shopify product query first requests `shop.metafields.judgeme.store_summary_widget_data` through Storefront GraphQL. If Shopify returns `null`, the server-only `fetchAiReviewsSummaryMetafield` helper retries that one public-display metafield through Admin GraphQL. The browser receives only the metafield string, never the Admin token. AI Reviews Summary adds no Judge.me data request; Trust Badge and the summary fallback can each add one Shopify Admin read.

Review Snippets is placed directly below the AI summary in the vertical widget stack. Its loader call uses the public v2 snippet endpoint; a narrowly scoped preload bridge gives the exact current Judge.me module that response when it initializes, so the browser does not repeat the request. The current Free-plan fixture returns five product reviews even though Judge.me officially presents the theme block as an Awesome-plan widget.

Judge.me only creates the store-summary metafield for an enabled AI Reviews Summary. The harness does not synthesize summary or Q&A content: a missing summary remains unmounted, and a disabled Q&A setting skips both its read and component. Theme-editor sample data is not treated as production storefront data.

`JUDGEME_STOREFRONT_URL` points to a public Online Store page where the Judge.me app embed is enabled. The server inspects that page, validates candidate extension manifests, and automatically supplies the current deployment to React. `JUDGEME_V3_ASSET_BASE_URL` is now an optional last-known-good fallback for password-protected, rate-limited, or temporarily unavailable theme pages; it should still be refreshed by a compatibility job after Judge.me deployments.

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
