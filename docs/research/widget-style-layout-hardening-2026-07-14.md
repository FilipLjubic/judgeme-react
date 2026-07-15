# Widget stylesheet and classic carousel sizing investigation

Date: 2026-07-14
Updated: 2026-07-15

## Scope

This investigation covers two visual failures reproduced in the Hydrogen harness:

1. the current Review Widget v3 rendered five square missing-glyph boxes instead of stars on a narrow viewport;
2. the classic card-theme Reviews Carousel cut off reviewer names and timestamps despite leaving blank space below the cards.

The observations below use the authorized current store, its public Widget API token on the server, the public Judge.me CDN stylesheet, and Brave at `http://localhost:3001`. No private credential was serialized or recorded.

## Missing stars

The storefront batch returns one shared `resources.styles` string. Its current CSS contains both the `JudgemeStar` `@font-face` declaration and the `.jdgm-star` font-family rule. The exact Review Widget v3 extension renders star characters from that private-use font but does not redeclare the font in its block stylesheet.

The Hydrogen route had set `includeStyles={false}` on every legacy component because the legacy Review Widget used to emit the shared CSS. Once the route preferred `ReviewWidgetV3`, `LegacyReviewWidget` was absent and no component emitted `resources.styles`. The private-use star characters consequently fell through to the system font and appeared as boxes. Whether the failure appeared depended on which review-widget implementation the route selected, not on React stripping CSS.

The first hardening pass made that dependency explicit by mounting `JudgeMeWidgetStyles` once and setting `includeStyles={false}` on every legacy component. That fixed the immediate page but remained caller-owned and easy to forget. The 2026-07-15 automatic ownership change below supersedes that integration contract.

## Automatic style ownership (2026-07-15)

The route-level style switch has been removed as a correctness requirement:

- legacy components always emit the dashboard CSS already present in their data;
- native React widgets always emit their package-owned CSS;
- exact extension widgets resolve their own recursive CSS graph from the current deployment manifest;
- before an exact widget mounts, the runtime also ensures the shared dashboard/font CSS exists;
- loader-supplied `styles` is installed immediately when available;
- when it is absent, a once-per-shop browser read of the public `https://cache.judge.me/widgets/shopify/<shop>` response extracts CSS from `settings` and `html_miracle` before the widget manager mounts;
- the dynamically installed fallback style copies the current document nonce so strict host CSP does not reject it.

The public cache returned CORS permission for the local Hydrogen origin on 2026-07-15 and did not require a private token. The public Widget token is added when configured, but no private/Admin credential enters this path. Components still accept `includeStyles` and export `JudgeMeWidgetStyles` for source compatibility, but `includeStyles` is deprecated and ignored so it cannot silently remove required CSS.

For request efficiency, server combiners should continue passing the batch's `resources.styles` into exact-widget `create*Data` helpers. The public cache is a correctness fallback, not an extra request on the healthy full route.

## Clipped classic carousel cards

The current `featured_carousel` response configures the card theme with these relevant rules:

- `.jdgm-carousel__item-wrapper { height: 400px }`;
- `.jdgm-carousel-item { height: 100%; padding: 8px 20px; overflow: hidden }`;
- `.jdgm-carousel-item__inner-wrapper { height: 100%; padding: 16px; width: 100% }`;
- `.jdgm-carousel-item__review { height: calc(100% - 2.6em) }`.

Judge.me's public `widget_v3/base.css` does not apply `border-box` to the classic carousel. Under Hydrogen's reset, the default `content-box` model adds the vertical and horizontal padding outside both `height: 100%` and `width: 100%`. The padded child therefore exceeds its fixed-height parent, after which Judge.me's `overflow: hidden` clips the reviewer footer. Most Shopify themes supply a global `border-box` reset, which hides this assumption in Liquid storefronts.

The React adapter now supplies `box-sizing: border-box` only to the classic carousel root and descendants. It deliberately does not alter the dashboard's 400px height or global host styles.

## Regression expectations

- Components render correctly without a route-level `JudgeMeWidgetStyles` mount or `includeStyles` bookkeeping.
- Exact widgets use loader-provided dashboard CSS when available and make at most one public cache fallback read per shop when it is absent.
- Review Widget v3 star rows render star shapes rather than missing-glyph boxes at narrow widths.
- Classic card-theme carousel reviewer names and timestamps remain within each card at desktop widths.
- Legacy and native components cannot have their required CSS disabled through the deprecated `includeStyles` prop.
- The carousel compatibility rule remains scoped to `[data-judgeme-react-widget="reviews-carousel"]`.

## Brave verification

An isolated instance of the installed Brave binary loaded a clean product page from port 3001 after the fix.

At a 400px mobile viewport, the document contained exactly one shared stylesheet mount, `document.fonts.check("16px JudgemeStar")` returned `true`, and the v3 widget's `.jm-star-rating__font-icon` nodes computed to `JudgemeStar, monospace`. The visual capture showed filled star shapes and no missing-glyph boxes. Every mounted Judge.me runtime reported `ready`.

At a 1400px desktop viewport, the first three classic carousel cards computed to `border-box`. Each reviewer block's bottom edge was inside both its card and inner-wrapper bottom edge, and the visual capture showed the reviewer names and dates fully contained within all three cards.

On 2026-07-15, the updated Hydrogen example was loaded directly in Brave on a clean product-page reload. Port 3000 was already occupied by an unrelated local storefront, so this verification used port 3010 as a temporary command-line override; the committed example scripts and documented default remained on port 3000, and no process was left listening on port 3010 afterward. The product badge and exact widgets rendered star shapes, the v3 Review Widget rendered its review cards and controls, and its **Write a review** overlay opened and closed successfully. No late runtime errors appeared on the direct reload. A preceding client-navigation run produced two legacy initializer timeouts despite rendered widgets; the required direct reload did not reproduce them, so that SPA-only observation is not attributed to the style-ownership change.

## Evidence

- Authorized `featured_carousel` response inspected on 2026-07-14 using the current store and public Widget API token.
- Authorized shared `html_miracle`/settings styles inspected on 2026-07-14; they contained the `JudgemeStar` embedded font and `.jdgm-star` font-family rule.
- Judge.me public v3 base CSS: <https://cdnwidget.judge.me/widget_v3/base.css>
- Judge.me public storefront cache: `https://cache.judge.me/widgets/shopify/<shop>` (CORS and CSS payload checked 2026-07-15).
- Brave responsive and desktop reproductions supplied and rechecked on 2026-07-14, including computed font and element-bound measurements through Brave DevTools Protocol.
- Brave direct product-page reload and v3 review-form interaction checked 2026-07-15 against the local Hydrogen example.
