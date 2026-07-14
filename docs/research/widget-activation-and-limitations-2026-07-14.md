# Judge.me widget activation and package limitations

Date: 2026-07-14
Audience: merchants and developers integrating `@judgeme-react/core`

## Why this guide exists

Installing a React component does not necessarily enable the matching Judge.me feature. Judge.me splits storefront behavior across its admin, Shopify app embeds, Shopify app blocks, generated metafields, and review data. A component can be implemented correctly and still return `null` because the store has the legacy widget enabled, lacks the required plan, or has no eligible content.

The Hydrogen harness uses clearly labeled previews for disabled features. Production adapters do not silently replace missing Judge.me data with samples.

## The four configuration layers

1. **Judge.me admin settings** control plans, feature enablement, global text, colors, and review collection rules.
2. **Shopify app embeds** load Judge.me's core extension on an Online Store theme. The package also uses a public page from that theme to discover the current extension deployment.
3. **Shopify app blocks** contain settings for one block instance, such as carousel layout and review selection. Those values are Liquid theme data and are not exposed through the public Widget API.
4. **React configuration** supplies per-instance settings for the headless storefront. Adding or changing a Shopify block does not update a React component automatically.

For a headless storefront, keep the core Judge.me app embed enabled on the published Online Store theme used for asset discovery. You do not need to place every widget block on that theme merely to render the corresponding React component. Some features still need an app block once to activate or generate their Shopify metafields; those cases are called out below.

## Baseline store setup

1. Install Judge.me on the same Shopify store used by the headless storefront.
2. In Shopify Admin, go to **Online Store > Themes > Customize > App embeds**.
3. Enable **Judge.me** and save the theme.
4. Set `JUDGEME_STOREFRONT_URL` to a public HTTPS page on that Online Store theme.
5. Supply the permanent `*.myshopify.com` domain and Judge.me public Widget API token to server loaders.
6. Keep a last-known-good `JUDGEME_V3_ASSET_BASE_URL` in production if exact-widget availability matters. It is an optional fallback, not the primary discovery path.

The Judge.me private token is not required by the current package. Never send it to React or serialize it through loader data. Trust Badge is the one current component that needs a Shopify Admin API token, and that token stays in the server loader.

## Features that need merchant action

Judge.me's current plan names and admin paths can change. The table records the paths verified from Judge.me's help center and the authorized fixture on 2026-07-14.

| Widget or feature            | Plan    | Merchant action                                                                                                                                                                                                                                                                    | What the package does when unavailable                                                                                                         |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| New Review Widget            | Free    | Go to **Judge.me Admin > Settings > Widgets > Review Widget**, click **Upgrade now**, then confirm **Upgrade Widget**. Newer installations may already use it.                                                                                                                     | `fetchReviewWidgetV3Page` returns `null` unless an explicitly labeled preview is requested. The legacy component remains available separately. |
| Happy Customers, new version | Awesome | Go to **Settings > Widgets > Happy Customers Widget**, click **Upgrade now**, then confirm. The migration can take several minutes.                                                                                                                                                | Returns `null` unless the caller deliberately requests a labeled disabled preview. The legacy All Reviews Widget remains separate.             |
| Trust Badge                  | Free    | First publish at least one verified review. Then go to **Settings > Widgets > Customize**, enable **Trust Badge** under Install, and save.                                                                                                                                         | Returns `null` when there is no verified review or the feature is disabled. A disabled preview must be requested explicitly.                   |
| Questions & Answers          | Awesome | Go to **Settings > Widgets > Questions and Answers**, enable **Let customers ask questions**, and save. Submitted questions stay hidden until a merchant explicitly publishes them under **Reviews > Customer questions**; replying does not publish them automatically.           | A live empty feed stays empty. Judge.me's sample feed is read-only and must be visibly labeled when used in a test harness.                    |
| AI Reviews Summary           | Awesome | Collect more than five published text reviews, enable the core app embed, and add the **AI Reviews Summary (Paid)** app block to a supported Online Store 2.0 template with real data selected. Wait for Judge.me to generate `shop.metafields.judgeme.store_summary_widget_data`. | Returns `null` when the metafield is absent. The package never invents a summary and presents it as Judge.me content.                          |
| UGC Media Grid               | Free    | Connect a professional Instagram account through **Settings > Social sharing > Connect**. Then open **Settings > Widgets > UGC Instagram Shopping** and publish at least one fetched post. Reconnect Instagram when Meta's authorization expires.                                  | Returns `null` when no post is published.                                                                                                      |
| Videos Carousel              | Free    | Publish reviews containing actual video media. The current videos-only runtime hides the carousel when fewer than three matching cards are available.                                                                                                                              | Photo-and-video mode can still render photo cards. No fake video is substituted.                                                               |
| Verified Reviews Counter     | Free    | No switch is needed, but the store must have at least 20 verified published reviews.                                                                                                                                                                                               | Judge.me returns `null`; the package does not estimate the verified count from total reviews.                                                  |
| Judge.me Medals              | Free    | Earn medals through Judge.me's normal eligibility rules.                                                                                                                                                                                                                           | Only earned medals are returned.                                                                                                               |

### Official paid modes with compatibility fallbacks

| Widget               | Official activation                                                                                                                 | Package behavior outside the official mode                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating Reviews Tab | Awesome. Enable both **Judge.me** and **Floating tab** under Shopify theme app embeds.                                              | The package can build a functional fallback from the public All Reviews response when `reviews_tab` returns `null`.                                                    |
| Pop-up Reviews       | Awesome. Enable **Judge.me and Pop-up Widget** under app embeds, then choose reviews under **Settings > Widgets > Pop-up Reviews**. | `PopupReviews` is a native React implementation backed by public settings and review data. It does not require the second Shopify embed to mount in Hydrogen.          |
| Review Snippets      | Awesome. Add the Review Snippets app block to a product or cart template.                                                           | The current public endpoint also responds on the Free-plan fixture. This is an interoperability workaround, not a plan entitlement guarantee.                          |
| Questions & Answers  | Awesome and officially part of the Review Widget rather than a standalone block.                                                    | The package exposes a native standalone React component using Judge.me's current tokenless read and multipart submission routes. Those undocumented routes can change. |

Free app blocks such as Reviews Grid, Cards Carousel, Testimonials Carousel, and Videos Carousel do not have a separate dashboard upgrade. In Hydrogen, pass their block-level selection, layout, and color values to the component configuration. Adding the equivalent block in Shopify's theme editor is useful for comparison, but its settings do not flow into React.

## Review Widget upgrade details

The legacy and new Review Widgets are different runtime contracts. Do not render the new component against a store that still returns legacy HTML.

To upgrade:

1. Open **Judge.me Admin > Settings > Widgets > Review Widget**.
2. Copy any custom CSS and take screenshots of the existing settings.
3. Click **Upgrade now** and confirm **Upgrade Widget**.
4. Wait for Judge.me to finish updating products before testing the headless feed.
5. Check the Review collection settings if the **Write a review** button is missing. A value of **No one** hides it even when the widget is installed.

Judge.me keeps the previous configuration temporarily for rollback, but old custom CSS does not automatically match the new DOM.

## Happy Customers upgrade details

Happy Customers v2025 is not the same widget as the legacy All Reviews Widget.

1. Start an Awesome trial or subscription.
2. Open **Judge.me Admin > Settings > Widgets > Happy Customers Widget**.
3. Click **Upgrade now**, then **Upgrade Widget**.
4. Wait for the migration to finish.
5. Configure global appearance in Judge.me. Supply block-specific review selection and width through `HappyCustomersConfig` in the headless app.

The package can mount Judge.me's current manager with public fallback data, but it still respects Judge.me's enabled flag. A fallback data transport is not a license bypass.

## Theme editor settings do not sync to Hydrogen

Judge.me's public settings response covers many global labels, colors, branding options, and legacy widget choices. It does not contain every app-block value. The following settings commonly belong to the Shopify theme block:

- product, store, collection, cart, featured, or custom-product selection;
- column and row counts;
- maximum width and card sizing;
- arrows, autoplay, transition speed, and loop behavior;
- per-instance colors, alignment, headers, and empty-state choices.

Pass these values through the typed React config for the component. If a merchant wants the Hydrogen widget to match a Shopify block exactly, copy the block settings into application configuration or maintain a separate theme-bridge snapshot. The package does not scrape theme-editor JSON.

## Known compatibility limits

### Judge.me's exact runtime is not a public headless contract

The exact adapters load deployment-specific Shopify extension modules and tokenless Judge.me endpoints observed in the current storefront runtime. Judge.me can change module names, response shapes, or CORS behavior without treating it as a public API breaking change. Pin package versions and run a compatibility check before deployment.

### Extension discovery can fail on a cold start

The resolver discovers the current `cdn.shopify.com/extensions/.../assets/` base from public Online Store HTML and validates its manifest. Shopify can return a password page, HTTP 429, or a temporary error. A cached deployment covers many transient failures; a last-known-good fallback covers a cold start where discovery cannot complete.

### Plan-gated public endpoints are not entitlements

Some public reads currently work even when the corresponding Shopify block is Awesome-only. The package labels these as compatibility workarounds. Consumers should expect Judge.me to enforce the documented plan later and must not treat a reachable endpoint as permission to unlock paid features.

### Exact widgets need browser JavaScript

Server loaders provide validated data and some adapters emit useful SSR markup, but the current extension widgets still require Judge.me's browser modules for full layout, media, forms, lightboxes, and controls. They are not pure server components.

### One store and deployment per document

Judge.me writes mutable globals such as `window.jdgm` and `window.jdgmSettings`. The runtime is designed for one Shopify store and one extension deployment in a browser document. Do not mount widgets for multiple stores in the same page.

### CSP belongs to the host application

The consuming app must allow the Judge.me API/CDN, current Shopify extension assets, review image/video hosts, and required frame origins. Hydrogen development also needs `worker-src 'self' blob:` for Vite. Use the maintained Hydrogen harness CSP as the tested reference rather than copying an incomplete allowlist from one widget.

### Credentials have different trust boundaries

- The Judge.me public token may be used for public Widget API reads.
- The Judge.me private token is server-only and is not used by current components.
- The Shopify Admin token used for Trust Badge metafields and the optional AI-summary fallback is server-only.
- Never place either private token in `JudgeMeProvider`, browser JavaScript, fixtures, logs, or ctx.

### Customer Account and checkout extensions are out of scope

Shopify Customer Account, checkout, Thank you, and Order status UI extensions run in Shopify-owned extension surfaces. They are not storefront DOM widgets and are not part of this React package.

## Current verification gaps

The adapters and test coverage exist, but these real merchant states still need authorized fixtures before a stable release:

- actual Videos Carousel iframe playback and autoplay using a published video review;
- live Q&A pagination plus a submitted, moderated, and published test question;
- published UGC image and video posts.

The authorized 2026-07-14 activation follow-up verified the enabled new Review Widget, generated AI summary, Trust Badge, Happy Customers, and exact Floating Reviews Tab. Per-theme AI-summary appearance still needs broader visual comparison, but the production data path is no longer a fixture gap.

These are fixture gaps, not missing component names. The package README keeps implementation coverage and live-state verification separate for this reason.

## Sources

- [Judge.me widget catalog](https://judge.me/help/en/articles/8415708-judge-me-widgets)
- [Platform-independent widgets](https://judge.me/help/en/articles/8394958-platform-independent-widgets)
- [New Review Widget](https://judge.me/help/en/articles/12460582-customizing-the-review-widget-new-version)
- [Happy Customers, new version](https://judge.me/help/en/articles/13653546-customizing-the-happy-customers-widget-new-version)
- [Trust Badge](https://judge.me/help/en/articles/15281873-trust-badge)
- [Questions and Answers](https://judge.me/help/en/articles/8420858-questions-and-answers-widget-q-a-widget)
- [AI Reviews Summary](https://judge.me/help/en/articles/13672572-ai-reviews-summary-widget)
- [UGC Media Grid](https://judge.me/help/en/articles/8420861-ugc-instagram-shopping-widget)
- [Videos Carousel](https://judge.me/help/en/articles/11883318-videos-carousel)
- [Floating Reviews Tab](https://judge.me/help/en/articles/8415920-floating-reviews-tab)
- [Pop-up Reviews](https://judge.me/help/en/articles/9428427-pop-up-reviews-widget)
- [Review Snippets](https://judge.me/help/en/articles/9823370-review-snippets-widget)
- project spike reports under `docs/research/`, inspected against the authorized storefront on 2026-07-13 and 2026-07-14

No token, private review record, or copied Judge.me bundle is stored in this guide.
