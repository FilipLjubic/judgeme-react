# Research in ctx

`ctx` is the research index and query layer for this project. Markdown under this directory remains human-readable and versionable; ctx snapshots make the reports and their supporting sources searchable by agents.

## Current resources

| Label                                            | Kind  | Purpose                                                                                                              |
| ------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `judgeme-runtime-research-2026-07-13`            | notes | First-party Brave inspection and Hydrogen feasibility report                                                         |
| `judgeme-widget-coverage-workarounds-2026-07-13` | notes | Current unsupported-widget matrix, official package autopsy, API/token findings, and all-widget compatibility design |
| `hydrogen-harness-2026-07-13`                    | notes | Headless channel credential contract, monorepo/package boundary, and verified Hydrogen harness                       |
| `review-widget-spike-2026-07-13`                 | notes | Working free-plan Review Widget bootstrap, SSR/runtime contract, browser validation, and remaining limitations       |
| `judge-me-platform-independent`                  | docs  | Official external-storefront installation path and limits                                                            |
| `judge-me-widget-catalog`                        | docs  | Current official widget inventory and Shopify surface support                                                        |
| `judge-me-api`                                   | docs  | Current public/private token guidance and API limitations                                                            |
| `judge-me-integration-guide`                     | docs  | Official distinction between the Free-plan Widget API and Awesome-only cache server                                  |
| `judge-me-hydrogen-npm-metadata`                 | docs  | Registry metadata for Judge.me's official Hydrogen package                                                           |
| `judge-me-liquid-widgets`                        | docs  | Official Liquid markup and Judge.me metafield dependencies                                                           |
| `shopify-theme-app-extensions`                   | docs  | Official Shopify app-block, app-embed, Liquid-scope, and CDN model                                                   |
| `shopify-hydrogen-getting-started`               | docs  | Current Shopify Hydrogen scaffold, link, and environment workflow                                                    |
| `shopify-hydrogen-environments`                  | docs  | Official Hydrogen environment variable and token handling contract                                                   |
| `shopify-hydrogen-cli`                           | docs  | Current Shopify CLI commands, flags, and lockfile checks                                                              |

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
