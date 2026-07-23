# Copy-paste setup prompt

Paste everything inside the block below into Codex or another coding agent while it is opened in your existing React storefront repository. The agent should ask one round of setup questions, then implement the integration after you answer.

```text
Integrate judgeme-react into this existing Shopify headless storefront.

This package is an unofficial, reverse-engineered compatibility layer. It reconstructs the public APIs, CDN data, Shopify metafields, dashboard settings, styles, and current Judge.me extension modules that a Liquid storefront normally receives through the Judge.me app embed and app blocks. Treat Judge.me as a mutable third-party runtime, not as a stable React API.

Use these upstream references:
- Package guide: https://github.com/FilipLjubic/judgeme-react/tree/main/packages/judgeme-react#readme
- Complete Hydrogen example: https://github.com/FilipLjubic/judgeme-react/tree/main/examples/hydrogen
- Example product route: https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/app/routes/products.%24handle.tsx
- Example provider/root: https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/app/root.tsx
- Example asset discovery: https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/app/lib/judgeme.server.ts
- Example Hydrogen CSP: https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/app/entry.server.tsx
- Example environment file: https://github.com/FilipLjubic/judgeme-react/blob/main/examples/hydrogen/.env.example

Work in two phases.

PHASE 1: ASK ME THE SETUP QUESTIONS

Inspect the repository first. Read its AGENTS.md/instructions, package manifest, lockfile, framework version, routes, root provider, server entry, CSP, environment typing, test scripts, and existing review code. Do not edit anything yet.

Then ask me one concise numbered batch of questions. Do not ask for facts you can discover from the repository. Include reasonable recommendations and let me answer "use the recommendation".

Ask for:

1. Store identity
   - Permanent *.myshopify.com domain.
   - A public Online Store HTTPS URL, preferably a published product page, where the Judge.me app embed is enabled. This is used only by the server to discover the store's current Judge.me Shopify extension assets.
   - Confirm that Judge.me is installed and the Judge.me app embed is enabled under Shopify Admin > Online Store > Themes > Customize > App embeds on the published theme.

2. Judge.me public token
   - Tell me exactly where to get it: Judge.me Admin > Settings > Integrations > View API tokens > Public API Token.
   - Ask me to add it to the local server environment; do not ask me to paste a secret into chat if the environment file is available to me.
   - Use these default names unless the app already has a convention:
     JUDGEME_SHOP_DOMAIN=store.myshopify.com
     JUDGEME_PUBLIC_TOKEN=
     JUDGEME_STOREFRONT_URL=https://store.myshopify.com/products/published-product
     JUDGEME_V3_ASSET_BASE_URL=
   - Explain that v3AssetBaseUrl is not copied from Judge.me Admin. It is the public `cdn.shopify.com/extensions/<deployment>/<handle>/assets/` directory returned by server-side discovery.
   - Explain that JUDGEME_V3_ASSET_BASE_URL is only an optional last-known-good input to discovery. It is normally blank; if the user wants a fallback, they can copy a previously returned `deployment.assetBaseUrl` into it.
   - Never request, add, serialize, log, or expose the Judge.me Private API Token. This package does not need it.

3. Widgets
   - Ask which components I want now.
   - Recommend this starter product-page set unless the existing UI suggests otherwise:
     a. StarRatingBadge beside the product title.
     b. ReviewWidgetV3 below the product content, with LegacyReviewWidget as a fallback.
     c. One social-proof surface: CardsCarousel or ReviewSnippets.
   - Mention that the visual list and complete implementation are in the Hydrogen example and package README linked above.
   - Offer these groups so I do not need to know every component name:
     Product reviews: StarRatingBadge, ReviewWidgetV3, LegacyReviewWidget, QuestionsAndAnswers.
     Store/aggregate: HappyCustomers, AllReviewsWidget, AllReviewsCounter, VerifiedReviewsCounter.
     Carousels/media: CardsCarousel, TestimonialsCarousel, VideosCarousel, ReviewsCarousel, ReviewSnippets, ReviewsGrid, UgcMediaGrid.
     Trust/summary: TrustBadge, JudgeMeMedals, AiReviewsSummary.
     Global overlays: FloatingReviewsTab, PopupReviews.

4. Widget state in Judge.me
   - Ask whether the store uses the new or legacy Review Widget.
   - Ask which requested features are enabled in Judge.me and whether the account is Free or Awesome.
   - Ask whether the store has the content required by the requested widgets: verified reviews, video reviews, published customer questions, Instagram posts, or generated AI summary data.
   - Explain that empty or ineligible features should stay unmounted. Do not substitute sample content.

5. Loading preference
   - Ask whether I want:
     a. Server-first initial data with client enhancement (recommended).
     b. Server-first critical widgets and deferred/lazy below-the-fold widgets.
     c. Client-deferred optional widgets for an app that cannot load them on the server.
   - If I do not care, choose server-first for StarRatingBadge and the Review Widget, then defer only expensive below-the-fold widgets when the app already has a safe lazy-loading pattern.
   - Explain that current exact widgets still need client JavaScript for forms, filters, media, lightboxes, and some layout. "Server-first" does not mean "zero client runtime".

6. Optional Shopify Admin access
   - Ask only if I selected TrustBadge or AiReviewsSummary.
   - Explain that SHOPIFY_ADMIN_ACCESS_TOKEN is a Shopify Admin API credential, not the Headless private Storefront token and not a Judge.me token.
   - It must remain server-only and is used for Judge.me-owned shop metafields that may not be Storefront-visible.
   - Use SHOPIFY_ADMIN_API_VERSION=2026-04 unless the app already pins a compatible current version.
   - If I do not want Admin access, continue without those fallback paths and render the widget only when public/Storefront data is available.

7. Verification constraints
   - Ask for the normal dev command only if it is not discoverable.
   - Ask which published product handle should be used for verification if the public storefront URL does not already identify one.
   - Use the repository's existing browser/test conventions. For the upstream Hydrogen example, use a clean Brave reload because third-party CSP and runtime behavior cannot be proven by TypeScript.

After I answer, restate the chosen store domain (never tokens), widgets, loading strategy, and optional Admin-token decision in a short checklist. Then proceed with PHASE 2 without asking more questions unless the repository reveals a genuinely blocking or security-sensitive choice.

PHASE 2: IMPLEMENT THE INTEGRATION

General rules

1. Preserve the app's current framework, route architecture, code style, package manager, and lockfile. Do not introduce a second lockfile.
2. Install the current requested version of judgeme-react. Use:
   - judgeme-react/server for server-only fetchers, normalizers, data combiners, Shopify ID helpers, and v3 asset discovery.
   - judgeme-react/react for JudgeMeProvider, components, props, and runtime events.
   - Avoid the combined judgeme-react entry in a strict server/client or React Server Components app.
3. Never put a Shopify Admin token, private Storefront token, or Judge.me private token in loader output, React props, JudgeMeProvider, public environment variables, logs, fixtures, screenshots, tests, or committed files.
4. Add placeholder variables to .env.example and environment typings, but do not copy real credentials into committed files.
5. Keep each optional widget independently nullable. One failed Judge.me endpoint or malformed optional payload must hide only its owning widget, not reject the product page.

Environment and asset discovery

6. Add or map:
   JUDGEME_SHOP_DOMAIN=<STORE>.myshopify.com
   JUDGEME_PUBLIC_TOKEN=
   JUDGEME_STOREFRONT_URL=https://<STORE>.myshopify.com/products/<PUBLISHED_HANDLE>
   JUDGEME_V3_ASSET_BASE_URL=
   SHOPIFY_ADMIN_ACCESS_TOKEN=        # optional, server-only
   SHOPIFY_ADMIN_API_VERSION=2026-04 # optional
7. JUDGEME_STOREFRONT_URL must be an HTTPS page on the store's public Online Store theme. Never scrape review content from that page. It is only an extension-deployment discovery source.
8. Create a server-only helper around resolveJudgeMeV3AssetDeployment. Pass the permanent shop domain, public storefront URL, and optional fallback URL. Catch discovery failures, report them once, and return null so legacy/native widgets can still render. Pass the helper's returned deployment.assetBaseUrl through loader data as v3AssetBaseUrl; never treat the raw fallback env variable as the normal provider value.
9. Do not hardcode a cdn.shopify.com extension deployment UUID. Judge.me can replace it on deployment.

Provider and runtime

10. Mount JudgeMeProvider once near the application root with only browser-safe values:
    - shopDomain
    - publicToken
    - discovered v3AssetBaseUrl
    - defaultEngine: "auto" unless the app has a tested reason to force an engine
11. If the app has error monitoring, connect onRuntimeError and onRuntimeStatusChange without logging credentials or full customer payloads.
12. Do not initialize two Shopify stores or two Judge.me extension deployments in one document.

Server data

13. Convert Shopify product GIDs with getShopifyNumericId.
14. For StarRatingBadge plus the legacy Review Widget, use fetchLegacyProductWidgets so settings and html_miracle are requested once.
15. When the route also uses store-level legacy widgets, use fetchLegacyStorefrontWidgets. It shares the large settings/CSS payload and provides nullable data for the classic carousel, counters, All Reviews, Floating Tab, medals, and UGC paths.
16. Reconstruct component data with the shared resources at render time. Do not duplicate the large settings object inside every loader result.
17. If the selected Review Widget is v3, use the example's fetchReviewWidgetV3Page and createReviewWidgetV3Data path. Prefer a valid ReviewWidgetV3 payload and keep LegacyReviewWidget as the fallback when it is fetched.
18. For exact v3 components, fetch only their page-specific data and combine it with shared settings/aggregates using the matching create*Data function. Follow the complete Hydrogen product route rather than inventing endpoint formats.
19. Wrap each optional exact/native fetch and create step independently. Return null on ordinary disabled, empty, or recoverable third-party failures. Do not swallow request aborts.
20. Validate or preserve the package's validated payloads. Do not bypass the safe-HTML checks or pass raw executable storefront markup through custom code.

Styles and rendering

21. Do not manually match styles to components, mount JudgeMeWidgetStyles, or pass includeStyles. Current components own their required legacy, native, or exact-extension CSS automatically.
22. When a create*Data helper accepts styles, pass the shared resources.styles value already fetched by the loader. This avoids a browser request. If it is omitted, the exact runtime must be allowed to read the same public dashboard/font CSS from cache.judge.me before mounting; this fallback prevents missing JudgemeStar glyphs.
23. Render StarRatingBadge near the product title. Render normal content widgets one below another in ordinary document flow below the main product content.
24. Do not make the product information sticky as part of this integration.
25. Mount FloatingReviewsTab and PopupReviews outside the vertical stack because they are global overlays.
26. Preserve host styling outside Judge.me roots. Do not apply broad element resets to Judge.me-owned DOM.
27. Treat all data props as nullable and render conditionally. Do not fabricate reviews, questions, answers, summaries, counts, badges, medals, UGC, photos, or video cards.

Dashboard customizations

28. Reuse the settings and styles returned by Judge.me. These carry public dashboard-level colors, labels, locale strings, branding, legacy CSS, and feature flags.
29. Shopify theme-editor block settings do not automatically sync to headless React because they belong to one Liquid app-block instance. Represent the chosen block settings through the component's typed config.
30. Start with package defaults unless I requested a specific layout. Keep config in a small named object near the loader or route rather than scattering literal data-* values.
31. Document which settings come from Judge.me automatically and which are host-owned typed config.

Widget-specific safety and activation

32. VerifiedReviewsCounter must use the exact verified badge response and return null below Judge.me's 20-verified-review threshold. Never estimate it from All Reviews totals.
33. TrustBadge needs Judge.me's shop metafields. If using a Shopify Admin fallback, fetch server-side and serialize only the validated public display data.
34. AiReviewsSummary content must come from shop.metafields.judgeme.store_summary_widget_data, with an optional server-only Admin fallback. The public status endpoint is not summary content. Return null if the metafield is absent.
35. QuestionsAndAnswers should only fetch/mount when the dashboard setting enables it. Its browser submission must remain a CORS-simple FormData POST: do not manually set Content-Type or add non-safelisted headers. Never show preview_mode=sample_data as published storefront content.
36. VideosCarousel must keep the required review_type mapping. Videos-only mode can be empty below three eligible cards.
37. UgcMediaGrid should return null when there are no published social posts.
38. FloatingReviewsTab may use the package's public All Reviews fallback when Judge.me's plan-gated exact endpoint returns null.
39. PopupReviews is a native React compatibility surface; it does not require installing Judge.me's separate paid popup app embed in the headless document.
40. ReviewSnippets and some other lower-plan compatibility routes are workarounds, not entitlement guarantees. Do not describe them as officially available on every plan.

Content Security Policy

41. The host app owns CSP. Merge the example policy into the existing policy; never replace unrelated storefront, checkout, analytics, or app sources.
42. Preserve 'self' in scriptSrc.
43. For local Hydrogen/Vite, use workerSrc: ["'self'", "blob:"]. Do not put blob: in scriptSrc.
44. Exact Shopify extension adapters require https://cdn.shopify.com in scriptSrc, styleSrc, connectSrc, fontSrc, and imgSrc.
45. Merge the currently tested Judge.me/media origins from the example:
    script: cdnwidget.judge.me, cdn2.judge.me, cdn.shopify.com
    style: cdnwidget.judge.me, cdn2.judge.me, cdn.shopify.com
    connect: judge.me, *.judge.me, judgeme-public-images.imgix.net, cdn.shopify.com, vimeo.com
    font: data:, cdnwidget.judge.me, cdn2.judge.me, cdn.shopify.com
    image: self, data:, judge.me, *.judge.me, judgeme.imgix.net, review-images.judgeme.com, judgeme-public-images.imgix.net, i.vimeocdn.com, i.ibb.co, s3.amazonaws.com, cdn.shopify.com, *.cdninstagram.com, *.fbcdn.net
    media: *.judge.me, cdn.shopify.com, *.cdninstagram.com, *.fbcdn.net
    frame: *.judge.me, *.cdninstagram.com, *.fbcdn.net, www.youtube.com, player.vimeo.com
46. Preserve the package's component-scoped javascript:void(0) sanitizer where used; Judge.me can create those links after initialization.
47. CSP headers are document-scoped. Perform a full browser reload after changing them; hot module replacement does not update the policy on the existing document.

Loading strategy implementation

48. For the recommended server-first strategy, await Judge.me-owned SSR payloads before returning the product route data. Do not stream those roots through Suspense unless this app already has a tested lifecycle for them.
49. If I selected deferred below-the-fold loading, keep StarRatingBadge and the chosen Review Widget server-first. Defer independent carousel/grid/summary surfaces behind the app's existing route-defer or visibility pattern. Do not refetch shared settings for every deferred widget.
50. If I selected client-deferred optional widgets, keep credentials and fetch contracts safe, show a layout-stable placeholder, initialize once when visible, and release timers/listeners/runtime roots on unmount and SPA navigation.
51. Do not call the same Judge.me public endpoint once on the server and again in the browser when the package provides a preload/seed bridge.

Documentation

52. Update the app README with:
    - why judgeme-react is an unofficial compatibility layer;
    - exact environment variable names and where the Judge.me public token comes from;
    - the required Shopify app embed;
    - requested widgets and their Judge.me plan/content prerequisites;
    - which dashboard settings carry over automatically;
    - which typed config remains host-owned;
    - CSP ownership;
    - server-only credential boundaries;
    - files changed and the verification command.
53. Link to the full Hydrogen example for future widgets instead of copying hundreds of lines of loader code into the README.

Verification

54. Run the repository's relevant tests, lint, typecheck, and production build. Use its existing scripts and package manager.
55. Start the app on its configured development port and perform a clean reload of a published product in the project's preferred browser.
56. Verify each requested widget separately. Report:
    - rendered and interactive;
    - correctly empty/disabled/ineligible;
    - blocked by missing merchant activation/content;
    - failed due to a reproducible runtime/CSP problem.
57. Exercise at least one real interaction for each interactive widget category: open Write a review, move a carousel, change an All Reviews tab/filter, open a badge modal, or open a media lightbox as applicable.
58. Check the console and network panel for CSP violations, duplicate endpoint reads, rejected Judge.me calls, missing fonts, and runtime errors.
59. Navigate away and back once to catch SPA lifecycle errors. In React development Strict Mode, confirm widgets do not double-bind or dispose the current instance from a stale initializer.
60. Finish with a concise summary of files changed, selected loading architecture, widgets working, honest empty states, remaining merchant actions, verification results, and any origins/config the deployment environment must also receive.

Do not claim success based only on a passing build. Current Judge.me extension deployments and CSP behavior require browser verification.
```
