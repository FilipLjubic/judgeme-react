# Judge.me React

Research-stage project for exposing Judge.me widgets through React, with Shopify Hydrogen as the first integration target.

## Current status

The first four components are `StarRatingBadge`, `ReviewsCarousel`, `LegacyReviewWidget`, and `FloatingReviewsTab`. They share Judge.me's dashboard CSS/settings and use its browser runtime. The Hydrogen harness has exercised them with real review data, including carousel navigation, the write-review modal, and the floating tab's product/store review streams.

`FloatingReviewsTab` has two modes. Stores with the official tab enabled receive Judge.me's `reviews_tab` markup unchanged. On the current Free-plan test store that endpoint returns `null`, so the component builds the same floating shell around the public `all_reviews_page` payload. The fallback supports open/close, product and shop subtabs, load-more pagination, rating filters, sorting, and client-side navigation.

The other widget names in `JUDGE_ME_WIDGETS` describe the intended coverage target, not current support. Exact Shopify v3 Review Widget parity and the newer Cards, Testimonials, and Videos carousels remain future work.

The repository is a Bun workspace:

- `packages/judgeme-react` contains the framework-neutral, future npm package.
- `examples/hydrogen` is a real Hydrogen storefront used as the integration and compatibility harness.
- `docs/research` and ctx remain the source of truth for reverse-engineering and implementation decisions.

Install and start the Hydrogen harness from the repository root:

```sh
bun install
bun run dev
```

The workspace pins Bun 1.3.14 and uses `bun.lock` as its only dependency lockfile. The development server runs at `http://localhost:3001`.

- [Shopify runtime and Hydrogen feasibility research](docs/research/judgeme-shopify-runtime-2026-07-13.md), queryable in ctx as `judgeme-runtime-research-2026-07-13`.
- [Widget coverage and all-widget workaround research](docs/research/judgeme-widget-coverage-and-workarounds-2026-07-13.md), queryable in ctx as `judgeme-widget-coverage-workarounds-2026-07-13`.
- [Hydrogen integration harness](docs/research/hydrogen-harness-2026-07-13.md), queryable in ctx as `hydrogen-harness-2026-07-13`.
- [Working Review Widget spike](docs/research/review-widget-spike-2026-07-13.md), queryable in ctx as `review-widget-spike-2026-07-13`.
- [Working Star Rating Badge spike](docs/research/star-rating-badge-spike-2026-07-13.md), queryable in ctx as `star-rating-badge-spike-2026-07-13`.
- [Working Reviews Carousel spike](docs/research/reviews-carousel-spike-2026-07-13.md), queryable in ctx as `reviews-carousel-spike-2026-07-13`.
- [Working Floating Reviews Tab spike](docs/research/floating-reviews-tab-spike-2026-07-13.md), queryable in ctx as `floating-reviews-tab-spike-2026-07-13`.
- [Research workflow and resource index](docs/research/README.md)
- Project documentation sources are pinned in `.ctx/ctx.json`.
- `ctx` Codex hooks are installed under `.ctx/hooks` and pass `ctx hook doctor`.
