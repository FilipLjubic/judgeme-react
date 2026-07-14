# Publishing `@judgeme-react/core`

The package is prepared as an ESM-only public alpha. Publishing is intentionally a separate owner action because npm namespace ownership, repository metadata, and the software license have not been chosen in this workspace.

## One-time owner decisions

Before the first publish:

1. Own or create the npm `@judgeme-react` organization, or change the package name and every example import to a scope you control. A registry lookup returned no public `@judgeme-react/core` package on 2026-07-14, but that does not prove the scope is available to the current npm account.
2. Choose a license and add the matching root `LICENSE` file plus `license` in `packages/judgeme-react/package.json`. Do not publish a public library without making its usage rights explicit.
3. Create or choose the public source repository, add its Git remote, then add accurate `repository`, `homepage`, and `bugs` fields to the package metadata. This local repository currently has no Git remote, so those values are deliberately absent.
4. Decide whether `examples/hydrogen` will stay in the monorepo or be mirrored to a standalone example repository. It is already self-contained apart from the shared root lockfile and uses the published alpha version in its dependency declaration.

## Release contract

- Package: `packages/judgeme-react`
- Current version: `0.1.0-alpha.0`
- Registry access: public
- Runtime: ESM, React 18.3 or 19
- Entry points:
  - `@judgeme-react/core/server`
  - `@judgeme-react/core/react`
  - `@judgeme-react/core` compatibility barrel
- Published files: compiled `dist`, package README, setup prompt, package metadata, and the owner-selected license once added

Keep the version in `examples/hydrogen/package.json` synchronized with the library version. The exact alpha version is intentional: example installs should not silently drift to a different compatibility build.

## Release checks

From the repository root:

```sh
bun install --frozen-lockfile
bun run release:check
```

That command runs the library tests, all workspace lint/type checks, the Hydrogen production build, a package dry-run, and `publint`. Runtime/CDN changes additionally require the Brave checks described in `AGENTS.md`.

Inspect the dry-run file list. It must include `dist/index.js`, `dist/index.d.ts`, `dist/react.js`, `dist/react.d.ts`, `dist/server.js`, `dist/server.d.ts`, `README.md`, and `SETUP_PROMPT.md`. It must not include `.env`, tokens, research fixtures, the Hydrogen app, source-only test data, or a second lockfile.

## Publish the alpha

Authenticate interactively on the owner's machine, confirm the account can publish to the chosen scope, then publish from the package directory:

```sh
npm adduser
npm whoami
cd packages/judgeme-react
bun publish --access public --tag alpha
```

Do not publish from the workspace root. Do not use `latest` for the first compatibility release.

After publishing:

```sh
npm view @judgeme-react/core@alpha name version dist-tags --json
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
