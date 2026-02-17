---
description: Quick checkpoint — save progress without ending session
---

# Session Update

Lightweight checkpoint. Intentionally minimal.

## Steps

1. Scan recent work in conversation
2. Append timestamped entry to `current-state.md` (1-3 bullets)
3. If a decision was made → append to `decisions.md`
4. If material state changed → update active task and progress
5. **Always** append to daily recap `_project_specs/session/daily/YYYY-MM-DD.md`
   - If file doesn't exist → create it with `# Daily Recap — YYYY-MM-DD`
   - Append under `## Done` section with `### Session N` sub-header
   - Include: what was done (1-3 bullets with [x]), files changed, decisions made

## Output

```
Checkpointed: [2-5 word description]
```

Nothing more. This is not `/session-end`.
