---
description: Start a work session — load context, briefing, continue
---

# Session Start

Load context and present briefing.

## Steps

1. Read `_project_specs/session/current-state.md`
2. Read last 3 entries from `_project_specs/session/decisions.md`
3. Scan `_project_specs/todos/active.md` for pending work
4. Glance at `_project_specs/session/code-landmarks.md` for orientation

## Output

Present a concise briefing:

```
Resuming from: [active task from current-state.md]
Phase: [phase] | Progress: [progress]
Blockers: [any blockers]

Next steps:
1. [from resume instructions]
2. [...]

Pending decisions: [any open questions from decisions.md]
```

Then ask: "Continue with these, or different priority?"
