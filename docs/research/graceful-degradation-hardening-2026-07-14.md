# Judge.me graceful-degradation hardening

Date: 2026-07-14

## Problem

The first fault-isolation pass protected optional v3 widgets, but two broad failure boundaries remained:

- `fetchLegacyStorefrontWidgets` rejected its complete result when one legacy endpoint or the shared settings parser failed;
- collection normalizers rejected a complete widget page when one review, question, answer, keyword, or media post was malformed.

That behavior was too brittle for a library built around undocumented third-party responses. Judge.me can deploy one endpoint or response field without changing the rest of the storefront.

## Current behavior

The legacy product and storefront batch APIs now return nullable widget slots. Each endpoint and each derived legacy component is isolated. The healthy path still uses the seven-request storefront batch. Recovery reads happen only after a failure:

- unusable cache settings retry through the standalone `settings` and `html_miracle` endpoints;
- if neither settings source parses, widgets receive empty runtime settings plus any CSS that could still be extracted;
- an unavailable `all_reviews_page` can fall back to `all_reviews_count` and `all_reviews_rating` for aggregate-dependent widgets;
- invalid official Floating Reviews Tab data can fall back to a separately validated All Reviews page.

The Hydrogen example checks every nullable slot before constructing data or rendering a component. A failed legacy Review Widget no longer removes a healthy Star Rating Badge, carousel, counter, or v3 widget.

Collection adapters now keep valid rows and discard structurally invalid ones. Invalid optional pagination, counts, translations, settings, summaries, or rating-distribution fields receive conservative defaults derived from validated content where possible. This applies to the v3 Review Widget, Happy Customers, Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, Review Snippets, Q&A, AI summary keywords, Trust Badge optional modal fields, and UGC posts.

Judge.me's exact Review Widget manager receives the sanitized review streams and pagination, not the rejected raw rows. UGC cache markup is also rewritten so its hidden `data-json` contains only validated posts.

## Hard failure boundary

Graceful degradation does not apply to:

- executable HTML, inline event handlers, or `javascript:` URLs;
- mismatched shop or product identities;
- response data for a different requested selection;
- invalid caller configuration or missing required product metadata;
- aborted requests.

Those conditions still fail closed for the owning widget. An unsafe record is not silently passed to Judge.me's browser runtime.

## Automated coverage

The regression suite verifies that:

- a legacy endpoint returning HTTP 503 and malformed shared settings leave unrelated legacy widgets usable;
- malformed rows and optional metadata do not suppress otherwise valid collection pages;
- standalone exact widgets survive an unavailable shared aggregate/settings dependency;
- executable carousel and review markup still rejects the owning widget;
- the sanitized v3 and UGC payloads contain only validated records.

The final repository gates passed on 2026-07-14 with Bun 1.3.14:

- `bun run test`: 58 passing tests;
- `bun run lint`;
- `bun run typecheck`;
- `bun run build`.

## Brave verification

After a clean reload of the Hydrogen product route on `http://localhost:3001`, the legacy and v3 Review Widgets, counters, medals, AI summary, carousels, Review Snippets, and UGC content rendered. The v3 **Write a review** form opened and closed successfully. Brave DevTools reported zero console error messages after the third-party runtimes settled.

No credential, private review record, or copied Judge.me bundle is stored in this report.
