# ctx Hooks

These scripts ingest hook JSON from stdin into local ctx storage and may return bounded hook context for prompt-time grounding. They do not call model providers, spawn background harnesses, or apply memory jobs.

Edit `guidance.md` to tune the durable reminder injected by prompt/session hooks.

After wiring a host hook, run memory work visibly:

```sh
ctx memory l1 enqueue --cwd <repo>
ctx memory process --cwd <repo>
ctx memory job apply <job-id> <result.json> --cwd <repo>
```
