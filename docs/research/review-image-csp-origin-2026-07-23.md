# Judge.me review-image CSP origin drift

Observed on 2026-07-23 against the live Moon Phase Prints Cards Carousel at
`https://moonphaseprints.com/products/classic-moon-phase-canvas-print`.

## Observation

The Cards Carousel reached its ready state and rendered review-photo `<img>`
elements whose URLs used:

```text
https://review-images.judgeme.com
```

The enforced storefront `img-src` included `https://judge.me` and
`https://*.judge.me`, but not the observed host. Those sources cover the
`judge.me` registrable domain and do not cover `judgeme.com`.

In the storefront document, the affected images completed with a natural width
of zero. The same public asset returned HTTP 200 with `image/jpeg` content and
rendered at 1024 by 1451 pixels when opened outside the storefront document.
This isolates the failure to the host CSP rather than missing Judge.me media.

## Integration change

Hydrogen consumers using review photos must include this exact source in
`imgSrc`:

```text
https://review-images.judgeme.com
```

The observed rendering path uses ordinary `<img>` elements, so this finding
does not by itself justify adding the origin to `connectSrc` or `mediaSrc`.
Keep those directives unchanged unless an exercised interaction proves that
Judge.me uses the host through another resource type.

The package README, setup prompt, Hydrogen README, and Hydrogen CSP example now
document the origin explicitly. A package regression test keeps those
surfaces synchronized.

## Remaining verification

The source-level change still requires a deployed storefront document and a
clean browser reload before the repaired image path can be considered
production-verified. CSP headers are document-scoped, so hot-module replacement
cannot validate the updated policy.
