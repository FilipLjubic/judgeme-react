# judgeme-react

An unofficial, reverse-engineered React bridge for Judge.me's Shopify widgets.

```sh
bun add judgeme-react
```

Judge.me's storefront experience is more than a reviews API. Liquid themes receive app-embed markup, dashboard settings, generated CSS, Shopify app-block configuration, CDN data, and mutable browser runtimes. Headless storefronts receive none of that automatically.

This project reconstructs those pieces for React. It combines public Judge.me Widget API reads, tokenless CDN endpoints, public Shopify data and metafields, and the store's current Judge.me extension assets. The result behaves much more like the widgets configured in Shopify and Judge.me than a generic reviews UI.

> [!WARNING]
> This is a compatibility hack, not an official Judge.me SDK. It is not affiliated with or endorsed by Judge.me. Undocumented endpoints and deployed extension modules can change, so pin versions and verify upgrades against a real store.

## Why use it?

Judge.me's [official Hydrogen package](https://www.npmjs.com/package/@judgeme/shopify-hydrogen) is client-only, exposes a smaller set of older widgets, and does not reproduce the current Shopify app-block runtime. This library takes on that messy runtime work so a headless storefront can keep more of the merchant's existing setup.

| What you want | What this project does |
| --- | --- |
| Judge.me dashboard styling | Reuses public colors, labels, branding, locale strings, feature flags, and legacy CSS |
| Current Shopify widgets | Loads the store's deployed Judge.me extension modules for v3 widgets |
| Faster initial content | Fetches and validates initial data on the server, then progressively enables browser interactions |
| React configuration | Provides typed config for theme-block settings that Shopify does not expose to headless apps |
| A page that survives third-party failures | Keeps every optional widget nullable and independently recoverable |

Theme-editor block settings are the one hard boundary: they belong to a specific Liquid block instance and do not appear in Judge.me's public settings response. Their React equivalents are typed component props.

## Start here

The recommended onboarding path is agent-assisted:

1. Open the [copy-paste setup prompt](packages/judgeme-react/SETUP_PROMPT.md).
2. Paste it into Codex or another coding agent from inside your storefront repository.
3. Answer its questions about the store, desired widgets, loading strategy, and feature activation.
4. Let it compare your app with the complete [Hydrogen reference implementation](examples/hydrogen) and verify the result.

The prompt includes token instructions, CSP, provider setup, server/client boundaries, automatic extension-asset discovery, per-widget fallbacks, testing, and a clean Brave verification pass.

If you are integrating by hand, read the [npm package guide](packages/judgeme-react/README.md). It includes a minimal loader/component example, the complete widget table, merchant activation requirements, loading options, and known limits.

## Widget gallery

The [npm package README](packages/judgeme-react/README.md#component-gallery) embeds all 20 components with a short explanation and one tightly cropped screenshot each. The [standalone gallery](docs/WIDGET_GALLERY.md) provides the same catalog on a lighter page and separates live fixture output from the visibly labeled Q&A preview and UGC documentation fixture.

[![Cards Carousel rendered by judgeme-react](docs/images/widgets/cards-carousel.jpeg)](docs/WIDGET_GALLERY.md#cards-carousel)

The live [Hydrogen example](examples/hydrogen) mounts every implemented component for which the store has eligible data. Empty production UGC, Q&A, summaries, badges, and media stay empty instead of being replaced with fake customer content.

## What is implemented?

| Group | Components |
| --- | --- |
| Product reviews | `StarRatingBadge`, `ReviewWidgetV3`, `LegacyReviewWidget`, `QuestionsAndAnswers` |
| Store and aggregate reviews | `HappyCustomers`, `AllReviewsWidget`, `AllReviewsCounter`, `VerifiedReviewsCounter` |
| Carousels and media | `CardsCarousel`, `TestimonialsCarousel`, `VideosCarousel`, `ReviewsCarousel`, `ReviewSnippets`, `ReviewsGrid`, `UgcMediaGrid` |
| Trust and summaries | `TrustBadge`, `JudgeMeMedals`, `AiReviewsSummary` |
| Global overlays | `FloatingReviewsTab`, `PopupReviews` |

Every entry in the public widget catalog has a data adapter, typed component, tests, and a Hydrogen integration. Live fixture coverage is tracked separately because the current store does not have published video reviews, published Q&A, or UGC posts.

## Repository map

| Path | Purpose |
| --- | --- |
| [`packages/judgeme-react`](packages/judgeme-react) | Framework-neutral ESM npm package with `react` and `server` entry points |
| [`examples/hydrogen`](examples/hydrogen) | Copyable storefront with tokens, CSP, provider, loaders, every widget, and browser verification guidance |
| [`docs/research`](docs/research) | Dated reverse-engineering reports indexed by ctx |
| [`docs/PUBLISHING.md`](docs/PUBLISHING.md) | Release and npm publishing checklist |

## Work on the repository

The monorepo uses Bun 1.3.14 and `bun.lock` as its only lockfile.

```sh
bun install
bun run dev
```

Run the complete release gate before publishing:

```sh
bun run release:check
```

That runs the library tests, workspace lint/type checks, Hydrogen production build, package dry-run, and package metadata validation.

## How this was researched

The implementation was built by comparing Judge.me's public documentation with real Shopify theme output, network traffic, CDN bundles, metafields, and browser behavior. The detailed reports live in [`docs/research`](docs/research) and are linked into the repository's local ctx index.

Useful entry points:

- [Shopify runtime and Hydrogen feasibility](docs/research/judgeme-shopify-runtime-2026-07-13.md)
- [Widget coverage and workaround matrix](docs/research/judgeme-widget-coverage-and-workarounds-2026-07-13.md)
- [Widget activation and limitations](docs/research/widget-activation-and-limitations-2026-07-14.md)
- [Hardening and fixture coverage](docs/research/hardening-baseline-2026-07-14.md)

## License and trademark

MIT © 2026 Filip Ljubic. See [LICENSE](LICENSE).

Judge.me and its related marks belong to their respective owner. This repository is an independent compatibility project.
