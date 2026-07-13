# Judge.me React Hydrogen harness

This is the real-store integration harness for `@judgeme-react/core`. It mounts the implemented `StarRatingBadge`, `ReviewsCarousel`, `LegacyReviewWidget`, `AllReviewsWidget`, and `FloatingReviewsTab` on product routes. It is not a second publishable package.

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
```

`JUDGEME_PRIVATE_TOKEN` is reserved for future server-only adapters. The current product widgets do not use it, and it must never be sent through route data or React context.

Open a published product at `/products/<handle>`. The route fetches the product badge, classic carousel, legacy Review Widget, All Reviews Widget, and Floating Reviews Tab before returning loader data. It server-renders all five with one shared settings/CSS payload, then initializes Judge.me's CDN runtime after hydration. On a Free-plan store, the All Reviews response is reused for the floating tab when Judge.me returns no official tab markup.

## CSP

The tested host policy is in `app/entry.server.tsx`. When changing it:

- preserve `'self'` when supplying a custom Hydrogen `scriptSrc`;
- allow Judge.me's CDN, API, media, and frame hosts;
- use `workerSrc: ["'self'", 'blob:']` for Vite's local blob worker instead of adding `blob:` to `scriptSrc`.

## Verification

```sh
bun run test
bun run lint
bun run typecheck
bun run build
```

Compilation checks do not prove the third-party widget is healthy. Runtime changes also require a clean Brave reload of a product with representative reviews and a relevant interaction check, such as moving the carousel, opening the write-review modal, changing the All Reviews stream, or changing the floating tab's review stream.

This app started from Shopify's Hydrogen Skeleton template. Refer to the [Hydrogen documentation](https://shopify.dev/docs/storefronts/headless/hydrogen) for storefront and Customer Account API setup.
