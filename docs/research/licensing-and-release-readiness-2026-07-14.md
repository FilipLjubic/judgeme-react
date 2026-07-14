# Licensing and npm release-readiness audit

- Date observed: 2026-07-14
- Scope: `judgeme-react` and the public monorepo
- Status: identity and license decisions complete; npm authentication remains

This is an engineering release audit, not legal advice. The software license and trademark permission determine third-party rights, so the owner should make those decisions explicitly and obtain qualified advice when needed.

## Current repository state

The package is technically packable and its owner-controlled metadata is ready for a public alpha:

- identical MIT `LICENSE` files exist at the workspace and package roots;
- `packages/judgeme-react/package.json` declares `license: MIT` and `author: Filip Ljubic`;
- `https://github.com/FilipLjubic/judgeme-react` now exists as the public source repository and is configured as `origin`;
- the final unscoped npm name is `judgeme-react`; an unauthenticated lookup returned HTTP 404, but ownership is only established by the first successful publish;
- the package README identifies the project as unofficial, but the package name itself uses the Judge.me mark.

The package does not copy Judge.me's CDN runtime into the archive. It publishes the project's own TypeScript output and loads current third-party modules from their official origins in the consuming storefront. The project's eventual open-source license therefore covers this repository's code and documentation, not Judge.me's hosted code, service, review content, logos, or trademarks.

## License decision

npm recommends an SPDX identifier in `package.json` and inclusion of the corresponding license text. For this permissive React library, the two practical candidates are:

| Choice | Practical effect | Tradeoff |
| --- | --- | --- |
| MIT | Short permissive grant with attribution and warranty disclaimer; the lowest-friction choice for broad library adoption. | Does not contain Apache-2.0's express patent grant and patent-litigation termination language. |
| Apache-2.0 | Permissive copyright license with an express patent grant, patent termination, modification notices, and NOTICE handling. | Longer and carries more redistribution requirements. |

The owner selected MIT under `Filip Ljubic`. Apache-2.0 remains documented only as the rejected alternative that would have added an explicit contributor patent grant and redistribution requirements.

Add identical license text at both locations:

```text
LICENSE
packages/judgeme-react/LICENSE
```

The root file covers the repository. The package-local file is required for the archive produced from `packages/judgeme-react`; the dry run must list `LICENSE`. A package test requires both copies to stay byte-identical and verifies the SPDX value, author and copyright line.

Sources:

- [npm package.json license metadata](https://docs.npmjs.com/files/package.json/)
- [OSI MIT license](https://opensource.org/license/mit)
- [OSI Apache License 2.0](https://opensource.org/license/apache-2-0)

## Judge.me name and service boundary

Judge.me's Terms, observed with a `14 July 2026` update date, state that Judge.me's service, features, and original content remain its or its licensors' property and that its trademarks and trade dress may not be used with a product or service without prior written consent. The same Terms allow merchants to display customer reviews on their websites and marketing assets when they clearly identify the reviews as provided through Judge.me.

Because `judgeme-react` uses the Judge.me mark as the package identity, the conservative pre-publish choices were:

1. obtain written permission or written guidance from Judge.me for the package/repository name; or
2. rename the package to a neutral owner-controlled identity and use Judge.me only in accurate compatibility descriptions, subject to Judge.me's response or legal advice.

An unofficial/non-affiliation disclaimer is useful for clarity but does not replace permission. After reviewing this risk, the owner chose to proceed with the descriptive `judgeme-react` project identity without requesting permission. The project will retain the disclaimer, avoid Judge.me logos as project branding and avoid endorsement claims. This records an owner risk decision; it is not a legal conclusion that permission is unnecessary. The package must also avoid implying that public compatibility endpoints provide Awesome-plan entitlements. Existing documentation already labels those paths as mutable workarounds.

Source: [Judge.me Terms](https://judge.me/terms), observed 2026-07-14.

## Remaining publication metadata

The public repository is `https://github.com/FilipLjubic/judgeme-react`. The package includes its monorepo-aware `repository`, `homepage`, and `bugs` fields plus the final `name`, `author`, `license`, and alpha version. Keep the package and Hydrogen example names and versions synchronized for every release.

## Secure first-publish path

The first unscoped public publish establishes ownership of the available package name. npm currently requires two-factor authentication or an eligible granular token for direct publishing. Prefer an interactive, reviewed alpha publish for version `0.1.0-alpha.0`.

Once a public repository and package exist, npm trusted publishing is the preferred ongoing path. It uses hosted-CI OIDC rather than a long-lived write token and automatically produces provenance for eligible public GitHub/GitLab releases. npm currently requires npm CLI 11.5.1 or later and Node 22.14.0 or later for trusted publishing.

Sources:

- [Creating and publishing unscoped public packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

## Remaining owner action

Authenticate the intended npm account with two-factor authentication, run the complete release check, inspect the archive, and publish `judgeme-react@0.1.0-alpha.0` with the `alpha` dist-tag. The first successful unscoped publish establishes package-name ownership.
