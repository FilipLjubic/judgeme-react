# Judge.me React Hydrogen harness

This is the real-store integration harness for `@judgeme-react/core`. It currently mounts the implemented `LegacyReviewWidget` on product routes and is not a second publishable package.

## Local setup

From the repository root:

```sh
npm install
cp examples/hydrogen/.env.example examples/hydrogen/.env
npm run dev
```

Populate `.env` with the Shopify Headless channel values and these Judge.me values:

```dotenv
JUDGEME_SHOP_DOMAIN=store.myshopify.com
JUDGEME_PUBLIC_TOKEN=your-public-widget-api-token
```

`JUDGEME_PRIVATE_TOKEN` is reserved for future server-only adapters. The current Review Widget does not use it, and it must never be sent through route data or React context.

Open a published product at `/products/<handle>`. The route fetches Judge.me's legacy Review Widget payload before returning loader data, server-renders it, and initializes Judge.me's CDN runtime after hydration.

## CSP

The tested host policy is in `app/entry.server.tsx`. When changing it:

- preserve `'self'` when supplying a custom Hydrogen `scriptSrc`;
- allow Judge.me's CDN, API, media, and frame hosts;
- use `workerSrc: ["'self'", 'blob:']` for Vite's local blob worker instead of adding `blob:` to `scriptSrc`.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Compilation checks do not prove the third-party widget is healthy. Runtime changes also require a clean Brave reload of a product with representative reviews and an interaction check such as opening the write-review modal.

This app started from Shopify's Hydrogen Skeleton template. Refer to the [Hydrogen documentation](https://shopify.dev/docs/storefronts/headless/hydrogen) for storefront and Customer Account API setup.
