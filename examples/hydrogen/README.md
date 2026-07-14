# `judgeme-react` Hydrogen example

This is the reference storefront for integrating the package into a real Shopify Hydrogen app. It is intentionally private and is not a second npm package. Its `judgeme-react` dependency is pinned to the same exact alpha version as the workspace library, so the directory can also be copied into a standalone repository after that version is published.

The app demonstrates every implemented storefront component, but the most reusable integration points are small:

| File | What to copy or compare |
| --- | --- |
| `app/lib/judgeme.server.ts` | Server-only v3 asset discovery with a safe legacy fallback |
| `app/root.tsx` | One `JudgeMeProvider` around the storefront |
| `app/routes/products.$handle.tsx` | Shared data fetches, nullable widget composition, and the vertical widget stack |
| `app/entry.server.tsx` | The complete tested Hydrogen CSP allowlist |
| `.env.example` | Public configuration and optional server-only Shopify Admin variables |

Server code imports from `judgeme-react/server`. Components import from `judgeme-react/react`. The all-in-one package root still works, but the split imports make the credential and rendering boundaries obvious and are compatible with React Server Component tooling.

## Prerequisites

- Bun 1.3.14
- a Shopify store published to the Headless channel
- a permanent `*.myshopify.com` domain and Storefront API values
- Judge.me installed, with the Judge.me app embed enabled on the published Online Store theme
- a Judge.me public Widget API token
- at least one published product URL on that Online Store theme for v3 asset discovery

The Judge.me private token is not used by this package. Do not add it to the app.

## Get the credentials

### Judge.me public token

In Judge.me Admin, go to **Settings > Integrations**, click **View API tokens**, and copy the **Public API Token** plus the permanent `*.myshopify.com` domain. Put them in `JUDGEME_PUBLIC_TOKEN` and `JUDGEME_SHOP_DOMAIN` respectively. The public token is intended for public Widget API GET requests and does not require the Awesome plan. Never copy the private token into this app. See Judge.me's [API credential guide](https://judge.me/help/en/articles/8409180-using-judge-me-api).

### Shopify Headless storefront credentials

If the store does not already have a Headless storefront:

1. Install or open Shopify's **Headless** sales channel.
2. In Shopify Admin, go to **Sales channels > Headless**.
3. Click **Add storefront**, or open the existing storefront you want this app to use.
4. Under **Manage API access**, open **Storefront API** and copy the public access token. Generate the private token when server-side Storefront API access is required.
5. Open **Customer Account API** under the same API-access area and copy the client ID and API URL if the storefront uses customer accounts.
6. Review the shared Storefront API permissions and publish the products this app should display to the Headless sales channel.

Map the storefront detail values to the example environment:

| Environment variable | Headless value | Exposure |
| --- | --- | --- |
| `PUBLIC_STORE_DOMAIN` | Permanent `store.myshopify.com` domain | Public |
| `PUBLIC_CHECKOUT_DOMAIN` | Checkout/store domain configured for the storefront | Public |
| `PUBLIC_STOREFRONT_ID` | Numeric storefront ID shown for the Headless storefront | Public |
| `PUBLIC_STOREFRONT_API_TOKEN` | Storefront API public access token | Public |
| `PRIVATE_STOREFRONT_API_TOKEN` | Storefront API private access token | Server-only secret |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | Customer Account API client ID | Public |
| `PUBLIC_CUSTOMER_ACCOUNT_API_URL` | Customer Account API URL | Public |
| `SESSION_SECRET` | A new high-entropy secret generated for this Hydrogen app | Server-only secret |

Shopify documents the current channel flow in [Bring your own headless stack](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/index) and [Manage the Headless channel](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/manage-headless-channels). Public Storefront tokens are for browser-safe storefront reads; private Storefront tokens and `SESSION_SECRET` must never be exposed to client code or committed.

If this storefront is linked to a Shopify Hydrogen channel instead, `shopify hydrogen env pull` can populate its managed environment. The manual Headless values above remain useful for this standalone reference app.

### Optional Shopify Admin access token

`SHOPIFY_ADMIN_ACCESS_TOKEN` is **not** the Headless private Storefront token. It is an optional server-only GraphQL Admin API credential used only for Trust Badge metafields and the AI Reviews Summary fallback.

- Leave it empty if those widgets work through public/Storefront data or you do not need them.
- For an existing admin-created custom app, use the installed app's Admin API credential.
- Shopify no longer allows creation of new admin-created custom apps. New apps must use the Dev Dashboard or Shopify CLI and Shopify's current token-acquisition flow. Follow the official [Admin API token guide](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin) instead of treating a copied token as permanently valid.
- Grant the minimum read access needed by the app and verify that it can query the required `shop.metafield` keys. Judge.me-owned metafield definitions can impose their own access restrictions, so an authenticated Admin token alone does not guarantee those fields are readable.
- Inject the resulting token only into the server runtime. Never return it from a loader, put it in a `PUBLIC_*` variable, or pass it to `JudgeMeProvider`.

## Run from this monorepo

```sh
bun install
cp examples/hydrogen/.env.example examples/hydrogen/.env
bun run dev
```

The storefront runs at `http://localhost:3001`; port 3000 stays free for other projects.

## Run as a standalone example

After `judgeme-react@0.1.0-alpha.0` is published, copy `examples/hydrogen` into its own repository, then run:

```sh
bun install
cp .env.example .env
bun run dev
```

There are no `workspace:` imports or paths in the example. Before the npm release, its exact dependency is satisfied by the local Bun workspace.

## Environment

Fill the Shopify Headless variables generated by the Headless channel, then add:

```dotenv
JUDGEME_SHOP_DOMAIN=store.myshopify.com
JUDGEME_PUBLIC_TOKEN=your-public-widget-api-token
JUDGEME_STOREFRONT_URL=https://store.myshopify.com/products/published-product
JUDGEME_V3_ASSET_BASE_URL=
SHOPIFY_ADMIN_ACCESS_TOKEN=
SHOPIFY_ADMIN_API_VERSION=2026-04
```

`JUDGEME_STOREFRONT_URL` is the primary v3 discovery input. It must be a public HTTPS page where the Judge.me app embed is enabled. `JUDGEME_V3_ASSET_BASE_URL` is only an optional last-known-good fallback for password-protected, rate-limited, or unavailable theme pages; most users can leave it empty.

`SHOPIFY_ADMIN_ACCESS_TOKEN` is optional and server-only. The browser receives only validated public display data, never this credential.

## How the product route works

The product route first fetches `fetchLegacyStorefrontWidgets`, which shares one Judge.me settings/CSS payload across the legacy widgets and isolates each nullable endpoint. Exact/native widgets then fetch only their page-specific data and combine it with those shared resources. A malformed or disabled optional widget becomes `null`; it does not reject the entire page.

`JudgeMeWidgetStyles` mounts the shared dashboard CSS once. All legacy components consuming that shared payload use `includeStyles={false}`. This is important because the stylesheet includes the `JudgemeStar` font also used by the v3 Review Widget.

Normal content widgets live one below another in `.product-widgets`. `FloatingReviewsTab` and `PopupReviews` remain outside that stack because they are global overlays. Product information is not sticky.

The Review Widget prefers a valid v3 payload and falls back to `LegacyReviewWidget`. Q&A is requested only when the dashboard setting enables it. AI summary content comes only from Judge.me's generated metafield. Trust Badge, verified counts, UGC, medals, questions, and media widgets stay unmounted when the store has no eligible live data.

## CSP

The host application owns CSP. The tested policy is in `app/entry.server.tsx` and intentionally:

- preserves `'self'` in `scriptSrc`;
- uses `workerSrc: ["'self'", "blob:"]` for local Vite without adding `blob:` to `scriptSrc`;
- allows `cdn.shopify.com` in script, style, connect, font, and image directives;
- allows Judge.me API/CDN/media origins, both Judge.me imgix hosts, the classic S3 badge host, and required Vimeo/YouTube media/frame origins.

Merge those sources into an existing policy; do not replace unrelated checkout, analytics, or storefront sources.

## Verification

From the monorepo root:

```sh
bun run test
bun run lint
bun run typecheck
bun run build
```

From a standalone example repository:

```sh
bun run lint
bun run typecheck
bun run build
```

Compilation cannot prove a mutable third-party deployment is healthy. Perform a clean Brave reload of a published product and exercise at least one relevant interaction, such as opening Write a review, moving a carousel, switching an All Reviews stream, or opening a media lightbox.

For a smaller first integration, use the copy-paste prompt shipped as `SETUP_PROMPT.md` in `judgeme-react`. This app started from Shopify's Hydrogen Skeleton; refer to the [Hydrogen documentation](https://shopify.dev/docs/storefronts/headless/hydrogen) for the base storefront and Customer Account setup.
