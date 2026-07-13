# @judgeme-react/core

Private, pre-release package containing the React-facing contracts for the Judge.me compatibility project.

The package is intentionally framework-neutral. Hydrogen is a consumer under `examples/hydrogen`, not a dependency of this package.

## Current API boundary

- `JudgeMeProvider` exposes public store configuration and injected runtime adapters.
- `resolveJudgeMeEngine` implements the explicit `exact`, `legacy`, and `native` runtime policy.
- `JUDGE_ME_WIDGETS` names the storefront widget surface we intend to support.
- `getShopifyNumericId` converts Storefront API GraphQL IDs for Judge.me calls.

Private Judge.me credentials do not belong in this React package. Server integrations may consume a private token, but must never serialize it through a loader or provider.
