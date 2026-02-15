---
description: End session — archive, clean state, handoff
---

# Session End

Save everything and create clean handoff.

## Steps

1. **Archive**: Create `_project_specs/session/archive/YYYY-MM-DD-topic.md` with:
   - Summary (1 paragraph)
   - Tasks completed (checkbox list)
   - Key decisions made (references to decisions.md)
   - Code changes (file table)
   - Open items carried forward
   - Session stats (duration, files modified)

2. **Clean state**: Update `current-state.md` with:
   - Active Task = "Ready for next session"
   - Clear pending issues with priorities
   - Write specific resume instructions

3. **Verify**: Check decisions.md has all decisions from this session

4. **Confirm**: Show `Archived to archive/YYYY-MM-DD-topic.md` with quick recap
