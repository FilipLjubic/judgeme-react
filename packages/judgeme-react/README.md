# @judgeme-react/core

Private, pre-release package containing the React-facing contracts for the Judge.me compatibility project.

The package is intentionally framework-neutral. Hydrogen is a consumer under `examples/hydrogen`, not a dependency of this package.

## Support status

| Surface | Status |
| --- | --- |
| Legacy Review Widget | Implemented and tested in the Hydrogen harness |
| New Shopify v3 Review Widget | Not implemented; shared dashboard settings are reused by the legacy adapter, but this is not exact v3 rendering |
| Every other entry in `JUDGE_ME_WIDGETS` | Planned/researched only; there is no public React component yet |

`JUDGE_ME_WIDGETS` is the target catalog used by the runtime-policy types. Its presence does not mean those widgets have implementations.

## Current API boundary

- `JudgeMeProvider` exposes public store configuration and injected runtime adapters.
- `fetchLegacyReviewWidget` fetches Review Widget HTML, dashboard settings, and dashboard CSS from Judge.me's public Widget API.
- `LegacyReviewWidget` server-renders that payload and progressively enables Judge.me's own review form and browser behavior.
- `resolveJudgeMeEngine` implements the explicit `exact`, `legacy`, and `native` runtime policy.
- `JUDGE_ME_WIDGETS` names the storefront widget surface we intend to support.
- `getShopifyNumericId` converts Storefront API GraphQL IDs for Judge.me calls.

Private Judge.me credentials do not belong in this React package. Server integrations may consume a private token, but must never serialize it through a loader or provider.

## First working component

Fetch the public payload in a server loader. Awaiting it before returning the route data keeps the Judge.me-owned DOM outside a streamed Suspense boundary, which prevents its runtime from racing hydration.

```ts
import {
  fetchLegacyReviewWidget,
  getShopifyNumericId,
} from '@judgeme-react/core';

const reviewWidget = await fetchLegacyReviewWidget({
  shopDomain: env.JUDGEME_SHOP_DOMAIN,
  publicToken: env.JUDGEME_PUBLIC_TOKEN,
  productId: getShopifyNumericId(product.id),
  signal: request.signal,
});
```

Render it inside the store-level provider:

```tsx
<JudgeMeProvider
  config={{
    shopDomain: env.JUDGEME_SHOP_DOMAIN,
    publicToken: env.JUDGEME_PUBLIC_TOKEN,
  }}
>
  <LegacyReviewWidget data={reviewWidget} />
</JudgeMeProvider>
```

The host application must allow Judge.me's script, style, API, media, and image hosts in its Content Security Policy. The Hydrogen example in this repository contains the tested CSP configuration. It also preserves `'self'` when overriding `scriptSrc` and permits Vite's local blob worker with `workerSrc: ["'self'", 'blob:']`.

This component intentionally implements Judge.me's public **legacy Review Widget** contract. When a store has the new Review Widget enabled, the fetch helper preserves its dashboard-generated text, colors, and other shared settings but disables the v3-only `review_widget_revamp_enabled` flag for this legacy runtime. It is not yet the exact Shopify v3 widget.

The Widget API response is treated as trusted third-party HTML. The helper rejects script tags, inline event handlers, and `javascript:` URLs before the payload reaches server rendering. Judge.me's runtime is loaded from its CDN after React hydration and is never copied into this package.
