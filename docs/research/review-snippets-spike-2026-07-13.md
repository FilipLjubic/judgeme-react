# Working Judge.me Review Snippets spike

Date: 2026-07-13  
Scope: product and cart Review Snippets, current public data contract, Shopify app-block configuration, extension runtime, Hydrogen lifecycle, and plan-gated workaround behavior

## Result

Review Snippets can be mounted in Hydrogen with Judge.me's current Shopify extension module and public review data. The adapter does not use a public or private Judge.me token for the snippet feed. It server-fetches the reviews, renders the exact app-block marker, and lets Judge.me's current module own the card, arrows, automatic movement, styling, and v3 review lightbox.

Judge.me officially documents Review Snippets as an Awesome-plan widget. The current Free-plan test store does not expose a live theme marker, but its public snippet endpoint returns five real product reviews without a token. This is therefore a working compatibility path, not evidence that Judge.me officially supports installing the block on Free. See [Review Snippets Widget](https://judge.me/help/en/articles/9823370-review-snippets-widget) and [Adding Judge.me widgets on your cart page](https://judge.me/help/en/articles/15359911-adding-judge-me-widgets-on-your-cart-page).

## Official behavior

For a product page, Judge.me describes a rotating set of up to five recent published five-star reviews with text. Each card contains stars, the public reviewer name, optional review media, and review body. The default transition is five seconds, arrows permit manual movement, and the widget stays hidden when no eligible review exists. Group and bundle review labels can identify a different reviewed product.

The cart variant can choose up to ten curated four- or five-star snippets for products currently in the cart, with store-level reviews as fallback. Headless code cannot depend on the Shopify theme cart bridge, so the React API exposes explicit product IDs and the same selection/filter fields consumed by the current endpoint.

## Current public endpoint

The deployed `judgeme-624` module calls:

```text
GET https://api.judge.me/reviews/reviews_for_review_snippet_widget
```

The observed query contract is:

- `v=2`;
- optional `product_id`;
- `selection_source=auto|all|store|product|custom|current_collection|current_product`;
- optional `collection_id`;
- optional `count`;
- `min_star_rating`, blank when inherited;
- repeated `tag_filter[]=pinned|featured`;
- repeated `custom_tags[]`;
- repeated `product_ids[]` for explicit custom products;
- `shop_domain`;
- `platform=shopify`.

On 2026-07-13, a `current_product` request for numeric product `15151876309375` returned HTTP 200, `Access-Control-Allow-Origin: *`, a public 1,200-second cache policy, five reviews, and no token requirement.

### 2026-07-14 endpoint drift and fallback

The same v2 endpoint returned HTTP 404 on 2026-07-14 for Moon Phase Prints, including for `selection_source=all`. The historical 2026-07-13 result above remains useful evidence of the module's intended request contract, but the endpoint can no longer be treated as the only public data source.

The tokenless Cards Carousel feed remained available:

```text
GET https://cdn.judge.me/reviews/reviews_for_carousel
```

With `carousel_type=cards`, it returned HTTP 200 and public review records containing the fields needed by the current Review Snippets module. The fallback maps `reviewer_name` to `public_reviewer_name`, the localized/product title to `product_name`, and the first HTTPS `picture` or `pictures_urls` variant to `review_image_url`. It preserves `uuid`, numeric `rating`, safe `body_html`, `verified_buyer`, and `product_variant_title`. Plain-text bodies are HTML-escaped before being wrapped in a paragraph.

`fetchReviewSnippetsPage` now keeps two URL concepts:

- `requestUrl` is always the canonical `reviews_for_review_snippet_widget` URL Judge.me's exact module will request in the browser;
- `sourceUrl` records the public URL that actually supplied the normalized reviews, whether the primary snippet endpoint or the carousel fallback.

The exact runtime bridge remains keyed only by `requestUrl`. Therefore a fallback response is still served to Judge.me's unchanged module when it makes its expected GET, and the `cdn.judge.me` source URL is never mistaken for the interception key.

The fallback translates `selection_source` to the carousel feed's `reviews_selection`, uses the closest server-side star bucket, enforces the exact minimum rating and count again after normalization, and forwards the caller's abort signal to both attempts. A two-star minimum over-fetches a bounded public page because the carousel feed has no exact two-to-five-star bucket. Pinned, featured, and custom-tag filters are not represented in the observed carousel schema, so those filters remain best-effort only when the primary snippet endpoint is unavailable.

Neither fallback request includes a Judge.me public, private, or Shopify Admin token. If both public sources fail, the adapter reports both failures and leaves the widget unavailable rather than exposing a private credential.

The payload has two top-level fields:

```ts
{
  reviews: Array<{
    uuid: string;
    rating: number;
    public_reviewer_name: string;
    body_html: string;
    review_image_url: string | null;
    product_title?: string;
    is_for_product_from_bundle?: boolean;
    is_for_product_from_group?: boolean;
  }>;
  settings: {
    arrows_background_color?: string;
    arrows_color?: string;
    card_color?: string;
    legacy_snippets_shop?: boolean;
    lighter_text_color?: string;
    round_border_style?: string;
    star_color?: string;
    text_color?: string;
  };
}
```

`fetchReviewSnippetsPage` normalizes the store and Shopify IDs, recreates this query exactly, limits the response to the configured count, validates rating and public display fields, and rejects scripts, inline event handlers, and `javascript:` URLs in `body_html`. `fetchReviewSnippets` is the standalone convenience API; routes already loading other widgets should use `createReviewSnippetsData` with shared settings.

## Current extension contract

The current Shopify extension deployment manifest maps:

```text
review-snippet-widget/main.js -> review_snippet.js
```

Its dependency graph supplies `review_snippet-wdrtQKFY.css` plus the shared plugin, preload, arrow, API, lightbox, review API, and language modules. The entry scans:

```text
.jdgm-review-snippet-widget-v2[data-entry-point]
```

The module builds a Vue carousel and opens the current v3 content/media lightbox from a card click or keyboard activation. It skips a live mount when the returned review list is empty.

The scanner does not expose an initializer and always performs the endpoint fetch itself. The exact adapter handles that without changing Judge.me's module:

1. the server loader fetches and validates the endpoint response;
2. React registers that response under its canonical exact URL before module evaluation;
3. a global fetch wrapper answers only a matching GET from the retained response;
4. every unrelated request delegates to the original browser fetch;
5. response entries are reference-counted and released when their React roots unmount;
6. the manifest CSS and a uniquely queried entry module initialize the pending SPA root;
7. the adapter waits for the inner carousel and card, removes `data-entry-point`, and marks the root ready.

This keeps the full route at one Review Snippets network read instead of repeating it after hydration. Multiple products or roots can coexist without serving the wrong response because the bridge keys complete canonical request URLs.

## App-block configuration

`ReviewSnippetsConfig` mirrors the current dataset contract:

- selection source, current product or collection, explicit product IDs, and maximum review count;
- minimum star rating, pinned/featured filters, and custom tags;
- review length, text size, maximum width, and media size;
- always shown, mobile-hidden, or hidden arrows;
- transition speed, including zero to disable automatic movement;
- review-media visibility and corner style;
- Awesome styling gate plus text, secondary text, card, star, arrow, and arrow-background colors.

The product default remains five reviews, while the adapter accepts the current endpoint/cart ceiling of ten. Theme block values must be provided by the headless host because Shopify does not publish those per-instance attributes through Judge.me's Widget API.

The dated `judgeme-624` bundle appears to reuse `data-text-color` for its secondary-text override even though it also declares `data-lighter-text-color`. The React marker emits both attributes so it follows the current public block shape and remains compatible with a corrected future deployment; endpoint settings still supply the fallback lighter color.

## Brave verification

The local Hydrogen product route was clean-opened in the installed Brave binary at 1440×1000. The Review Snippets root reached `ready`, removed its entry-point marker, rendered five real cards in Judge.me's current full-width design, and exposed Previous and Next controls.

The browser performance log showed the manifest-resolved CSS and unique `review_snippet.js` module, with zero real browser resources for `reviews_for_review_snippet_widget`; the preload bridge served the module from loader data. Moving to the next card changed the visible reviewer. Activating a card opened Judge.me's exact current lightbox with `role=dialog`, `aria-modal=true`, and the expected review content; Escape closed it.

The signed-in theme preview did not contain a `.jdgm-review-snippet-widget-v2` root on the tested Free-plan product. That prevents an exact theme-versus-Hydrogen visual comparison, but it is consistent with the official plan gate and does not affect the public endpoint/runtime validation.

On 2026-07-14, the Moon Phase Prints Hydrogen route was clean-loaded after the primary endpoint began returning 404. The public carousel fallback supplied five normalized cards to the exact Review Snippets module, Previous/Next controls were interactive, and the Brave console contained no Judge.me runtime errors. The module did not make an uncaught second request to the unavailable endpoint because the package bridge answered its canonical request from the normalized loader payload.

## Security and operational notes

- The snippet endpoint is currently tokenless. Do not add the private token to this request or serialize it through loader data.
- The endpoint and extension URL are current deployment behavior, not a documented stability guarantee. Resolve the module through the host-supplied deployment manifest.
- The response bridge must remain exact-URL and GET-only. A broad fetch mock would interfere with Judge.me, Shopify, and application traffic.
- Treat empty review arrays as a valid hidden widget, not an initialization error.
- Review body HTML is third-party content and remains validated before it enters the serialized loader payload.
- Official Awesome-plan installation and the current Free-plan public-data workaround are separate claims and must stay separate in user documentation.
