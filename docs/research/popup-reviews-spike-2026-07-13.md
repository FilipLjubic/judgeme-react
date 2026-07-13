# Pop-up Reviews Widget spike

Date: 2026-07-13  
Scope: Judge.me's Shopify app-embed popup, dashboard settings, public review feed, Hydrogen lifecycle, and the first native React implementation

## Result

The Pop-up Reviews Widget can be reproduced in Hydrogen without the private Judge.me token and without copying the Shopify app embed.

The implementation is native React rather than an exact mount of Judge.me's second app-embed bundle. It preserves the dashboard-generated selection, content, image, page, position, timing, count, mobile, corner, and star-color settings, then reads public review cards from Judge.me's tokenless CDN. This gives configuration and behavior parity while avoiding an undocumented second script lifecycle.

The official widget remains an Awesome-plan Shopify app embed. Judge.me documents that it shows up to 15 reviews and supports recent 5-star reviews, recent 5-star reviews with pictures, or manually featured reviews. It can be enabled on home, product, collection, cart, and list-collection pages. See [Pop-up Reviews Widget](https://judge.me/help/en/articles/9428427-pop-up-reviews-widget).

## Dashboard settings contract

The public `settings` Widget API response on the current Free-plan test store included these 18 popup fields even though the official embed is plan-gated:

- `popup_widget_review_selection`
- `popup_widget_round_border_style`
- `popup_widget_show_title`
- `popup_widget_show_body`
- `popup_widget_show_reviewer`
- `popup_widget_show_product`
- `popup_widget_show_pictures`
- `popup_widget_use_review_picture`
- `popup_widget_show_on_home_page`
- `popup_widget_show_on_product_page`
- `popup_widget_show_on_collection_page`
- `popup_widget_show_on_cart_page`
- `popup_widget_position`
- `popup_widget_first_review_delay`
- `popup_widget_duration`
- `popup_widget_interval`
- `popup_widget_review_count`
- `popup_widget_hide_on_mobile`

The dated store snapshot selected recent reviews with pictures, rounded corners, review pictures, every supported page toggle, bottom-left placement, five-second first delay/duration/interval, five reviews, and mobile hiding. Those values are observations, not library defaults that should override another store.

`normalizePopupReviewsConfig` validates and clamps the settings into a stable public type. `popup_widget_show_pictures=false` becomes `imageMode="disabled"`; otherwise `popup_widget_use_review_picture` chooses review or product imagery. The collection toggle also controls the list-collections route because Judge.me documents that page as supported but exposes no separate public setting for it.

## Public data contract

The implementation reuses:

```text
GET https://cdn.judge.me/reviews/reviews_for_carousel
```

Observed request mappings:

| Dashboard selection          | Public request                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Recent 5-star reviews        | `reviews_selection=all`, `star_rating=5_star`, `display_order=most_recent`, `carousel_type=cards`           |
| Recent reviews with pictures | Same read with `display_order=media_first`; request up to 30, then retain the configured maximum of 15      |
| Choose reviews manually      | `reviews_selection=featured_reviews`, `star_rating=all`, `display_order=most_recent`, `carousel_type=cards` |

The endpoint returns public card fields including a review UUID, title, plain-text body, rating, display reviewer name, product title/URL, and responsive review-picture URLs. The adapter deliberately serializes only those display fields. It does not use or expose reviewer email, phone, IP address, internal reviewer IDs, or a private API response.

Links pointing at the permanent `*.myshopify.com` domain are converted to relative paths so shoppers remain on the Hydrogen storefront.

## Product-picture limitation

The public carousel feed exposes review pictures but does not consistently include a base product image. `fetchPopupReviewsPage` therefore accepts `productImageUrlsByHandle`, intended to be filled from the host's Storefront API query. It also uses a returned product-variant image when Judge.me supplies one. If the dashboard selects product pictures and neither source is present, the popup renders correctly without an image rather than scraping a Shopify product page or leaking another credential.

The current test store selects review pictures, so its live fixture does not hit this fallback.

## React and Hydrogen lifecycle

`PopupReviews` is a fixed app-embed-style component rather than an in-page section. It should be mounted once near the application root when all storefront routes are wired. The current harness mounts it on the product route with `pageType="product"` so the first working fixture is explicit.

The component:

- waits for the configured first delay;
- shows each card for the configured duration;
- waits the configured interval before the next card;
- stops at the configured per-page count;
- respects desktop position and mobile hiding;
- exposes an accessible status region and dismiss button;
- disables its transition for reduced-motion users;
- clears every timer when the component or route unmounts.

The first Brave pass exposed Hydrogen starter CSS that globally styles every `<aside>` as a viewport-height drawer. The popup root is therefore a neutral `<div>` and its class explicitly resets all inset, height, background, and shadow properties before applying dashboard placement. This keeps the library independent of the consumer's drawer primitives.

No Judge.me browser script or new connect-source is required for this component. Review images remain covered by the existing `https://*.judge.me` image policy; optional Storefront API product images normally use the existing Shopify CDN image policy.

## Exact-embed findings and boundary

The current core extension manifest has no popup entry, supporting Judge.me's documentation that the popup is a separate app embed rather than an ordinary widget block. The core manifest inspection is dated and deployment-specific.

The project does not claim byte-for-byte UI parity with the unavailable Awesome-plan embed. The native adapter reproduces the documented behavior and public dashboard configuration with project-owned React/CSS. If an exact second-embed contract becomes observable later, it can be added as another engine without changing `PopupReviewsData`.

## Verification status

- `fetchPopupReviewsPage`, settings normalization, URL normalization, image mapping, and safety boundaries have automated fixtures.
- The live current store returned five configured popup cards, including four review pictures, through the tokenless feed.
- An isolated instance of the installed Brave binary verified the five-second first delay, bottom-left placement, review image, dismissal, next-card cycle, relative storefront link, and zero popup CSP errors. Browser timing, dismiss behavior, and page placement must still be rechecked after every lifecycle or CSS change.
- This report contains no token, private response, or full third-party bundle.
