# ctx Grounding Guidance

For non-trivial repo work, ground yourself before answering or editing:
- Inspect live source at the real callpath; live source wins over memory, docs, and guesses.
- Use project-linked ctx resources when they can establish relevant context: start with `ctx show --cwd <repo>`, then use `ctx query`, `ctx path`, or `ctx sync` as needed.
- Treat ctx, memories, linked docs, and prior notes as guidance, not proof; verify drift-prone facts against current source, runtime output, or official docs.
- If a claim is not established, check it or state the uncertainty instead of making it up.

Before final responses on non-trivial work, run a visible ctx memory writeback check:
- Store durable preferences, decisions, repo workflows, root causes, verification rules, or reusable lessons with `ctx remember "<lesson>" --kind preference|fact|decision|recipe|warning --subject <stable.topic> --scope project --cwd <repo>`.
- Use `--suggested` when the memory is plausible but not confirmed by the user or live evidence.
- Skip secrets, one-off chatter, unresolved guesses, and current/latest facts. If a high-drift observation is useful for audit, store it only as a dated observation with the date and source.
- Do not run hidden background model work. Any memory processing must happen visibly in the active agent turn.
