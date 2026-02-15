<!--
CHECKPOINT RULES (from session-management skill):
- Quick update: After any todo completion
- Full checkpoint: Every ~20 tool calls or decisions
- Archive: End of session or major feature complete
-->

# Current Session State

*Last updated: 2026-02-16*

## Active Task
Project index reorganization

## Current Status
- **Phase**: housekeeping
- **Progress**: Complete
- **Blockers**: None

## Completed This Session

- [x] Archived old PRD-v3-index.md → `_project_specs/archive/`
- [x] Archived old PRD-n8n-integration-v2.md (102KB) → `_project_specs/archive/`
- [x] Created new `_project_specs/PROJECT-INDEX.md` based on actual spec evolution
- [x] Updated CLAUDE.md references (PRD-v3 → PROJECT-INDEX)

## Pending Issues

| Task | Priority | Notes |
|------|----------|-------|
| Evaluator Multi-Prompt E2-E5 | HIGH | API, n8n, UI — see PROJECT-INDEX |
| Evaluator Migration (n8n workflow) | HIGH | 4 nodi da modificare |
| Phase 5 n8n (4 items) | MEDIUM | Battle Agent partial |
| Agentic Refactor v2 | MEDIUM | Agent Health Monitor |
| Fix Playwright tests | MEDIUM | 5 failing, 8 skipped |
| Remove .backup files | LOW | dashboard-overview.tsx.backup, filter-bar.tsx.backup |
| Add unit tests | LOW | Currently 0% |
| Setup CI/CD | LOW | No GitHub Actions |

## Key Context
- Session management: 1 skill (superpowers plugin) + 3 lightweight commands
- Docs: `docs/frontend.md`, `docs/backend.md`, `docs/n8n.md`
- CLAUDE.md is lean (~490 lines), no more session rule duplication
- Inspired by Marvin Template pattern (command-driven, lightweight checkpoints)

## Resume Instructions

```
LAST SESSION: 2026-02-16 - Project Index Reorganization

WHAT WAS DONE:
- Archived old PRD-v3-index.md and PRD-n8n-integration-v2.md
- Created new PROJECT-INDEX.md reflecting actual spec evolution
- Updated all CLAUDE.md references

NEXT STEPS (recommended order):
1. Evaluator Multi-Prompt E2 (API endpoints) — can run parallel with E3
2. Evaluator Migration (n8n workflow fix) — or absorb into E3
3. Phase 5 n8n (4 pending requirements)
4. Agentic Refactor v2 (Agent Health Monitor)
```

---

## Session History

| Date | File | Topic |
|------|------|-------|
| 2026-02-13 | (this session) | DevKit Alignment — Docs + Session Commands |
| 2026-02-12 | (previous) | Project Documentation & Coherence Audit |
| 2026-01-31 | `archive/2026-01-31-ui-refactor-playwright-tests.md` | UI Refactor + Playwright |
| 2026-01-30 | `archive/2026-01-30-playwright-e2e-tests.md` | Playwright E2E Tests |
