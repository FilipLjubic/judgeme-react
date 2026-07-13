# Judge.me React

Research-stage project for exposing Judge.me widgets through React, with Shopify Hydrogen as the first integration target.

The repository is an npm workspace:

- `packages/judgeme-react` contains the framework-neutral, future npm package.
- `examples/hydrogen` is a real Hydrogen storefront used as the integration and compatibility harness.
- `docs/research` and ctx remain the source of truth for reverse-engineering and implementation decisions.

- [Shopify runtime and Hydrogen feasibility research](docs/research/judgeme-shopify-runtime-2026-07-13.md), queryable in ctx as `judgeme-runtime-research-2026-07-13`.
- [Widget coverage and all-widget workaround research](docs/research/judgeme-widget-coverage-and-workarounds-2026-07-13.md), queryable in ctx as `judgeme-widget-coverage-workarounds-2026-07-13`.
- [Hydrogen integration harness](docs/research/hydrogen-harness-2026-07-13.md), queryable in ctx as `hydrogen-harness-2026-07-13`.
- [Research workflow and resource index](docs/research/README.md)
- Project documentation sources are pinned in `.ctx/ctx.json`.
- `ctx` Codex hooks are installed under `.ctx/hooks` and pass `ctx hook doctor`.
