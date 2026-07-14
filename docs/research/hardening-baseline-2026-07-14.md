# Judge.me React hardening baseline

Date: 2026-07-14
Scope: framework-neutral package, Hydrogen harness, exact-extension discovery, runtime lifecycle, and release verification

## Outcome

The storefront widget catalog is implemented. The next risk is operational drift rather than missing component names: Shopify extension deployment URLs change, third-party managers initialize asynchronously, and Q&A, UGC, and real video playback still lack enabled authorized fixtures.

This hardening pass establishes four release foundations:

1. current Judge.me extension assets can be discovered and manifest-validated on the server;
2. every exact widget reports a common loading/ready/error lifecycle and has one cleanup boundary;
3. the npm package has stable version metadata, a pack check, and a documented public API;
4. implementation coverage is separated from real-state fixture verification.

## Automated extension asset discovery

`resolveJudgeMeV3AssetDeployment` accepts a permanent Shopify shop domain plus an optional public Online Store page. It:

1. fetches the public theme HTML on the server;
2. extracts unique `https://cdn.shopify.com/extensions/<deployment>/<handle>/assets/` candidates, including common JSON-escaped forms;
3. fetches each candidate's `manifest.json`;
4. accepts only a manifest containing the current Judge.me core sentinels for the Review Widget, Reviews Grid, carousel lightbox, Review Snippets, AI Summary, Trust Badge, and Happy Customers;
5. returns the deployment ID, extension handle, manifest entries, discovery source, and normalized asset base;
6. deduplicates concurrent discovery, caches success for 15 minutes, serves a previous success for up to 24 hours after a refresh failure, and stops discovery after five seconds;
7. accepts a validated last-known-good asset base as a fallback.

The existing host-supplied URL remains useful. A direct server request to the current authorized store's `*.myshopify.com` product page returned HTTP 429 on 2026-07-14, while the configured deployment's public `manifest.json` remained readable and contained every sentinel. Automatic discovery therefore cannot be the only availability path; the last-known-good fallback and scheduled compatibility check are intentional parts of the contract.

Discovery is server-only. It rejects non-HTTPS and credential-bearing storefront URLs and should never receive a shopper-controlled URL. It does not use either Judge.me token or a Shopify Admin token.

## Lifecycle and error contract

The exact components previously duplicated an effect pattern that wrote a DOM status and logged failures. It had three operational weaknesses:

- hosts could not route failures to their own monitoring;
- a late asynchronous completion could race a React unmount;
- cleanup behavior differed among components, and Review Snippets skipped its release path when the asset base was missing.

`startJudgeMeRuntime` now owns the shared boundary. It emits `loading`, `ready`, and `error`, classifies errors as configuration, initialization, or disposal, suppresses readiness after cleanup, and calls the component disposer once. `JudgeMeProvider` exposes `onRuntimeStatusChange` and `onRuntimeError`; without an error handler it preserves default console reporting.

The nine migrated exact components are Reviews Grid, Cards Carousel, Testimonials Carousel, Videos Carousel, AI Reviews Summary, Review Snippets, Trust Badge, Happy Customers, and the v3 Review Widget. Widget-specific manager/timer/player disposal remains in `exact-runtime.ts`.

## Package boundary

`judgeme-react` remains framework-neutral and ESM-only. The owner selected stable version `1.0.0` for the first publish. The package declares its React peer range, exports JavaScript and declaration entry points, marks public npm access, and runs a build during `bun pm pack --dry-run`.

The public API has four layers:

- server fetch/normalization functions that return serializable public data;
- `create*Data` combiners that reuse shared settings and aggregates;
- React components under one public `JudgeMeProvider`;
- server-side operational helpers for v3 asset discovery.

The private Judge.me token and Shopify Admin token remain outside the React/provider boundary. Trust Badge and the AI-summary Storefront fallback use server-only Admin reads and serialize only public display data.

The owner subsequently selected MIT under Filip Ljubic and created `https://github.com/FilipLjubic/judgeme-react`; both license copies and final package metadata are release invariants.

## Fixture verification matrix

### Live enabled and interaction-verified

- Star Rating Badge
- Verified Reviews Counter
- Judge.me Medals
- Trust Badge
- Happy Customers
- AI Reviews Summary
- All Reviews Counter
- classic Reviews Carousel
- legacy Review Widget
- multilingual v3 Review Widget
- All Reviews Widget
- exact Floating Reviews Tab
- Reviews Grid
- Cards Carousel photo mode and image lightbox
- Testimonials Carousel
- Pop-up Reviews
- Review Snippets

### Correct live empty or disabled state

- UGC Media Grid: live store has no published Instagram post; production returns `null`; a temporary local post exercised the exact initializer/lightbox.
- Questions & Answers: Q&A is disabled with no published questions; the harness skips the read and component instead of showing sample data.

### Partial verification

- Videos Carousel: photo/media filtering, navigation, and image lightbox are verified. Actual iframe playback/autoplay and a Perspective layout comparison still require a published video review.

## Version 1.0 fixture gaps

The following are compatibility checks, not missing implementation work:

1. publish a video review and exercise iframe playback, autoplay, and cleanup;
2. enable Q&A, publish multiple pages, submit one dedicated test question, and verify moderation/publication;
3. publish one UGC image and one UGC video through Judge.me's normal approval flow.

The 2026-07-14 activation follow-up closed the previous enabled-state gaps for Review Widget v3, Trust Badge, Happy Customers, AI Reviews Summary, and the exact Floating Reviews Tab. See `widget-activation-audit-2026-07-14.md` for the live evidence and multilingual/runtime fixes.

Customer Account, checkout, Thank you, and Order status UI extensions remain a separate Shopify-owned surface. They are not missing storefront DOM widgets in this package.

## Verification added in this pass

- asset discovery selects by manifest contents rather than extension handle;
- JSON-escaped asset URLs are recognized;
- unrelated Shopify extensions are rejected;
- a successful result is reused from cache;
- a rate-limited discovery can use a normalized fallback;
- unsafe storefront URLs are rejected;
- lifecycle cleanup suppresses stale readiness and runs once;
- missing asset configuration produces an observable configuration error.

The repository gates remain `bun run test`, `bun run lint`, `bun run typecheck`, `bun run build`, and the package dry-run. Exact-runtime changes also require a clean Brave reload and at least one interactive path.

## Evidence

- [Judge.me widget catalog](https://judge.me/help/en/articles/8415708-judge-me-widgets)
- [Shopify theme app extension configuration](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration)
- `docs/research/review-widget-v3-spike-2026-07-14.md`
- `docs/research/happy-customers-spike-2026-07-14.md`
- `docs/research/trust-badge-spike-2026-07-14.md`
- `docs/research/videos-carousel-spike-2026-07-13.md`
- `docs/research/questions-and-answers-spike-2026-07-13.md`
- `docs/research/judge-me-ugc-media-grid-spike-2026-07-14.md`
- current authorized deployment manifest, inspected without retaining its deployment URL or third-party bundle

No token, private review record, or copied Judge.me bundle is stored in this report.
