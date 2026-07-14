# npm package and Hydrogen example release boundary

Date: 2026-07-14
Scope: package exports, registry dry-run, example portability, user setup, and first-publish blockers

## Outcome

The existing framework-neutral library and Hydrogen harness are now shaped as two public-facing artifacts:

1. `@judgeme-react/core` is the publishable ESM package under `packages/judgeme-react`;
2. `examples/hydrogen` is the reference consumer and can be extracted to a standalone repository after the matching alpha reaches npm.

The package retains its all-in-one root export for current Hydrogen consumers and adds explicit `@judgeme-react/core/server` and `@judgeme-react/core/react` subpaths. The server path exposes fetchers, data combiners, Shopify ID normalization, runtime policy, and v3 deployment discovery without exporting React components. The React path is marked with a `use client` boundary and exposes providers/components without the server fetch API.

This split is an API organization and tooling boundary, not a security sandbox. Secrets remain protected by keeping private/Admin credentials in server loaders and returning only validated public data.

## Example portability

The example dependency now names exact version `0.1.0-alpha.0` instead of `*`. Bun satisfies that version from the workspace during development, while the same manifest resolves from npm when `examples/hydrogen` is copied elsewhere. There are no workspace-relative source imports in the app.

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

## Registry and owner blockers

On 2026-07-14, an unauthenticated registry lookup returned HTTP 404 for `@judgeme-react/core`, so no public package currently occupies that exact name. This is not proof that the current owner controls or can create the `@judgeme-react` scope. `npm whoami` returned `ENEEDAUTH`, and the local Git repository has no configured remote.

The following decisions are intentionally not invented by implementation work:

1. npm organization/scope ownership or a replacement package name;
2. the software license;
3. the public source repository, issue tracker, and homepage URLs;
4. whether the example remains in the monorepo or is mirrored to another repository.

`docs/PUBLISHING.md` records the exact first-publish procedure and keeps the initial release under the `alpha` dist-tag. A public package should not be published until the owner adds an explicit license and accurate repository metadata.

## Reusable rules

- Keep server and React imports split in examples, even though the compatibility barrel remains supported.
- Keep the example dependency pinned to the exact library prerelease and update both versions together.
- Run the full workspace gates plus dry-run and `publint` before a registry publish.
- Verify a copied, out-of-workspace example against the registry package after publishing.
- Never put real store domains, storefront IDs, tokens, or deployment UUIDs in `.env.example` or package docs.

## Evidence

- live package manifests and build output in this repository
- `bun pm pack --dry-run` run from `packages/judgeme-react`
- npm registry lookup for `@judgeme-react/core` on 2026-07-14
- local `npm whoami` and Git remote checks on 2026-07-14

No credentials, npm auth material, or deployment-specific third-party asset URL is retained in this report.
