<!--
CHECKPOINT RULES (from session-management skill):
- Quick update: After any todo completion
- Full checkpoint: Every ~20 tool calls or decisions
- Archive: End of session or major feature complete
-->

# Current Session State

*Last updated: 2026-02-16T18*

## Active Task
E2: API Endpoints evaluator-configs + evaluations — **DONE (bug fixes)**

## Current Status
- **Phase**: E2 completato — routes già esistevano, fixati bug critici
- **Progress**: 7/7 routes funzionanti, build OK
- **Blockers**: None

## Completed This Session

- [x] **E2 Review**: Tutte 7 API routes già esistevano ma con bug critici
- [x] **FIX**: `prompt_id` → `prompt_version_id` in 3 API routes (colonna rinominata in migration 010)
- [x] **FIX**: Query `prompts` table → `prompt_versions` (tabella `prompts` non esiste)
- [x] **FIX**: Async `params` in 2 evaluation routes (Next.js 15 pattern)
- [x] **FIX**: Frontend components (3 file) allineati a `prompt_version_id`
- [x] **Build**: `pnpm build` passa senza errori

## Previous Session Completed

- [x] Repo review (score 6.8/10), 82 files committed + pushed (`ac474bb`)
- [x] n8n Evaluator workflow: 5/7 nodes fixed
- [x] RUNNER fix: `Run Evaluator` node corretto

## Pending Issues

| Task | Priority | Notes |
|------|----------|-------|
| ~~E2: API Endpoints~~ | ~~HIGH~~ | ~~DONE — bug fixes applied~~ |
| E3: n8n Evaluator Workflow Update | HIGH | 5 nodi da modificare per schema dinamico |
| E4: UI Evaluator Management | HIGH | Pagina /evaluators con CRUD (già scaffold) |
| E5: UI Re-evaluate + Compare | MEDIUM | Defer post-lancio |
| REQ-5.9: Status 'completed' in RUNNER | HIGH | 30min fix |
| Phase 5 n8n (4 items) | MEDIUM | Battle Agent partial |
| Agentic Refactor v2 | MEDIUM | Agent Health Monitor |
| Fix Playwright tests | MEDIUM | 5 failing, 8 skipped |
| Add unit tests | LOW | Currently 0% |
| Setup CI/CD | LOW | No GitHub Actions |

## Key Context
- DB column `prompt_id` rinominato a `prompt_version_id` in migration 010
- Non esiste tabella `prompts`, solo `prompt_versions`
- Evaluator routes: tutte usano `apiSuccess`/`apiError` da `lib/api-response.ts`
- Frontend `/evaluators` page già ha CRUD base funzionante

## Resume Instructions

```
LAST SESSION: 2026-02-16 - E2 Bug Fixes

WHAT WAS DONE:
- Fixed critical prompt_id → prompt_version_id mismatch in all evaluator API routes
- Fixed prompts → prompt_versions table references
- Fixed Next.js 15 async params in 2 evaluation routes
- Fixed 3 frontend components to match new field names
- Build passes cleanly

NEXT STEPS (recommended order):
1. E3: n8n Evaluator Workflow Update (criteri dinamici)
2. REQ-5.9: Status 'completed' nel Test RUNNER
3. E4: UI Evaluator Management (polish)
4. Test end-to-end completo
```

---

## Session History

| Date | File | Topic |
|------|------|-------|
| 2026-02-13 | (this session) | DevKit Alignment — Docs + Session Commands |
| 2026-02-12 | (previous) | Project Documentation & Coherence Audit |
| 2026-01-31 | `archive/2026-01-31-ui-refactor-playwright-tests.md` | UI Refactor + Playwright |
| 2026-01-30 | `archive/2026-01-30-playwright-e2e-tests.md` | Playwright E2E Tests |
