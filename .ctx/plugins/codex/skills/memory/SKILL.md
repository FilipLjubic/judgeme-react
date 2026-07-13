---
name: memory
description: Use local ctx memory, linked docs, and linked source before answering repo-specific questions.
---

Use `ctx show --cwd <repo>` to inspect linked ctx resources for non-trivial repo work, then use `ctx query`, `ctx path`, or `ctx sync` when those resources can establish relevant facts. Treat ctx and memory as supporting evidence; verify behavior against live source code before making claims or edits.

Before final responses on non-trivial work, run a visible memory writeback check. If the turn established a durable preference, decision, workflow, root cause, verification rule, or reusable lesson, store it with `ctx remember`; use `--suggested` for plausible inferences. Skip secrets, one-off chatter, unresolved guesses, and current/latest facts unless they are dated observations for audit only.

This skill is bundled with the `ctx-memory` hooks, which inject bounded grounding guidance at prompt time.
