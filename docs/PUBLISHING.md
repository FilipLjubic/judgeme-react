# Publishing `judgeme-react`

The package is an ESM-only, MIT-licensed stable release. Version `1.0.0` was first published to npm under `latest` by `pandazaar` on 2026-07-14.

## Initial publication record

The first publish established these release decisions:

1. The unscoped `judgeme-react` name is owned on npm by the publishing account `pandazaar`.
2. Preserve the MIT license under `Filip Ljubic`: the root `LICENSE`, package-local `packages/judgeme-react/LICENSE`, and SPDX `license` field must stay synchronized. Publishing happens from the package directory, so the package-local copy must appear in the dry-run archive.
3. Preserve the package-name/trademark risk decision. Judge.me's Terms observed on 2026-07-14 say its trademarks may not be used in connection with a product or service without prior written consent. The owner chose to proceed with the descriptive `judgeme-react` project identity without requesting permission. Keep the project clearly unofficial, use no Judge.me logos as project branding, avoid endorsement claims, and treat this as an explicit risk decision rather than a conclusion that permission is unnecessary.
4. Public source repository: `https://github.com/FilipLjubic/judgeme-react`. It is configured as `origin`, and accurate `repository`, `homepage`, and `bugs` fields are present in the package metadata. Do not push until the initial license and metadata commit is ready.
5. Keep `examples/hydrogen` in this monorepo as the canonical example. It is self-contained apart from the shared root lockfile and uses the exact published package version in its dependency declaration; copy it outside the monorepo for the post-publish install check.
6. npm two-factor authentication protected the initial manual publish. For future releases, prefer npm trusted publishing from hosted CI so releases use short-lived OIDC credentials and receive provenance instead of relying on a long-lived npm token.

## Release contract

- Package: `judgeme-react` from `packages/judgeme-react`
- Current version: `1.0.5`
- Registry access: public
- Runtime: ESM, React 18.3 or 19
- Entry points:
  - `judgeme-react/server`
  - `judgeme-react/react`
  - `judgeme-react` compatibility barrel
- Published files: compiled `dist`, package README, setup prompt, package metadata, and MIT license

Keep the version in `examples/hydrogen/package.json` synchronized with the library version. The exact version is intentional: example installs should not silently drift to a different compatibility build.

## Release checks

From the repository root:

```sh
bun install --frozen-lockfile
bun run release:check
```

That command runs the library tests, all workspace lint/type checks, the Hydrogen production build, a package dry-run, and `publint`. Runtime/CDN changes additionally require the Brave checks described in `AGENTS.md`.

Inspect the dry-run file list. It must include `dist/index.js`, `dist/index.d.ts`, `dist/react.js`, `dist/react.d.ts`, `dist/server.js`, `dist/server.d.ts`, `README.md`, `SETUP_PROMPT.md`, and `LICENSE`. It must not include `.env`, tokens, research fixtures, the Hydrogen app, source-only test data, or a second lockfile.

## First stable publish

Authenticate interactively on the owner's machine, confirm the account can publish the unscoped name, then publish from the package directory:

```sh
npm adduser
npm whoami
cd packages/judgeme-react
bun publish --access public --tag latest
```

Do not publish from the workspace root. Version `1.0.0` must be assigned to the `latest` dist-tag.

After publishing:

```sh
npm view judgeme-react@latest name version dist-tags --json
```

Then clone or copy `examples/hydrogen` outside the monorepo, run `bun install`, and repeat its typecheck/build against the registry package. That external install is the final proof that no workspace-only import leaked into the release.

For `1.0.0`, npm reported `latest: 1.0.0`. A clean external Bun project installed the registry package, compiled strict TypeScript imports from `judgeme-react/react` and `judgeme-react/server`, and loaded both entry points at runtime.

Version `1.0.1` was published under `latest` on 2026-07-14 as a documentation patch. npm reported `latest: 1.0.1`; the registry README contained the agent-first onboarding and `v3AssetBaseUrl` discovery guide, GitHub served the corrected Reviews Grid screenshot byte-for-byte, and a clean out-of-workspace Hydrogen copy installed `judgeme-react@1.0.1` before passing typecheck and production build.

Version `1.0.2` was published under `latest` on 2026-07-14 as a runtime hardening patch. It makes carousel language comparisons case-insensitive and owns the shared body-level Write a review overlay through v3 close and unmount. npm reported `latest: 1.0.2`; the 65-test release gate, package dry-run, and `publint` passed, and a clean out-of-workspace Hydrogen copy installed `judgeme-react@1.0.2` before passing typecheck and production build.

Version `1.0.3` was published under `latest` on 2026-07-14 as a Review Snippets compatibility patch. It falls back from Judge.me's unavailable dedicated snippet endpoint to the tokenless Cards Carousel feed, normalizes the public review fields, and keeps the exact runtime interception URL separate from the source URL. npm reported `latest: 1.0.3`; the 68-test release gate, 192-file package archive, and `publint` passed, the registry shasum matched the published archive, and a clean out-of-workspace Hydrogen copy installed `judgeme-react@1.0.3` before passing typecheck and production build.

Version `1.0.4` was published under `latest` on 2026-07-15 as a Happy Customers write-review runtime patch. It waits for Judge.me's shared core before configuring the exact extension runtime, ensuring `window.jdgm.widgetPath` is available when the form opens. npm reported `latest: 1.0.4`; the 69-test release gate, 192-file package archive, and `publint` passed, registry shasum `be1823a41cef9f10048c1d9012aa228118aa4319` matched the published archive, and a clean out-of-workspace Hydrogen copy installed `judgeme-react@1.0.4` before passing typecheck and production build.

## Future releases

For every release:

1. update the package version and the example's exact dependency together;
2. record third-party deployment or endpoint changes in `docs/research` and ctx;
3. run `bun run release:check`;
4. verify representative widgets in Brave;
5. use SemVer prerelease versions and a non-`latest` tag for future preview builds;
6. publish reviewed stable versions to `latest`.
