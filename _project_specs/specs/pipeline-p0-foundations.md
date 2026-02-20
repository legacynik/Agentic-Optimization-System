---
phase: P0
name: "Pipeline Foundations — Webhook, Criteria Taxonomy, LLM Rotation, Snapshot"
status: pending
created: 2026-02-19
last_updated: 2026-02-19
last_tested: null
tested_by: null
pending_items: 4
blockers: []
source: docs/plans/2026-02-19-pipeline-architecture-decisions.md
---

# P0: Pipeline Foundations

> Four foundational changes that enable the entire multi-agent evaluation/optimization pipeline.

## Overview

This spec implements the 4 P0 decisions from the brainstorming session. These are prerequisites for all P1/P2/P3 features (analyzer flag, persona validator, A/B testing, optimizer modes). Each item is independently deployable but ordered for minimal migration risk.

**Execution order**: T1 → T2 → T3 → T4 (T3/T4 can run in parallel after T2).

---

## T1: Evaluator Hybrid Webhook Endpoint

> Single n8n webhook endpoint that handles both Test Runner callbacks and manual re-evaluations. The evaluator doesn't know who called it — it just receives an evaluation_id and processes it.

### Requirements

- [ ] REQ-T1.1: n8n evaluator workflow receives trigger via single webhook endpoint
- [ ] REQ-T1.2: Payload contract: `{ evaluation_id, test_run_id, evaluator_config_id, triggered_by }` — same for runner and re-eval. `triggered_by` is audit-only metadata; evaluator NEVER branches on it
- [ ] REQ-T1.3: Dashboard API `POST /api/evaluations/re-evaluate` sends same payload format as Test Runner
- [ ] REQ-T1.4: n8n workflow validates payload, fetches evaluation + config from DB, processes

### Current State

- Re-evaluate endpoint (`app/api/evaluations/re-evaluate/route.ts`) already creates evaluation row and calls n8n webhook
- Test Runner calls evaluator via a separate mechanism (webhook URL in `workflow_configs`)
- Evaluator workflow (`202JEX5zm3VlrUT8`) queries `evaluations WHERE status='pending'`

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| n8n evaluator webhook | Workflow `202JEX5zm3VlrUT8` | Replace "Get Pending Evaluations" query with direct `evaluation_id` lookup from webhook payload |
| Re-evaluate API | `app/api/evaluations/re-evaluate/route.ts` | Ensure payload includes `evaluation_id`, `test_run_id`, `evaluator_config_id`, `triggered_by: 'manual'` |
| Test Runner callback | n8n workflow `XmpBhcUxsRpxAYPN` | After battles complete, POST same payload format with `triggered_by: 'auto'` |
| workflow_configs | DB seed/config | Single evaluator webhook URL used by both runner and API |

### Acceptance Criteria

```gherkin
GIVEN a completed test run with battles
WHEN the Test Runner POSTs to evaluator webhook with { evaluation_id, test_run_id, evaluator_config_id, triggered_by: 'auto' }
THEN evaluator processes that specific evaluation and writes battle_evaluations

GIVEN a completed test run
WHEN user clicks Re-evaluate in dashboard
THEN API creates evaluation row and POSTs same payload format with triggered_by: 'manual'
AND evaluator processes identically
```

- [ ] AC-T1.1: Single webhook URL in workflow_configs for evaluator
- [ ] AC-T1.2: Runner trigger and re-evaluate trigger produce identical evaluation results
- [ ] AC-T1.3: Evaluator workflow processes by `evaluation_id`, not by querying pending rows

---

## T2: Criteria Core + Domain Taxonomy

> Restructure `evaluator_configs.criteria` from flat array to `{ core, domain, weights }` format. 6 universal core criteria + N domain-specific per prompt type.

### Requirements

- [ ] REQ-T2.1: New criteria JSON format: `{ core: string[], domain: string[], weights: Record<string, number> }`
- [ ] REQ-T2.2: DB migration adds `criteria_definitions` JSONB column to `evaluator_configs` (or restructure existing `criteria`)
- [ ] REQ-T2.3: n8n evaluator merges core+domain, JOINs with `criteria_definitions` for scoring_guide, applies weighted mean: `SUM(score_i * weight_i) / SUM(weight_i)` (default weight: 1.0)
- [ ] REQ-T2.4: Existing evaluator config migrated to new format (9 criteria split into 6 core + 3 domain)
- [ ] REQ-T2.5: Dashboard UI criteria editor supports core/domain sections
- [ ] REQ-T2.6: Criteria master definitions table/reference for reusable criteria across configs
- [ ] REQ-T2.7: Criteria name resolution: each name in core/domain MUST exist in `criteria_definitions`. Unknown names → evaluation FAILS with explicit error, not silently ignored
- [ ] REQ-T2.8: Migration includes `criteria_legacy JSONB` backup column for rollback safety (drop after 2 weeks)

### New Criteria Format

```json
{
  "core": [
    "brevita_risposte",
    "una_domanda_per_turno",
    "mantenimento_flusso",
    "tono_naturale",
    "gestione_chiusura",
    "adattamento_persona"
  ],
  "domain": [
    "apertura_cornice",
    "discovery_socratica",
    "pitch_proposta",
    "gestione_obiezioni",
    "chiusura_appuntamento"
  ],
  "weights": {
    "discovery_socratica": 1.5,
    "gestione_obiezioni": 1.5
  }
}
```

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| DB migration | `supabase/migrations/` | New migration: add `criteria_definitions` table for master criteria catalog; alter `evaluator_configs.criteria` format |
| Criteria catalog table | New migration | `criteria_definitions(id, name, description, scoring_guide, category: 'core'\|'domain', domain_type, weight_default)` |
| Data migration | Same migration | Transform existing flat array → core+domain format; seed 6 core + 5 outbound_sales domain criteria |
| n8n evaluator | Workflow `202JEX5zm3VlrUT8` | "Build Dynamic System Prompt" node reads `core` + `domain` arrays, merges, applies weights |
| API configs | `app/api/evaluator-configs/route.ts` | Validate new criteria format on POST/PUT |
| UI criteria editor | `components/` evaluator pages | Two-section editor: core (locked defaults) + domain (editable per config) |

### Acceptance Criteria

```gherkin
GIVEN a new evaluator config
WHEN user creates config for "outbound-sales" prompt
THEN criteria includes 6 core (auto-added) + user-selected domain criteria
AND weights are configurable per criterion

GIVEN existing evaluator config with flat 9-criteria array
WHEN migration runs
THEN criteria is restructured to { core: [...], domain: [...], weights: {...} }
AND no data loss occurs
```

- [ ] AC-T2.1: `criteria_definitions` table seeded with 6 core + 5 outbound_sales + 4 outbound_cold criteria
- [ ] AC-T2.2: Existing config migrated without breaking evaluator workflow
- [ ] AC-T2.3: n8n evaluator correctly merges core+domain and applies weights to final score
- [ ] AC-T2.4: API validates `{ core, domain, weights }` format on create/update

---

## T3: LLM Model as Expression (Gemini Rotation)

> Switch evaluator Judge Agent and Analyzer to use expression-based model selection: `={{ $json.llm_config.model }}`. **Scope: intra-provider rotation only** (e.g., gemini-2.5-flash ↔ gemini-2.0-flash). Cross-provider (Google → Anthropic) requires credential change in n8n — out of scope for T3.

### Requirements

- [ ] REQ-T3.1: `evaluator_configs` or `workflow_configs` stores `llm_config` JSON with model, provider, fallback
- [ ] REQ-T3.2: n8n Judge Agent node uses expression `={{ $json.llm_config.model }}` instead of hardcoded model
- [ ] REQ-T3.3: Default model: `gemini-2.5-flash` (Google, $300 credit budget)
- [ ] REQ-T3.4: Fallback logic: n8n Code node try/catch wraps LLM call, retries with fallback model on 429/500/timeout >30s (max 2 retries, 5s backoff)
- [ ] REQ-T3.5: Dashboard UI shows which model was used per evaluation
- [ ] REQ-T3.6: `evaluations.tokens_used INTEGER` — record token count for budget tracking
- [ ] REQ-T3.7: Scope limited to intra-Google-provider rotation; cross-provider requires separate spec

### LLM Config Format

```json
{
  "llm_config": {
    "judge": {
      "model": "gemini-2.5-flash",
      "provider": "google",
      "fallback": "gemini-2.0-flash"
    },
    "analyzer": {
      "model": "gemini-2.5-flash",
      "provider": "google",
      "fallback": "gemini-2.0-flash"
    }
  }
}
```

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| DB migration | `supabase/migrations/` | Add `llm_config JSONB` column to `evaluator_configs`; seed default Gemini config |
| n8n Judge node | Workflow `202JEX5zm3VlrUT8` | Change model field from hardcoded to `={{ $json.llm_config.judge.model }}` |
| n8n Analyzer node | Same workflow | Change model to `={{ $json.llm_config.analyzer.model }}` |
| n8n config fetch | Same workflow | Include `llm_config` in evaluator_config fetch query |
| API configs | `app/api/evaluator-configs/` | Include `llm_config` in GET/POST/PUT responses |
| evaluations table | Migration | Add `model_used VARCHAR(100)` + `tokens_used INTEGER` — record actual model and token count |
| n8n fallback logic | Workflow `202JEX5zm3VlrUT8` | Code node wraps LLM call: try primary → catch → retry with fallback model |

### Acceptance Criteria

```gherkin
GIVEN evaluator_config with llm_config.judge.model = "gemini-2.5-flash"
WHEN evaluation runs
THEN Judge Agent uses gemini-2.5-flash
AND evaluations.model_used records "gemini-2.5-flash"

GIVEN llm_config.judge.model is changed to "gemini-2.0-flash"
WHEN next evaluation runs
THEN Judge uses gemini-2.0-flash without any n8n workflow change

GIVEN primary model returns 429 rate limit error
WHEN fallback is "gemini-2.0-flash"
THEN Code node retries with fallback model after 5s
AND evaluations.model_used records "gemini-2.0-flash (fallback)"
```

- [ ] AC-T3.1: n8n Judge node model field is expression, not hardcoded
- [ ] AC-T3.2: `evaluations.model_used` populated after every evaluation
- [ ] AC-T3.3: Changing `llm_config` in DB changes model used — no n8n edits needed
- [ ] AC-T3.4: Default seed config uses gemini-2.5-flash

---

## T4: Criteria Snapshot in Evaluations

> Defense against mid-evaluation config changes (Chaos Scenario #6). Each evaluation captures a frozen snapshot of the criteria used, ensuring reproducibility.

### Requirements

- [ ] REQ-T4.1: `evaluations` table gets `criteria_snapshot JSONB` column
- [ ] REQ-T4.2: When evaluation is created, snapshot the full criteria from evaluator_config at that moment
- [ ] REQ-T4.3: n8n evaluator uses `criteria_snapshot` from evaluation row, NOT live evaluator_config criteria
- [ ] REQ-T4.4: Dashboard compare view uses snapshots to explain criteria differences between evaluations
- [ ] REQ-T4.5: API `POST /evaluations/re-evaluate` captures snapshot at creation time

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| DB migration | `supabase/migrations/` | Add `criteria_snapshot JSONB` to `evaluations`; add `llm_config_snapshot JSONB` (capture T3 config too) |
| Re-evaluate API | `app/api/evaluations/re-evaluate/route.ts` | On insert, copy `evaluator_configs.criteria` + `llm_config` into evaluation snapshots |
| n8n evaluator | Workflow `202JEX5zm3VlrUT8` | Read criteria from `evaluations.criteria_snapshot` instead of `evaluator_configs.criteria` |
| Compare API | `app/api/evaluations/[id]/compare/[otherId]/route.ts` | Use snapshots for delta calculation |
| Test Runner | n8n workflow `XmpBhcUxsRpxAYPN` | When creating evaluation row pre-trigger, include snapshot |

### Acceptance Criteria

```gherkin
GIVEN an evaluation is created
WHEN evaluator_config.criteria is later modified
THEN the evaluation's criteria_snapshot remains unchanged
AND evaluator processes using the snapshot, not live config

GIVEN two evaluations with different criteria_snapshots
WHEN user compares them in dashboard
THEN diff shows which criteria changed between evaluations
```

- [ ] AC-T4.1: `evaluations.criteria_snapshot` populated on every new evaluation
- [ ] AC-T4.2: n8n evaluator reads from snapshot column, not config table
- [ ] AC-T4.3: Modifying evaluator_config after evaluation start has zero impact on running evaluation
- [ ] AC-T4.4: Compare API returns criteria diff from snapshots

---

## Implementation Reference

| Task | Components | Estimated Scope |
|------|-----------|-----------------|
| T1: Hybrid Webhook | 1 n8n workflow + 1 API route + 1 n8n runner update | Small — payload normalization |
| T2: Criteria Taxonomy | 1 migration + 1 new table + n8n node update + API validation + UI editor | Medium — most work is data migration + UI |
| T3: LLM Expression | 1 migration + 2 n8n node field changes + API update | Small — mostly config |
| T4: Criteria Snapshot | 1 migration + 2 API routes + 1 n8n query change | Small-Medium — query path change |

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Evaluator multi-prompt (E1-E5) | Prerequisite | Done |
| n8n evaluator workflow `202JEX5zm3VlrUT8` | Modified | Active |
| n8n Test Runner `XmpBhcUxsRpxAYPN` | Modified (T1) | Active |
| Supabase schema | Migration | Active |

## Manual Test Script

### Prerequisites
- [ ] Supabase migrations applied
- [ ] n8n workflows updated
- [ ] At least 1 completed test run with battles in DB

### Test T1: Hybrid Webhook
```
1. Run a test via Test Runner → verify evaluator triggers with new payload
2. Click Re-evaluate in dashboard → verify same evaluator processes
3. Check evaluations table: triggered_by correctly set ('auto' vs 'manual')

Expected: Both paths produce identical evaluation quality
Status: NOT TESTED
```

### Test T2: Criteria Taxonomy
```
1. Check criteria_definitions table seeded with 6 core + domain criteria
2. Create new evaluator config → verify core auto-included
3. Run evaluation → verify all core+domain criteria scored
4. Check weighted score calculation: criterion with weight 1.5 has more impact

Expected: Scores reflect weights; core criteria always present
Status: NOT TESTED
```

### Test T3: LLM Model Rotation
```
1. Run evaluation → verify model_used = "gemini-2.5-flash"
2. Change llm_config in DB to different model
3. Run evaluation → verify model_used reflects new model
4. No n8n workflow changes needed between steps 1-3

Expected: Model changes via DB only, zero n8n edits
Status: NOT TESTED
```

### Test T4: Criteria Snapshot
```
1. Create evaluation → check criteria_snapshot populated
2. Modify evaluator_config.criteria (add a criterion)
3. Check running/completed evaluation still uses original snapshot
4. Compare two evaluations → diff shows criteria changes

Expected: Snapshot is immutable after creation
Status: NOT TESTED
```

## Rollback Strategy

| Task | Rollback | Risk |
|------|----------|------|
| T1 | Revert n8n workflow to previous version (n8n version history). API works with old payload. | Low |
| T2 | `criteria_legacy` backup column preserves old format. Migration has DOWN section. | Medium — test on staging first |
| T3 | Revert n8n model field to hardcoded. `llm_config` is nullable, old configs work without it. | Low |
| T4 | `criteria_snapshot` is nullable. n8n query: `COALESCE(e.criteria_snapshot, ec.criteria)` for backwards compat. | Low |

**Rule:** All migrations MUST have a DOWN section. Backup DB before applying.

## Notes

- **Guiding principle**: "Workflow generici, configurazione specifica" — n8n workflows are pure engines, all domain config lives in DB
- T2 criteria_definitions table enables future self-serve criteria creation in UI
- T3 uses Google Gemini for next ~80 days ($300 credit budget), then rotate to cheapest provider
- T4 snapshot also captures `llm_config` for full reproducibility
- All migrations are additive (new columns/tables) — zero breaking changes to existing data

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-02-19 | Created spec from brainstorming decisions | claude |

---

*Source: docs/plans/2026-02-19-pipeline-architecture-decisions.md (P0 items)*
