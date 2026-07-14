# Publishing `judgeme-react`

The package is prepared as an ESM-only, MIT-licensed public alpha. The first registry publish remains an owner action because npm authentication and package-name ownership must be verified interactively.

## One-time owner decisions

Before the first publish:

1. Confirm the authenticated npm account can publish the currently unclaimed unscoped `judgeme-react` name. An unauthenticated registry lookup returned HTTP 404 on 2026-07-14, but only a publish attempt establishes ownership.
2. Preserve the MIT license under `Filip Ljubic`: the root `LICENSE`, package-local `packages/judgeme-react/LICENSE`, and SPDX `license` field must stay synchronized. Publishing happens from the package directory, so the package-local copy must appear in the dry-run archive.
3. Preserve the package-name/trademark risk decision. Judge.me's Terms observed on 2026-07-14 say its trademarks may not be used in connection with a product or service without prior written consent. The owner chose to proceed with the descriptive `judgeme-react` project identity without requesting permission. Keep the project clearly unofficial, use no Judge.me logos as project branding, avoid endorsement claims, and treat this as an explicit risk decision rather than a conclusion that permission is unnecessary.
4. Public source repository: `https://github.com/FilipLjubic/judgeme-react`. It is configured as `origin`, and accurate `repository`, `homepage`, and `bugs` fields are present in the package metadata. Do not push until the initial license and metadata commit is ready.
5. Keep `examples/hydrogen` in this monorepo as the canonical example. It is self-contained apart from the shared root lockfile and uses the exact published alpha version in its dependency declaration; copy it outside the monorepo for the post-publish install check.
6. Enable npm two-factor authentication for the initial manual publish. After the public repository and first package version exist, prefer npm trusted publishing from hosted CI so releases use short-lived OIDC credentials and receive provenance instead of relying on a long-lived npm token.

## Release contract

- Package: `judgeme-react` from `packages/judgeme-react`
- Current version: `0.1.0-alpha.0`
- Registry access: public
- Runtime: ESM, React 18.3 or 19
- Entry points:
  - `judgeme-react/server`
  - `judgeme-react/react`
  - `judgeme-react` compatibility barrel
- Published files: compiled `dist`, package README, setup prompt, package metadata, and MIT license

Keep the version in `examples/hydrogen/package.json` synchronized with the library version. The exact alpha version is intentional: example installs should not silently drift to a different compatibility build.

## Release checks

From the repository root:

```sh
bun install --frozen-lockfile
bun run release:check
```

That command runs the library tests, all workspace lint/type checks, the Hydrogen production build, a package dry-run, and `publint`. Runtime/CDN changes additionally require the Brave checks described in `AGENTS.md`.

Inspect the dry-run file list. It must include `dist/index.js`, `dist/index.d.ts`, `dist/react.js`, `dist/react.d.ts`, `dist/server.js`, `dist/server.d.ts`, `README.md`, `SETUP_PROMPT.md`, and `LICENSE`. It must not include `.env`, tokens, research fixtures, the Hydrogen app, source-only test data, or a second lockfile.

## Publish the alpha

Authenticate interactively on the owner's machine, confirm the account can publish the unscoped name, then publish from the package directory:

```sh
npm adduser
npm whoami
cd packages/judgeme-react
bun publish --access public --tag alpha
```

Do not publish from the workspace root. Do not use `latest` for the first compatibility release.

After publishing:

```sh
npm view judgeme-react@alpha name version dist-tags --json
```

Then clone or copy `examples/hydrogen` outside the monorepo, run `bun install`, and repeat its typecheck/build against the registry package. That external install is the final proof that no workspace-only import leaked into the release.

## Future releases

For every release:

1. update the package version and the example's exact dependency together;
2. record third-party deployment or endpoint changes in `docs/research` and ctx;
3. run `bun run release:check`;
4. verify representative widgets in Brave;
5. publish prereleases under the `alpha` tag until the documented fixture gaps are closed;
6. move to `latest` only after the stable-release criteria in the package README are satisfied.
