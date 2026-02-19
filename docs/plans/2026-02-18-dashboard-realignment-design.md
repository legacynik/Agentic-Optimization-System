# Dashboard Realignment Design

**Date**: 2026-02-18
**Status**: Phases 1-3 Complete (2026-02-19)
**Context**: Deep architectural audit revealed 3 pages DOWN (Dashboard, Conversations, Executive) due to dependency on dead `personas_performance` view reading from empty `old_*` tables. Plus 5 critical bugs across the stack.

---

## Problem Statement

The frontend was built against the old schema (`old_prompts`, `old_conversations`, etc.) which has been superseded by the new schema (`test_runs`, `battle_results`, `battle_evaluations`, `evaluations`, `evaluator_configs`). The old tables are empty, making 3 pages non-functional. Additionally, several flows have bugs that break core functionality.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Generic base + dynamic KPI from evaluator criteria | Flexible across prompt types |
| Navigation | Hub + Detail pattern | Clean information hierarchy |
| Structure | 4 hubs: Dashboard, Testing, Config, Intelligence | Maps to user workflows |
| Data source | New schema only, zero `old_*` dependencies | Old tables are empty and deprecated |

---

## Information Architecture

```
/                              Dashboard Home (REWRITE)
├── /testing                   Testing Hub
│   ├── /testing/launcher      Test Launcher (existing, fix bugs)
│   ├── /testing/runs          Test Runs List (NEW)
│   ├── /testing/runs/[id]     Test Run Detail (existing, fix re-evaluate)
│   └── /testing/conversations Conversations Explorer (REWRITE)
├── /config                    Configuration Hub
│   ├── /config/prompts        Prompt Versions (existing)
│   ├── /config/evaluators     Evaluator Configs (existing)
│   ├── /config/personas       Personas (existing, fix generation)
│   └── /config/settings       Settings (existing)
└── /intelligence              Agent Intelligence (EVOLUTION of /agentic)
    ├── /intelligence/health   Agent Health Monitor
    ├── /intelligence/compare  Cross-run Comparison
    └── /intelligence/reports  Executive Reports (REWRITE)
```

## Data Flow

All pages read from the **new schema** exclusively:

### Dashboard Home
- `test_runs` -> run counts, trend, latest runs
- `battle_results` -> outcome distribution, avg turns
- `battle_evaluations` (via promoted evaluation) -> scores, criteria breakdown
- `evaluator_configs.criteria` -> dynamic KPI names

### Testing Hub
- `test_runs` + `battle_results` + `evaluations` -> run list with stats
- `battle_evaluations` -> per-battle scores in detail view
- `battle_results.transcript` -> conversation viewer

### Configuration Hub
- `prompts` + `prompt_versions` -> CRUD (existing)
- `evaluator_configs` -> CRUD + promote (existing)
- `personas` -> CRUD + n8n generation (fix needed)
- `workflow_configs` -> settings (existing)

### Intelligence Hub
- Cross-run aggregations: score trends, failure patterns
- `test_runs.analysis_report` -> LLM-generated insights
- `battle_evaluations.criteria_scores` -> per-criteria heatmap

---

## Pages to Rewrite

### Dashboard Home (`/`)

**Components**:
- KPI Cards: total runs, avg score (promoted eval), success rate, avg turns
- Trend Chart: score over time (Recharts, battle_evaluations grouped by test_run.started_at)
- Recent Runs Table: last 10 test_runs with status, score, outcome counts
- Criteria Radar: avg per-criteria scores from latest run (dynamic from evaluator_configs.criteria)

**Queries**: Direct Supabase queries on test_runs, battle_results, battle_evaluations, evaluations. No `personas_performance` view.

### Conversations Explorer (`/testing/conversations`)

**Components**:
- Filter Bar: test_run selector, persona filter, outcome filter, score range
- Conversations List: battle_results JOIN battle_evaluations (promoted)
- Detail Panel: transcript viewer + evaluation criteria breakdown

**Queries**: battle_results JOIN personas JOIN battle_evaluations (via promoted evaluation_id).

### Executive Reports (`/intelligence/reports`)

**Components**:
- Cross-run aggregation tables
- Export PDF/CSV
- Run comparison mode

**Queries**: test_runs + evaluations + battle_evaluations aggregated.

---

## Critical Bug Fixes

| # | Bug | Location | Fix |
|---|-----|----------|-----|
| 1 | normalizeTestRun receives API wrapper | `hooks/use-test-run-status.ts:91` | Pass `raw.data` not `raw` |
| 2 | Re-evaluate creates pending eval but never triggers n8n | `app/api/evaluations/route.ts` | POST must call n8n evaluator webhook |
| 3 | n8n Evaluator ignores is_promoted flag | Evaluator workflow "Fetch Config" node | Add `WHERE is_promoted = true` |
| 4 | Personas page passes empty promptName | PersonaWorkshop component | Fix prop drilling |
| 5 | Dead orphaned components | `GeneratePersonasButton`, `PersonaGenerator` | Delete files |

---

## What Stays Unchanged

- `/config/prompts` (existing, route move only)
- `/config/evaluators` (existing, route move only)
- `/config/settings` (existing, route move only)
- `/testing/launcher` (existing, fix normalizeTestRun)
- `/testing/runs/[id]` (existing, fix re-evaluate trigger)
- All 4 n8n workflows (fix is_promoted query only)

---

## Implementation Phases

### Phase 1: Fix Critical Bugs (unblock existing features)
1. Fix normalizeTestRun bug
2. Fix re-evaluate n8n trigger
3. Fix n8n is_promoted query
4. Fix personas generation flow
5. Delete dead components

### Phase 2: Rewrite DOWN Pages (restore core functionality)
6. Rewrite Dashboard Home on new schema
7. Rewrite Conversations Explorer on new schema
8. Create Testing Hub with runs list

### Phase 3: Reorganize Navigation (new structure)
9. New sidebar navigation layout (4 hubs)
10. Move existing pages to new routes
11. Add redirects from old routes

### Phase 4: Intelligence Hub (enhance)
12. Evolve /agentic into Intelligence Hub
13. Rewrite Executive Reports
14. Add cross-run comparison

---

## Estimated Scope

- Phase 1: ~2-3 hours (5 targeted fixes)
- Phase 2: ~8-10 hours (3 page rewrites)
- Phase 3: ~3-4 hours (navigation restructure)
- Phase 4: ~6-8 hours (intelligence features)

Total: ~20-25 hours across 4 phases
