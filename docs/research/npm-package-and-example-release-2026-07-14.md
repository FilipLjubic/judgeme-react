# npm package and Hydrogen example release boundary

Date: 2026-07-14
Scope: package exports, registry dry-run, example portability, user setup, and first-publish blockers

## Outcome

The existing framework-neutral library and Hydrogen harness are now shaped as two public-facing artifacts:

1. `judgeme-react` is the publishable ESM package under `packages/judgeme-react`;
2. `examples/hydrogen` is the reference consumer and can be extracted to a standalone repository after the matching package version reaches npm.

The package retains its all-in-one root export for current Hydrogen consumers and adds explicit `judgeme-react/server` and `judgeme-react/react` subpaths. The server path exposes fetchers, data combiners, Shopify ID normalization, runtime policy, and v3 deployment discovery without exporting React components. The React path is marked with a `use client` boundary and exposes providers/components without the server fetch API.

This split is an API organization and tooling boundary, not a security sandbox. Secrets remain protected by keeping private/Admin credentials in server loaders and returning only validated public data.

## Example portability

The example dependency now names exact version `1.0.3` instead of `*`. Bun satisfies that version from the workspace during development, while the same manifest resolves from npm when `examples/hydrogen` is copied elsewhere. There are no workspace-relative source imports in the app.

The example uses split subpath imports, generic placeholder environment values, one provider, automatic deployment discovery, the tested CSP, nullable per-widget composition, and one shared stylesheet mount. Its README maps the four most important integration files and documents how to run it inside or outside the monorepo.

## User onboarding

The package tarball includes `SETUP_PROMPT.md`. Its copy-paste prompt tells a coding agent to inspect an existing Hydrogen app, preserve the package manager and host CSP, keep credentials server-only, start with the Star Rating Badge and Review Widget, treat optional data as nullable, and verify the integration in Brave before expanding coverage.

The package README now leads with Judge.me's official **Settings > Integrations > View API tokens** path, a minimal loader/render example, and the three entry points before the complete widget catalog. Shopify Headless channel, Storefront API, Customer Account API, and optional Admin API credential acquisition remain in the Hydrogen example because they are host-framework concerns rather than requirements of the framework-neutral package.

## Package verification

The release contract adds:

- `prepublishOnly` release checks;
- `publint` metadata/export validation;
- a root `bun run release:check` command;
- tests proving the React entry does not export server fetchers and the server entry does not export React components;
- dry-run coverage for the README, setup prompt, root entry, React entry, server entry, and declarations.

The pre-change dry-run contained 178 files and approximately 0.99 MB unpacked. It contained only compiled output, package metadata, and the README; no `.env` or workspace app files were present.

After finalizing the `judgeme-react` name, MIT license, and stable `1.0.0` version, the release gate passed with 61 tests. The final dry-run produced `judgeme-react-1.0.0.tgz` with 188 files and approximately 1.0 MB unpacked, including the package-local `LICENSE`, split entry points, README, and setup prompt. `publint` reported no errors.

## Registry status and finalized owner decisions

On 2026-07-14, the initial unauthenticated registry lookup returned HTTP 404 for `judgeme-react` and `npm whoami` returned `ENEEDAUTH`. The public source repository was created at `https://github.com/FilipLjubic/judgeme-react`, npm browser authentication completed as `pandazaar`, and the first public publish succeeded as `judgeme-react@1.0.0`.

The documentation overhaul was subsequently released as `judgeme-react@1.0.1` under `latest`. Registry metadata and the published README were verified directly, the corrected Reviews Grid image on GitHub matched the local SHA-256, and a copied Hydrogen example with no workspace lockfile or environment secrets installed the registry package before passing TypeScript and production build.

The carousel-localization and Review Widget v3 overlay lifecycle fixes were released as `judgeme-react@1.0.2` under `latest` on 2026-07-14. The release commit is `59c0afd` with annotated tag `v1.0.2`. The complete release gate passed with 65 tests, workspace lint/typecheck/build, a 192-file package dry-run, and `publint`. npm registry metadata reported `latest: 1.0.2` with the same integrity hash produced by the local publish. A clean out-of-workspace Hydrogen copy excluded environment files, installed `judgeme-react@1.0.2` from the registry, and completed typecheck and production build.

The Review Snippets public-data fallback was released as `judgeme-react@1.0.3` under `latest` on 2026-07-14. The release commit is `12f26a2` with annotated tag `v1.0.3`. The complete release gate passed with 68 tests, workspace lint/typecheck/build, a 192-file package archive, and `publint`. npm registry metadata reported `latest: 1.0.3`; its `5e9e278e52cb8a3ef8df99bcbd4e9fa1ca5b03a2` shasum matched the locally published archive. A clean out-of-workspace Hydrogen copy excluded environment files, installed `judgeme-react@1.0.3` from the registry, and completed typecheck and production build.

The owner subsequently finalized:

1. unscoped npm package name `judgeme-react`;
2. MIT under `Filip Ljubic`, with identical repository/package license files;
3. public source, issue tracker and homepage under `https://github.com/FilipLjubic/judgeme-react`;
4. the Hydrogen example remains in the public monorepo as the reference consumer.

`docs/PUBLISHING.md` records the exact first-publish procedure and result. npm registry metadata verified `latest: 1.0.0`, MIT, ESM metadata, the root compatibility export, and the split React/server exports. A clean external Bun project installed `1.0.0`, passed strict TypeScript compilation against both subpaths, and loaded their runtime exports without a workspace link.

## Post-release documentation overhaul

On 2026-07-14, the repository and package READMEs were reorganized around the real compatibility boundary instead of presenting the project as a conventional API wrapper. They now lead with the fact that the library is an unofficial reverse-engineered bridge for Judge.me's Shopify app-embed, public data, dashboard settings, generated styles, and current extension modules. Merchant-visible benefits and failure modes are summarized before the detailed component catalog.

The package now ships a two-phase copy-paste setup prompt. A coding agent first asks one concise batch of questions about the permanent shop domain, public Judge.me token, public Online Store discovery page, desired widgets, feature eligibility, loading strategy, and verification target. It then implements the provider, server loader, nullable widget composition, v3 asset discovery, CSP, typed theme-block configuration, tests, and Brave verification without requesting a private Judge.me token.

`docs/WIDGET_GALLERY.md` contains one tightly bounded Brave screenshot for every public component, and the npm-facing package README embeds the same 20 images beside a short description of each component. Long review feeds are represented through complete leading review cards rather than multi-thousand-pixel page captures. The Q&A image is visibly labeled as Judge.me sample data, the UGC image is labeled as a documentation fixture rendered through the real runtime, and the Videos Carousel image does not claim to verify iframe playback. Screenshot content and live-fixture coverage remain separate claims.

Element capture must account for Judge.me's lazy media. Scroll the target widget into the viewport, wait until every intended image is complete with a positive `naturalWidth`, wait for `document.fonts`, and only then isolate and capture the widget root. The first Reviews Grid gallery image was taken before its offscreen `loading="lazy"` images decoded; the cards and their valid `review-images.judge.me` URLs were present, but the resulting screenshot showed blank media panels.

The published example uses port 3000 by default. Shopify Headless channel credentials, Storefront and Customer Account tokens, optional Admin access, Hydrogen environment mapping, and the host CSP remain in the Hydrogen guide rather than the framework-neutral package guide.

## Reusable rules

- Keep server and React imports split in examples, even though the compatibility barrel remains supported.
- Keep the example dependency pinned to the exact library version and update both versions together.
- Run the full workspace gates plus dry-run and `publint` before a registry publish.
- Verify a copied, out-of-workspace example against the registry package after publishing.
- Never put real store domains, storefront IDs, tokens, or deployment UUIDs in `.env.example` or package docs.
- Keep gallery images one component per file and crop to the component's visible bounds; label sample or fixture content inside the documentation instead of implying it came from the live store.

## Evidence

- live package manifests and build output in this repository
- `bun pm pack --dry-run` run from `packages/judgeme-react`
- npm registry lookup for `judgeme-react` on 2026-07-14
- local `npm whoami` and Git remote checks on 2026-07-14

No credentials, npm auth material, or deployment-specific third-party asset URL is retained in this report.
