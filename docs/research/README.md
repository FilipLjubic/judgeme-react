# Research in ctx

`ctx` is the research index and query layer for this project. Markdown under this directory remains human-readable and versionable; ctx snapshots make the reports and their supporting sources searchable by agents.

## Current resources

| Label                                            | Kind  | Purpose                                                                                                              |
| ------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `judgeme-runtime-research-2026-07-13`            | notes | First-party Brave inspection and Hydrogen feasibility report                                                         |
| `judgeme-widget-coverage-workarounds-2026-07-13` | notes | Current unsupported-widget matrix, official package autopsy, API/token findings, and all-widget compatibility design |
| `hydrogen-harness-2026-07-13`                    | notes | Headless channel credential contract, monorepo/package boundary, and verified Hydrogen harness                       |
| `review-widget-spike-2026-07-13`                 | notes | Working free-plan Review Widget bootstrap, SSR/runtime contract, browser validation, and remaining limitations       |
| `star-rating-badge-spike-2026-07-13`             | notes | Working product badge endpoint, shared-resource batching, runtime contract, and Brave validation                     |
| `reviews-carousel-spike-2026-07-13`              | notes | Working classic carousel endpoint, secondary runtime, shared batching, navigation, and Brave validation              |
| `floating-reviews-tab-spike-2026-07-13`          | notes | Official tab contract, Free-plan All Reviews fallback, interactions, and SPA validation                              |
| `all-reviews-widget-spike-2026-07-13`            | notes | Standalone All Reviews endpoint/runtime contract, paging mismatch, interactions, and SPA validation                  |
| `all-reviews-counter-spike-2026-07-13`           | notes | Public aggregate endpoints, Liquid/settings contract, seven-request batching, Brave comparison, and verified limit   |
| `reviews-grid-spike-2026-07-13`                  | notes | Tokenless v3 grid data, extension manifest/module contract, CSP, batching, lightbox, and SPA validation              |
| `cards-carousel-spike-2026-07-13`                | notes | Tokenless Cards data, hybrid extension runtime, filters, cart workaround, lightbox, and SPA validation               |
| `testimonials-carousel-spike-2026-07-13`         | notes | Tokenless quote-carousel data, full block configuration, autoplay, lightbox, and SPA lifecycle                       |
| `judge-me-platform-independent`                  | docs  | Official external-storefront installation path and limits                                                            |
| `judge-me-widget-catalog`                        | docs  | Current official widget inventory and Shopify surface support                                                        |
| `judge-me-api`                                   | docs  | Current public/private token guidance and API limitations                                                            |
| `judge-me-integration-guide`                     | docs  | Official distinction between the Free-plan Widget API and Awesome-only cache server                                  |
| `judge-me-floating-reviews-tab`                  | docs  | Official Floating Reviews Tab plan, behavior, position, settings, and empty-state contract                           |
| `judge-me-cards-carousel`                        | docs  | Official Cards Carousel plan, settings, selection, layout, and app-embed contract                                    |
| `judge-me-testimonials-carousel`                 | docs  | Official Testimonials Carousel plan, settings, limitations, and app-embed contract                                   |
| `judge-me-hydrogen-npm-metadata`                 | docs  | Registry metadata for Judge.me's official Hydrogen package                                                           |
| `judge-me-liquid-widgets`                        | docs  | Official Liquid markup and Judge.me metafield dependencies                                                           |
| `shopify-theme-app-extensions`                   | docs  | Official Shopify app-block, app-embed, Liquid-scope, and CDN model                                                   |
| `shopify-hydrogen-getting-started`               | docs  | Current Shopify Hydrogen scaffold, link, and environment workflow                                                    |
| `shopify-hydrogen-environments`                  | docs  | Official Hydrogen environment variable and token handling contract                                                   |
| `shopify-hydrogen-cli`                           | docs  | Current Shopify CLI commands, flags, and lockfile checks                                                             |

Inspect the current project research set:

```sh
ctx show --cwd /Users/panda/Code/judgeme-react
ctx list --project --cwd /Users/panda/Code/judgeme-react
```

Query the first research report directly:

```sh
ctx query \
  "Why can Judge.me v3 not simply be moved into Hydrogen?" \
  --label judgeme-runtime-research-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the coverage and workaround report:

```sh
ctx query \
  "Which current Judge.me widgets are unsupported in Hydrogen and how can each be implemented?" \
  --label judgeme-widget-coverage-workarounds-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the first working component report:

```sh
ctx query \
  "How does the free-plan Review Widget component fetch, render, and initialize Judge.me?" \
  --label review-widget-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the Star Rating Badge report:

```sh
ctx query \
  "How does the Star Rating Badge fetch, initialize, share settings, and scroll to reviews?" \
  --label star-rating-badge-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the classic Reviews Carousel report:

```sh
ctx query \
  "How does the classic Reviews Carousel fetch, initialize, and share resources?" \
  --label reviews-carousel-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the Floating Reviews Tab report:

```sh
ctx query \
  "How does the Floating Reviews Tab use the exact endpoint and Free-plan fallback?" \
  --label floating-reviews-tab-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the All Reviews Widget report:

```sh
ctx query \
  "How does the standalone All Reviews Widget use Judge.me's public endpoint and CDN runtime?" \
  --label all-reviews-widget-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the All Reviews Counter report:

```sh
ctx query \
  "How does the All Reviews Counter use public aggregates and dashboard styling without adding a batched request?" \
  --label all-reviews-counter-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the Reviews Grid report:

```sh
ctx query \
  "How does Reviews Grid use tokenless data and the current Shopify extension deployment?" \
  --label reviews-grid-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the Cards Carousel report:

```sh
ctx query \
  "How does Cards Carousel fetch reviews and initialize in Hydrogen?" \
  --label cards-carousel-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

Query the Testimonials Carousel report:

```sh
ctx query \
  "How does Testimonials Carousel fetch, configure, and initialize in Hydrogen?" \
  --label testimonials-carousel-spike-2026-07-13 \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

## Adding a research report

1. Write a dated Markdown report in `docs/research/`.
2. Add it to the global ctx cache as `notes` by using its absolute `file://` URL.
3. Link the resource to this project.
4. Sync and run a label-scoped test query.

```sh
ctx add file:///absolute/path/to/report.md \
  --label stable-report-label \
  --reason "What this research establishes" \
  --cwd /Users/panda/Code/judgeme-react

ctx link stable-report-label --cwd /Users/panda/Code/judgeme-react
ctx sync --cwd /Users/panda/Code/judgeme-react
ctx query "A question the report should answer" \
  --label stable-report-label \
  --kind notes \
  --cwd /Users/panda/Code/judgeme-react
```

## Refreshing edited research

Ctx stores snapshots. After changing a linked local report, refresh and re-index it:

```sh
ctx update stable-report-label --force --cwd /Users/panda/Code/judgeme-react
ctx sync --reindex --cwd /Users/panda/Code/judgeme-react
```

Use `ctx remember` for durable preferences, decisions, warnings, and small reusable lessons. Use linked `notes` for research reports and linked `docs` for external evidence.
