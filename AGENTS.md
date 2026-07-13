<!-- ctx:start -->
## ctx

Use `ctx` for this project's local context and operational memory.

Before non-trivial work, check for prior project lessons:

- `ctx recall "<task, repo, or failure pattern>" --cwd <repo>` recalls scoped memories. Treat results as evidence-backed hints and verify drift-prone facts against the live repo.
- `ctx hook recall "<latest user turn or task>" --cwd <repo>` returns bounded prompt-ready memory context. Inject it only as supporting context; live repo evidence still wins.
- `ctx remember "<concise reusable lesson>" --kind preference|fact|decision|recipe|warning --subject <stable.topic> --scope project --cwd <repo>` stores confirmed durable lessons. Use `--suggested` for plausible but unconfirmed lessons. Do not store secrets, one-off noise, or unresolved guesses.
- Before final responses on non-trivial work, run a visible memory writeback check. If the turn established a durable preference, decision, repo workflow, root cause, verification rule, or reusable lesson, call `ctx remember` in the active conversation. Skip current/latest facts unless they are stored as dated observations with date and source.
- `ctx memory review --cwd <repo>`, `ctx memory accept <id> --cwd <repo>`, and `ctx memory reject <id> --cwd <repo>` manage review-gated memory candidates.
- `ctx memory process --cwd <repo>` claims queued memory work for the visible agent harness. Do not run hidden background model work; apply results explicitly with `ctx memory job apply <id> <result.json> --cwd <repo>`.
- `ctx offload add --kind <kind> --title <title> --content-file <path> --cwd <repo>` stores large payloads as blobs; `ctx offload graph --cwd <repo>` renders the task graph as Mermaid.

Use project context when source, docs, research, or notes evidence is needed:

- `ctx query "<question>" --cwd <repo>` searches project docs, research papers, and notes.
- `ctx query "<question>" --debug --cwd <repo>` includes ranking and section details.
- `ctx path <label>` prints the local path for pinned source repos.
- `ctx show` inspects the project manifest.
- `ctx list --project` shows linked resources.

Source repos are explored on disk. Docs, research papers, and notes are returned as cited context blocks. Memories are recalled separately through `ctx recall`.
<!-- ctx:end -->

# Destructive deletion safety

- Never delete a folder or directory without the user's explicit approval, even when deletion appears implied by the task.
- Treat any bulk, recursive, or otherwise broad deletion as risky and require explicit user approval immediately before performing it. This includes commands or tools such as `rm -r`, `rm -rf`, `find -delete`, `git clean`, cleanup scripts, and deleting multiple files at once.
- Before requesting approval, state exactly which paths will be deleted and why. Do not expand the deletion beyond the approved paths.
- When approval has not been given, use non-destructive alternatives where possible, such as moving items to a temporary or quarantine location, or leave them in place and report them to the user.

# Research workflow

- Treat `ctx` as this project's research index and query layer. Do not leave material research only in chat history.
- Write first-party research reports under `docs/research/` and keep observations clearly dated.
- Add each report to ctx as a local notes resource with `ctx add file://<absolute-path> --label <label> --reason <reason> --cwd <repo>`, then link it with `ctx link <label> --cwd <repo>`.
- After editing a linked report, refresh it with `ctx update <label> --force --cwd <repo>` and run `ctx sync --reindex --cwd <repo>`.
- Verify important reports with a label-scoped `ctx query` before relying on them.
- Link authoritative external sources as ctx docs resources so first-party conclusions remain traceable to their evidence.

# Judge.me integration invariants

- Treat `JUDGE_ME_WIDGETS` as a coverage roadmap, not an implementation registry. At present only `LegacyReviewWidget` is implemented. Do not describe the catalog as supported until each entry has a data adapter, public component, tests/fixtures, and browser verification.
- Judge.me's public `product_review` endpoint returns legacy DOM even when dashboard settings say the new Review Widget is enabled. The legacy adapter must set `review_widget_revamp_enabled` to `false`; removing that override makes the current loader skip the returned markup.
- Judge.me's browser runtime mutates `window.jdgm`, `window.jdgmSettings`, and widget DOM. Load its script once per document, preserve its enriched settings across SPA navigation/HMR, and do not initialize two Shopify stores in one document.
- Keep Judge.me-owned SSR markup outside streamed `Suspense` until the runtime/hydration race has a tested lifecycle solution. The current Hydrogen route intentionally awaits the widget payload before returning loader data.
- The consuming app owns CSP. A custom Hydrogen `scriptSrc` must retain `'self'`; local Vite requires `workerSrc: ["'self'", 'blob:']`. Keep `blob:` out of `scriptSrc`, and update the host allowlist when a Judge.me interaction introduces a new CDN/API/media/frame origin.
- Judge.me may create `javascript:void(0)` links after initialization. Keep the component-scoped mutation sanitizer unless the runtime stops emitting them or the links are replaced with an equivalent CSP-safe event contract.
- The public Widget API token may be used for public reads. Never serialize the private token through loaders, providers, browser bundles, logs, fixtures, ctx, or committed files.
- Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` for code changes. For runtime/CSP changes, also do a clean Brave product-page reload and exercise at least one interactive path; static checks cannot validate Judge.me's current third-party deployment.
