# Judge.me React

Research-stage project for exposing Judge.me widgets through React, with Shopify Hydrogen as the first integration target.

## Current status

The first seventeen components are `StarRatingBadge`, `VerifiedReviewsCounter`, `JudgeMeMedals`, `UgcMediaGrid`, `AllReviewsCounter`, `ReviewsCarousel`, `LegacyReviewWidget`, `AllReviewsWidget`, `FloatingReviewsTab`, `ReviewsGrid`, `CardsCarousel`, `TestimonialsCarousel`, `VideosCarousel`, `PopupReviews`, `AiReviewsSummary`, `ReviewSnippets`, and `QuestionsAndAnswers`. The legacy components share Judge.me's dashboard CSS/settings and browser runtime; exact extension adapters combine current public data or Shopify metafields with the store's deployment scripts; native adapters preserve current data/settings behavior where Judge.me has no standalone entry. The Hydrogen harness exercises them with real review data plus clearly labeled AI-summary and Q&A preview fixtures, including carousel/snippet implementations, review/question forms, standalone All Reviews streams, the floating tab, medals, grid pagination, timed popup, AI summary accordion, and media lightboxes.

`ReviewsGrid` uses Judge.me's public tokenless grid-data endpoint and the store's current Shopify extension assets. Because Shopify extension deployment URLs change, the consuming app supplies `v3AssetBaseUrl`; the adapter loads the deployment manifest, CSS, and module while preserving the app-block configuration contract.

`CardsCarousel` mirrors the current Shopify block with one tokenless `reviews_for_carousel` read. It supports the documented selection/filter/layout settings, explicit product IDs as a headless cart-mode workaround, Judge.me's looped navigation and automatic movement, and the current review lightbox. It uses the same host-supplied `v3AssetBaseUrl` as Reviews Grid.

`TestimonialsCarousel` uses the same tokenless carousel endpoint with `carousel_type=testimonials`. Its typed configuration covers the current theme-editor review selection, filters, quote/product/reviewer/card sizing, arrows, colors, borders, shadows, transition, and header controls. React owns the CSP-safe arrow and SPA lifecycle while Judge.me's current builder creates the review cards and lightbox behavior.

`VideosCarousel` uses `carousel_type=videos` plus the required `review_type` filter. It supports videos-only, photo/video, and any-review modes along with the current selection, layout, styling, autoplay, navigation, and header settings. Judge.me's media builder and lightbox remain responsible for review media; the current test store verifies its photo-card mode, while iframe playback awaits a seeded video review.

`PopupReviews` is a native app-embed-style implementation. It reads all current popup choices from the shared dashboard settings and uses one tokenless `reviews_for_carousel` request for recent, picture-first, or manually featured reviews. The component owns page targeting, timing, position, mobile visibility, animation, and cleanup. Review pictures work directly; product-picture mode accepts Storefront API image URLs keyed by product handle.

`AiReviewsSummary` mounts Judge.me's exact current store-summary extension entry. Production text comes from `shop.metafields.judgeme.store_summary_widget_data`; the adapter validates that payload and never fabricates a missing summary. Its typed config covers the current expanded, accordion, and button themes plus all block layout and color attributes. The current Free-plan harness has no generated metafield, so its test content is explicitly labeled as a local fixture.

`ReviewSnippets` mounts Judge.me's current rotating product/cart snippet block with its exact deployment CSS, arrows, autoplay, and review lightbox. Its server adapter reads the current tokenless public endpoint and preloads that response into the otherwise unmodified CDN module, avoiding a duplicate browser request. Judge.me officially lists the Shopify block on the Awesome plan; the public endpoint currently works on the Free-plan fixture, so this adapter is an interoperability workaround rather than a promise that Judge.me will keep that entitlement open.

`QuestionsAndAnswers` makes Judge.me's current Review Widget Q&A tab independently placeable in React. It reads the tokenless question feed, reuses dashboard labels/colors/layout settings, paginates live questions, and posts the real multipart Ask a question form without a token. Judge.me officially gates the Shopify UI to Awesome and the current Free-plan fixture has no published questions, so the harness uses Judge.me's own clearly labeled, read-only sample feed.

`UgcMediaGrid` mounts Judge.me's current Instagram shopping grid. It prefers exact platform-independent cache markup and falls back to the tokenless public social-post feed when that Awesome-gated cache field is absent, while Judge.me's own bundles still render the dashboard title, buttons, lazy media, pagination, product attachments, and gallery. The current store has no published Instagram posts, so the production component correctly returns `null`.

`VerifiedReviewsCounter` renders Judge.me's exact verified-review badge for eligible stores. Its public fetcher returns `null` below Judge.me's 20-verified-review threshold and otherwise preserves the dashboard's branded/classic style, orientation, color, branding, and link. The shared storefront batch adds one `verified_badge` read.

`AllReviewsCounter` renders the store's combined product-and-shop rating/count with the dashboard-selected branded or text treatment. Its standalone fetcher uses the public aggregate endpoints; the full storefront batch derives the same values from the existing All Reviews header, so this component does not add another request to the seven-read exact-cache batch or its eight-read UGC fallback path.

`AllReviewsWidget` is the headless version of Judge.me's platform-independent All Reviews Widget. It server-renders the public `all_reviews_page` response and supports the configured initial tab, product/shop switching, rating filters, sorting, button or scroll pagination, keyboard controls, and client-side navigation. Its browser reads use the public token; the private token is not required.

`FloatingReviewsTab` has two modes. Stores with the official tab enabled receive Judge.me's `reviews_tab` markup unchanged. On the current Free-plan test store that endpoint returns `null`, so the component builds the same floating shell around the public `all_reviews_page` payload. The fallback supports open/close, product and shop subtabs, load-more pagination, rating filters, sorting, and client-side navigation.

The other widget names in `JUDGE_ME_WIDGETS` describe the intended coverage target, not current support. Exact Shopify v3 Review Widget parity and the remaining widgets remain future work.

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
- [Working All Reviews Widget spike](docs/research/all-reviews-widget-spike-2026-07-13.md), queryable in ctx as `all-reviews-widget-spike-2026-07-13`.
- [Working All Reviews Counter spike](docs/research/all-reviews-counter-spike-2026-07-13.md), queryable in ctx as `all-reviews-counter-spike-2026-07-13`.
- [Working Reviews Grid spike](docs/research/reviews-grid-spike-2026-07-13.md), queryable in ctx as `reviews-grid-spike-2026-07-13`.
- [Working Cards Carousel spike](docs/research/cards-carousel-spike-2026-07-13.md), queryable in ctx as `cards-carousel-spike-2026-07-13`.
- [Working Testimonials Carousel spike](docs/research/testimonials-carousel-spike-2026-07-13.md), queryable in ctx as `testimonials-carousel-spike-2026-07-13`.
- [Working Videos Carousel spike](docs/research/videos-carousel-spike-2026-07-13.md), queryable in ctx as `videos-carousel-spike-2026-07-13`.
- [Working Pop-up Reviews spike](docs/research/popup-reviews-spike-2026-07-13.md), queryable in ctx as `popup-reviews-spike-2026-07-13`.
- [Working AI Reviews Summary spike](docs/research/ai-reviews-summary-spike-2026-07-13.md), queryable in ctx as `ai-reviews-summary-spike-2026-07-13`.
- [Working Review Snippets spike](docs/research/review-snippets-spike-2026-07-13.md), queryable in ctx as `review-snippets-spike-2026-07-13`.
- [Working Questions & Answers spike](docs/research/questions-and-answers-spike-2026-07-13.md), queryable in ctx as `questions-and-answers-spike-2026-07-13`.
- [Working Verified Reviews Counter spike](docs/research/verified-reviews-counter-spike-2026-07-13.md), queryable in ctx as `verified-reviews-counter-spike-2026-07-13`.
- [Working Judge.me Medals spike](docs/research/judge-me-medals-spike-2026-07-14.md), queryable in ctx as `judge-me-medals-spike-2026-07-14`.
- [Working UGC Media Grid spike](docs/research/judge-me-ugc-media-grid-spike-2026-07-14.md), queryable in ctx as `judge-me-ugc-media-grid-spike-2026-07-14`.
- [Research workflow and resource index](docs/research/README.md)
- Project documentation sources are pinned in `.ctx/ctx.json`.
- `ctx` Codex hooks are installed under `.ctx/hooks` and pass `ctx hook doctor`.
