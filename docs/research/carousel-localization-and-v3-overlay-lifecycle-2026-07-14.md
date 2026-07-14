# Carousel localization and Review Widget v3 overlay lifecycle

Date: 2026-07-14

## Outcome

The exact carousel adapters now preserve the merchant's configured header when the document and block languages differ only by casing. The exact Review Widget v3 adapter now owns and removes the document-level Write a review modal that Judge.me creates outside the component root.

These are compatibility guards around Judge.me's current runtime. The package still delegates carousel rendering and the complete review form to Judge.me.

## Current carousel observation

The observed Shopify extension deployment's [`carousels.js`](https://cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/carousels.js) implements `updateHeaderText` with a case-sensitive language-prefix check equivalent to:

```js
document.documentElement.lang.includes(config.primary_lang)
```

When the storefront serializes `EN` and the block config contains `en`, that check fails and the helper may replace the React-rendered block header with a title from the shared Judge.me dashboard settings. Cards, Testimonials, and Videos Carousel all called the same helper.

The package now performs the same prefix comparison after trimming and lowercasing both values. It calls Judge.me's title helper only when the normalized document language does not contain the normalized primary language. This preserves locale-prefix behavior such as `en-US` with `en` while making `EN` and `en` equivalent.

## Current v3 modal observation

The deployment's manifest maps `review-widget/ReviewWidgetManager.js` to the hashed manager asset. The observed [`ReviewWidgetManager` asset](https://cdn.shopify.com/extensions/019f4c84-84df-7501-b4cf-3f7b2005bf6e/judgeme-624/assets/ReviewWidgetManager-BvimUED-.js) handles Write a review by:

1. removing existing `.jdgm-review-widget-modal.jdgm-write-review-modal` elements;
2. constructing `window.jdgm._WriteReviewModal` from the legacy runtime;
3. appending that modal beneath `document.body`; and
4. opening it after the legacy modal dependencies become ready.

The current [`widget/write_review_modal.js`](https://cdnwidget.judge.me/widget/write_review_modal.js) close path fades the modal out, removes it, and calls `setup` again. That final setup appends a fresh hidden modal under `document.body` and installs the namespaced `.writeReviewModalA11y` document keydown handler. Neither node belongs to the v3 manager's Vue subtree, so unmounting the Vue app alone cannot remove it.

## Package ownership contract

The package runtime now:

- arms ownership only after a click on the v3 widget's `[data-testid="write-review-button"]`;
- claims the matching document-level modal and marks it with a unique package owner attribute;
- observes the modal's visible state and close-time replacement;
- removes the hidden replacement after a real close while preserving Judge.me's intentional preview verification reopen;
- removes an owned visible or hidden modal during React unmount;
- releases the modal's namespaced document keyboard handler; and
- keeps a bounded observer after unmount only when a previously clicked v3 form is still awaiting Judge.me's asynchronous modal loader.

The bounded late-open guard prevents an asynchronous `handleWriteReview` continuation from appending an orphaned modal after its React root has already disappeared.

## Automated regression coverage

The package tests cover:

- `EN`/`en`, `en-US`/`EN`, and `PT-BR`/`pt` language equivalence;
- a genuinely different `fr`/`en` locale;
- removal of Judge.me's hidden close-time modal replacement;
- preservation of an intentional visible reopen;
- immediate cleanup on owned-overlay disposal; and
- cleanup of a late modal created after the React root unmounts.

The repository verification completed successfully with 65 package tests plus the
workspace lint, typecheck, and production build commands.

## Brave verification

On 2026-07-14, a clean Brave load of the Hydrogen product route verified the live
v3 interaction against the current Judge.me deployment:

- opening the v3 **Write a review** form produced exactly one matching document
  overlay, marked `data-judgeme-react-review-widget-owner="review-widget-v3-1"`
  and displayed as `block`;
- closing the form and allowing Judge.me's fade/re-setup path to finish left zero
  `.jdgm-review-widget-modal.jdgm-write-review-modal` nodes; and
- opening the form again and navigating to the Hydrogen home route while it was
  visible also left zero matching nodes after the product widget unmounted.

The observed Cards, Testimonials, and Videos Carousel headings also initialized
normally on the same product route. Case-only language equivalence is asserted by
the deterministic package test because a full navigation restores the server's
HTML `lang` value.

No store token, private review record, or copied third-party bundle is stored in this report.
