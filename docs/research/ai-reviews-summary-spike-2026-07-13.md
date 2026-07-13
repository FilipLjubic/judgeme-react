# Working Judge.me AI Reviews Summary spike

Date: 2026-07-13  
Scope: standalone store-level AI Reviews Summary, Shopify metafield data, block configuration, current extension runtime, Hydrogen access, and the first exact React adapter

## Result

The standalone AI Reviews Summary can be mounted exactly in Hydrogen when the host supplies Judge.me's generated store-summary metafield. It does not need a private Judge.me token and it does not need a separate summary-generation API.

The implementation deliberately does not create its own summary. Judge.me owns the generated text and refresh cycle; the React library only validates and forwards that content to Judge.me's current extension component. Missing data returns `null` rather than showing invented customer sentiment.

Judge.me documents this as an Awesome-plan, store-level widget. It summarizes recent product and store reviews rather than one product. The official setup requires the app embed and a Shopify app block. See [AI Reviews Summary Widget](https://judge.me/help/en/articles/13672572-ai-reviews-summary-widget).

## Official Liquid and data contract

Judge.me publishes the core Liquid contract:

```liquid
{% assign widget_data = shop.metafields.judgeme.store_summary_widget_data %}
<div
  class="jdgm-widget jdgm-store-summary-widget"
  data-widget="store-summary"
  data-entry-point="store-summary-widget/main.js"
  data-entry-key="store-summary-widget/main.js"
></div>
{% if widget_data %}
  <script>
    jdgm.data ||= {};
    jdgm.data.storeSummaryWidget = {{ widget_data }};
  </script>
{% endif %}
```

The current extension consumes these payload fields:

- `average_rating`
- `number_of_reviews`
- `ai_summary_text`
- optional `ai_summary_translations`
- `keywords[]` with `keyword` and `positive|neutral|negative` `sentiment`

`parseAiReviewsSummaryMetafield` accepts the Storefront API metafield `value`, validates the payload, strips unknown fields, and returns a normalized serializable object. Summary and keyword strings are rendered as text by Judge.me's Vue component; the adapter does not accept summary HTML.

Judge.me's current help article also mentions review highlights. The dated `judgeme-624` store-summary entry does not read or render a highlight field, so this adapter does not claim highlight support until the live deployment exposes a verified schema and renderer.

## Hydrogen metafield access

The host should query the metafield through Shopify's Storefront API:

```graphql
shop {
  judgeMeStoreSummaryWidgetData: metafield(
    namespace: "judgeme"
    key: "store_summary_widget_data"
  ) {
    value
  }
}
```

On the 2026-07-13 Free-plan test store, the query succeeded but returned `null`. Judge.me's tokenless public status route reported that the store has sufficient reviews and is not currently generating a summary:

```text
GET https://api.judge.me/store_summary/status
  ?shop_domain=vanilla-slop.myshopify.com
  &platform=shopify
```

The response is CORS-readable and publicly cacheable. It is a generation-status diagnostic, not a content endpoint. `fetchAiReviewsSummaryStatus` exposes only the two booleans and does not serialize the returned Shopify-admin activation URL.

The Hydrogen harness therefore uses a conspicuously labeled local fixture only when the metafield is absent. That keeps the current Free-plan store useful for rendering and lifecycle tests without presenting locally synthesized text as Judge.me production data. A real metafield always takes precedence.

## Current extension contract

The current deployment manifest maps:

```text
store-summary-widget/main.js -> store_summary_widget.js
```

Its manifest graph supplies the store-summary, layout, text, modal, verified-badge, and shared component CSS. The module auto-scans `.jdgm-store-summary-widget[data-entry-point]` and does not export its manager.

The React exact adapter therefore:

1. seeds `window.jdgm.data.storeSummaryWidget` with the validated payload;
2. reuses the shared public `jdgmSettings` and store/runtime configuration;
3. loads every CSS file reachable from the manifest entry;
4. evaluates a uniquely queried entry module for an SPA root;
5. waits for `.jdgm-widget-revamp .jm-store-summary`;
6. removes `data-entry-point` so a later scanner does not remount the completed root.

Module scans are serialized. One module evaluation can initialize every pending store-summary root, and later queued roots first check whether that earlier scan already completed them.

## App-block configuration

The public Widget API settings provide the global localized labels and branding flags:

- `store_summary_widget_heading`
- `store_summary_widget_button_text`
- `store_summary_widget_button_theme_text`
- `widget_ai_summary_disclaimer`
- `widget_show_verified_branding`
- `can_be_branded`
- `verified_badge_text`
- `locale` and `shop_locale`

Per-instance layout and styling live in Shopify theme-editor block attributes, not the public settings response. `AiReviewsSummaryConfig` mirrors the current attributes:

- expanded, accordion, and button themes;
- keyword and action-button visibility, including accordion `when_click` behavior;
- left or center alignment;
- title and text sizes;
- square, soft, round, and extra-round corners;
- maximum width and optional heading/button overrides;
- widget, text, lighter text, action button, and button-theme colors;
- sentiment-color treatment.

Headless apps must supply those block values directly or obtain them from a separately maintained theme-bridge snapshot. The library defaults follow Judge.me's published Liquid example and current bundle fallbacks.

## Brave verification

The local Hydrogen product route was clean-reloaded at 1440×1000 in the installed Brave binary. The exact adapter reached `ready`, removed its entry-point marker, and rendered the configured accordion at full page width with the shared 4.8 / 867 store aggregate and the labeled fixture.

The initial accordion state exposed the title, store aggregate, summary, and disclaimer. Clicking the accordion changed `aria-expanded` from `false` to `true` and rendered all four sentiment keywords. No AI Reviews Summary or CSP error appeared.

The isolated browser still logged the previously observed Videos Carousel headless initializer timeout. That error predates this component; the AI Reviews Summary remained `ready` and interactive.

## Security and operational notes

- No private Judge.me or Shopify token is used by the adapter.
- The production summary must come from the Judge.me-managed metafield. Do not summarize raw reviews in this library and label that output as Judge.me content.
- The public status endpoint does not provide summary text.
- Theme block settings are not dashboard Widget API settings; preserve that boundary in the public API.
- The extension asset base remains deployment-specific and must be supplied by the host.
- No CSP origin was added: the component reuses the existing `cdn.shopify.com`, `api.judge.me`, and Judge.me runtime policy.
