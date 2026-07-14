# Copy-paste setup prompt

Paste the prompt below into Codex or another coding agent while it is opened in your existing Shopify Hydrogen repository. Replace the values in the **Store details** section first.

```text
Integrate @judgeme-react/core into this existing Shopify Hydrogen storefront.

Store details:
- Permanent myshopify domain: <STORE>.myshopify.com
- Public Online Store URL with the Judge.me app embed enabled: https://<STORE>.myshopify.com/products/<PUBLISHED_PRODUCT_HANDLE>
- Package manager: Bun
- Start with these widgets: Star Rating Badge and Review Widget

Use the installed package's public API and the upstream examples/hydrogen implementation as the reference. Preserve the app's current architecture and styling outside the Judge.me integration.

Requirements:

1. Inspect the app before editing. Identify its Hydrogen/React Router version, product route, root provider location, server entry/CSP, environment typing, and existing package manager. Do not introduce a second lockfile.
2. Install @judgeme-react/core. Import server-only fetchers from @judgeme-react/core/server and React components from @judgeme-react/core/react. Do not import the server entry from browser-only modules.
3. Tell me where to obtain the Judge.me public token: Judge.me Admin > Settings > Integrations > View API tokens. Use only the Public API Token; the package does not need the private token.
4. Add these server environment variables and an .env.example without real secrets:
   - JUDGEME_SHOP_DOMAIN=<STORE>.myshopify.com
   - JUDGEME_PUBLIC_TOKEN=
   - JUDGEME_STOREFRONT_URL=https://<STORE>.myshopify.com/products/<PUBLISHED_PRODUCT_HANDLE>
   - JUDGEME_V3_ASSET_BASE_URL= (optional last-known-good fallback only)
   - SHOPIFY_ADMIN_ACCESS_TOKEN= (optional, server-only; needed by Trust Badge and the AI-summary Admin fallback)
   - SHOPIFY_ADMIN_API_VERSION=2026-04
5. Never add, request, serialize, log, or expose a Judge.me private token. Never return the Shopify Admin token from a loader or put it in JudgeMeProvider.
6. In a server-only helper, call resolveJudgeMeV3AssetDeployment with the permanent shop domain, public storefront URL, and optional fallback URL. Catch discovery failures so legacy/native widgets can still render when exact v3 assets are unavailable.
7. Mount JudgeMeProvider once near the application root with only shopDomain, publicToken, the resolved public v3AssetBaseUrl, and defaultEngine: "auto". Add onRuntimeError/onRuntimeStatusChange only if the app already has an error-monitoring path.
8. In the product loader, convert Shopify's product GID with getShopifyNumericId and fetch both starter widgets with fetchLegacyProductWidgets. Await Judge.me-owned SSR markup before returning loader data; do not stream it through Suspense.
9. Treat every widget payload as nullable. A failure or disabled feature must hide only that widget, not fail the product page.
10. Mount JudgeMeWidgetStyles exactly once for the shared legacy resources. Pass includeStyles={false} to every legacy widget that receives those same resources. Render StarRatingBadge near the product title and LegacyReviewWidget below the product content. If the store has the new Review Widget enabled, use the example's fetchReviewWidgetV3Page/createReviewWidgetV3Data path and prefer ReviewWidgetV3 with LegacyReviewWidget as the fallback.
11. Add the Judge.me CSP policy from the example server entry while preserving the host app's existing sources. Keep 'self' in scriptSrc, use workerSrc: ["'self'", "blob:"] for local Vite, and allow cdn.shopify.com for script/style/connect/font/image. Include Judge.me API/CDN/media hosts, judgeme.imgix.net, judgeme-public-images.imgix.net, s3.amazonaws.com, Vimeo/YouTube frame and thumbnail hosts, and the store/checkout domains already required by Hydrogen. Do not add blob: to scriptSrc.
12. Keep product widgets in normal document flow. Do not make product information sticky. Keep the Floating Reviews Tab and Pop-up Reviews outside the vertical widget stack if they are added later.
13. Do not fabricate sample reviews, Q&A, AI summaries, verified counts, UGC, or video reviews. Render null/empty states honestly. Do not scrape Liquid pages or hardcode a Shopify extension deployment UUID.
14. Add concise comments only where the server/client or credential boundary would otherwise be unclear. Update the app README with environment variables, merchant activation prerequisites, CSP ownership, and the exact files changed.
15. Run the repository's tests, lint, typecheck, and production build. Then start the app on its configured non-conflicting port, perform a clean Brave reload of a published product, verify the badge and review widget reach ready state, and exercise one interaction such as opening Write a review. Report enabled widgets separately from empty/disabled ones.

After the two starter widgets work, show me the optional widget list and the additional data/plan/metafield requirements before adding more.
```

This prompt intentionally starts with two widgets. The full example renders every implemented surface, but a smaller first integration makes CSP, product ID, deployment discovery, and dashboard activation problems much easier to isolate.
