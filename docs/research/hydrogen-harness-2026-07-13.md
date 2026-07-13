# Hydrogen integration harness

Date: 2026-07-13
Store: `vanilla-slop.myshopify.com`
Headless storefront: `Vanilla Slop Headless` (storefront ID `303489`)

## Outcome

The repository now contains a production-buildable Hydrogen integration harness without coupling the future npm package to Hydrogen:

- `packages/judgeme-react` is the framework-neutral React package.
- `examples/hydrogen` is the Shopify integration and browser compatibility harness.
- The root Bun workspace provides one lockfile and repeatable test, typecheck, lint, and build commands.

The harness was generated from Shopify's current TypeScript starter on 2026-07-13. It uses Hydrogen `2026.4.3`, React Router `7.16.0`, React `18.3`, and Vite `8`.

Both the root and example `dev` scripts pin the local storefront to `http://localhost:3001`. Port 3000 is reserved for another local project.

## Package manager

The repository uses Bun 1.3.14 for dependency installation, workspace scripts, and local CLI execution. `bun.lock` is the only dependency lockfile. Node remains in the engine contract because Hydrogen and the package test suite still target Node-compatible runtimes.

## Headless channel connection

The Shopify Headless sales channel already contains a storefront named `Vanilla Slop Headless`. Its Storefront API page exposes:

- a public Storefront API token for browser-safe queries;
- a private Storefront API token for server-only queries;
- Storefront API permission controls shared across Headless channel storefronts.

The Hydrogen app reads the standard environment contract:

```text
PUBLIC_STORE_DOMAIN
PUBLIC_CHECKOUT_DOMAIN
PUBLIC_STOREFRONT_ID
PUBLIC_STOREFRONT_API_TOKEN
PRIVATE_STOREFRONT_API_TOKEN
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID
PUBLIC_CUSTOMER_ACCOUNT_API_URL
SESSION_SECRET
```

Because this storefront comes from the Headless channel rather than the Hydrogen channel, credentials are configured manually in the ignored local `.env`. Shopify's current Hydrogen/Oxygen flow can alternatively populate the same core variables through `shopify hydrogen env pull` after linking a Hydrogen-channel storefront.

## Judge.me environment contract

The integration adds three Judge.me variables:

```text
JUDGEME_SHOP_DOMAIN
JUDGEME_PUBLIC_TOKEN
JUDGEME_PRIVATE_TOKEN
```

Only `JUDGEME_SHOP_DOMAIN` and `JUDGEME_PUBLIC_TOKEN` may be returned from a Hydrogen loader and passed to `JudgeMeProvider`. `JUDGEME_PRIVATE_TOKEN` is declared only for future server adapters and must never be serialized into React data, HTML, browser JavaScript, or logs.

Local secrets live in `examples/hydrogen/.env`, which Git ignores. `examples/hydrogen/.env.example` documents names without values.

Credential checks established the intended API split:

- both Shopify Storefront tokens successfully queried the store, using their respective public and private headers;
- the Judge.me public token returned the documented product widget payload;
- the Judge.me private token returned the private reviews endpoint;
- the public Judge.me token received `403` from the private reviews endpoint, which is expected and should not be treated as an invalid token.

## Package boundary

The first package code establishes interfaces rather than hard-wiring one Judge.me implementation:

- `JudgeMeProvider` exposes a context shaped as `state`, `actions`, and `meta`.
- Runtime adapters implement `exact`, `legacy`, or `native` and declare widget support.
- `auto` resolves in the deliberate order `exact -> legacy -> native`.
- An explicitly selected engine never silently falls through to another engine.
- The widget type enumerates the full target storefront surface established in the coverage report.
- Shopify GraphQL global IDs are normalized to numeric IDs for Judge.me request contracts.

The package is private at version `0.0.0` during contract research, preventing accidental publication.

## Verification

The following checks passed on 2026-07-13:

```text
bun run test
bun run typecheck
bun run lint
bun run build
```

The production build includes both client and Oxygen-compatible server bundles. Shopify CLI warns that it cannot find a lockfile inside `examples/hydrogen`; the repository intentionally has one workspace lockfile at the root. Deployment packaging should be validated before the first Oxygen deployment, or the check should be disabled only after confirming the deployment installs from the workspace root.

A live MiniOxygen smoke test with the real credentials returned `200` for `/` and `/collections/all`. The rendered HTML contained the intentionally public Judge.me configuration and contained neither private token. `/account/login` correctly reported that local Customer Account OAuth requires `shopify hydrogen dev --customer-account-push` and a `*.tryhydrogen.dev` tunnel.

The installed Shopify CLI accepts `hydrogen dev --port <value>`. A local startup check on 2026-07-13 confirmed that the repository's `bun run dev` command binds MiniOxygen to port 3001.

The Headless Storefront API currently returns zero products even though the Online Store has the Wall Art Poster product. Products still need to be published to the Headless sales channel before product routes and product-specific widgets can be exercised through Hydrogen. Changing sales-channel availability is Shopify state and should be done deliberately, not hidden inside project initialization.

The generated toolchain currently reports transitive npm advisories in development/build dependencies. No breaking `npm audit fix --force` was applied. These should be reassessed when Shopify updates the pinned CLI, MiniOxygen, and GraphQL Code Generator dependencies.

## Sources

- [Getting started with Hydrogen and Oxygen](https://shopify.dev/docs/storefronts/headless/hydrogen/getting-started)
- [Hydrogen environment variables](https://shopify.dev/docs/storefronts/headless/hydrogen/environments)
- [Hydrogen API reference](https://shopify.dev/docs/api/hydrogen/latest)
- [Shopify CLI Hydrogen commands](https://shopify.dev/docs/api/shopify-cli/hydrogen)
