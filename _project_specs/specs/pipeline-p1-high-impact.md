---
phase: P1
name: "Pipeline High Impact — Analyzer Flag, Persona Validator, Parse Resilience, Callback Retry"
status: pending
created: 2026-02-20
last_updated: 2026-02-20
last_tested: null
tested_by: null
pending_items: 4
blockers: []
source: docs/plans/2026-02-19-pipeline-architecture-decisions.md
---

# P1: Pipeline High Impact

> Four high-impact improvements that build on P0 foundations: optional analyzer, persona quality validation, parse error resilience, and callback retry with polling fallback.

## Overview

P0 laid the groundwork (hybrid webhook, criteria taxonomy, LLM rotation, snapshots). P1 adds the features that make the pipeline robust and production-ready. Each task is independently deployable.

**Execution order**: T5 first (depends on P0-T1/T2), then T6/T7/T8 in parallel.

**Cross-reference**: Brainstorming items P3/P4 (#5), P11 (#6), Chaos #4 (#7), Chaos #3 (#8).

---

## T5: Analyzer as Optional Flag

> Add `run_analyzer: true/false` to evaluation trigger payload. When true, evaluator runs the post-loop LLM Analyzer after scoring all battles. When false, skip analysis. Default: true.

### Requirements

- [ ] REQ-T5.1: Evaluator webhook payload accepts `run_analyzer` boolean (default: true)
- [ ] REQ-T5.2: n8n evaluator workflow: after battle loop completes, IF `run_analyzer === true` → run PG Aggregate + LLM Analyzer + Save Report. IF false → skip to Update Evaluation Complete
- [ ] REQ-T5.3: Re-evaluate API (`POST /api/evaluations/re-evaluate`) accepts `run_analyzer` param, passes to n8n
- [ ] REQ-T5.4: Test Runner default: `run_analyzer: true` (always analyze on first run)
- [ ] REQ-T5.5: Dashboard UI: re-evaluate modal has "Include analysis" checkbox (default checked)
- [ ] REQ-T5.6: `evaluations` table: add `has_analysis BOOLEAN DEFAULT false` — set to true when analyzer runs

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| n8n evaluator | Workflow `202JEX5zm3VlrUT8` | Add IF node after battle loop: check `$json.run_analyzer`. True → existing analyzer path. False → skip to completion |
| Re-evaluate API | `app/api/evaluations/re-evaluate/route.ts` | Accept `run_analyzer` in body, include in webhook payload |
| Test Runner | n8n `XmpBhcUxsRpxAYPN` | Include `run_analyzer: true` in evaluator trigger payload |
| DB migration | `supabase/migrations/014_*.sql` | Add `has_analysis BOOLEAN DEFAULT false` to evaluations |
| Re-evaluate modal | `components/agentic/` | Add checkbox for "Include analysis" |

### Acceptance Criteria

```gherkin
GIVEN a completed test run
WHEN re-evaluate is triggered with run_analyzer: false
THEN evaluator scores all battles but skips LLM Analyzer
AND evaluations.has_analysis = false

GIVEN a completed test run
WHEN re-evaluate is triggered with run_analyzer: true (default)
THEN evaluator scores battles AND runs LLM Analyzer
AND evaluations.has_analysis = true
AND test_runs.analysis_report is updated
```

- [ ] AC-T5.1: n8n evaluator skips analyzer when `run_analyzer: false`
- [ ] AC-T5.2: Re-evaluate without analysis is ~50% faster (no LLM Analyzer call)
- [ ] AC-T5.3: Dashboard shows analysis availability per evaluation
- [ ] AC-T5.4: Default behavior unchanged (analyzer always runs unless explicitly disabled)

---

## T6: Persona Validator

> LLM evaluates persona quality (naturalness, coherence, testability) BEFORE use in test runs. Failed personas get `rejected` status with reason.

### Requirements

- [ ] REQ-T6.1: DB migration: add `validation_score NUMERIC`, `validation_details JSONB`, `rejection_reason TEXT` to `personas` table
- [ ] REQ-T6.2: Extend `personas.validation_status` CHECK: `pending` → `pending_validation` | `validated` | `rejected` | `approved_override`
- [ ] REQ-T6.3: New n8n workflow "Persona Validator" (or extend Personas Generator `HltftwB9Bm8LNQsO`): receives persona_id, scores naturalness/coherence/testability (1-10), weighted avg >= 7.0 → validated, else rejected
- [ ] REQ-T6.4: Validation threshold configurable in `workflow_configs` (key: `persona_validator`, config: `{ threshold: 7.0 }`)
- [ ] REQ-T6.5: Test Runner query filters: `WHERE validation_status IN ('validated', 'approved_override')`
- [ ] REQ-T6.6: Dashboard personas page shows validation badge (green=validated, red=rejected, yellow=pending, blue=override)
- [ ] REQ-T6.7: Manual override: `POST /api/personas/[id]/approve-override` sets status to `approved_override`
- [ ] REQ-T6.8: API `POST /api/personas/[id]/validate` triggers validation for a single persona

### Persona Validator Scoring Criteria

```json
{
  "naturalness": "Does the persona sound like a real person, not a caricature?",
  "coherence": "Are demographics, behavior, and goals internally consistent?",
  "testability": "Will this persona produce meaningful differentiation in agent behavior?"
}
```

### Lifecycle

```
Generated → pending_validation → [LLM scores] → validated (score >= 7.0)
                                               → rejected (score < 7.0, reason stored)

Rejected → [user edits] → pending_validation → re-validate
         → [user override] → approved_override
```

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| DB migration | `supabase/migrations/014_*.sql` | ALTER personas: new columns + CHECK constraint update |
| Persona validate API | `app/api/personas/[id]/validate/route.ts` | NEW — triggers n8n validation |
| Persona override API | `app/api/personas/[id]/approve-override/route.ts` | NEW — manual override |
| n8n validator | New workflow or extend `HltftwB9Bm8LNQsO` | LLM scores persona, updates DB |
| Test Runner query | n8n `XmpBhcUxsRpxAYPN` | Filter `WHERE validation_status IN ('validated', 'approved_override')` |
| Personas page | `app/personas/page.tsx` + components | Validation badge, validate/override buttons |
| workflow_configs seed | Migration | Add `persona_validator` config with threshold |

### Acceptance Criteria

```gherkin
GIVEN a newly created persona with status 'pending_validation'
WHEN validation is triggered
THEN LLM scores naturalness, coherence, testability
AND if weighted_avg >= 7.0 → status = 'validated'
AND if weighted_avg < 7.0 → status = 'rejected', rejection_reason populated

GIVEN a rejected persona
WHEN user clicks "Approve Override"
THEN status = 'approved_override'
AND persona is eligible for test runs

GIVEN a test run is launched
WHEN Test Runner selects personas
THEN only validated + approved_override personas are used
```

- [ ] AC-T6.1: Persona validation endpoint triggers n8n workflow
- [ ] AC-T6.2: Rejected personas show reason in dashboard
- [ ] AC-T6.3: Test Runner excludes non-validated personas
- [ ] AC-T6.4: Override flow works end-to-end
- [ ] AC-T6.5: Validation threshold configurable via Settings page

---

## T7: Parse Error Resilience

> Handle invalid JSON from Judge LLM gracefully. Exclude parse-failed battles from aggregates instead of scoring them 1.

### Requirements

- [ ] REQ-T7.1: n8n evaluator "Parse Evaluation" Code node: on JSON parse failure, save `{ "parse_error": true, "raw_response": "..." }` to `battle_evaluations.raw_response`
- [ ] REQ-T7.2: battle_evaluations with `parse_error: true` get `outcome: 'error'` (not 'failure')
- [ ] REQ-T7.3: "Update Evaluation Complete" aggregation query EXCLUDES `outcome = 'error'` from score calculations
- [ ] REQ-T7.4: Dashboard shows "N battles failed to parse — review manually" warning on evaluation detail
- [ ] REQ-T7.5: Optional retry: before saving error, retry LLM call once with stricter prompt ("Return ONLY valid JSON, no markdown")

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| n8n Parse node | Workflow `202JEX5zm3VlrUT8` "Parse Evaluation" Code node | Wrap JSON.parse in try/catch, save error state |
| n8n Aggregate node | Same workflow "Update Evaluation Complete" | Add `WHERE outcome != 'error'` to aggregation |
| Dashboard eval detail | `components/agentic/` | Show parse error warning with count |

### Acceptance Criteria

```gherkin
GIVEN Judge LLM returns invalid JSON (markdown-wrapped or truncated)
WHEN Parse Evaluation runs
THEN battle_evaluation saved with outcome='error', parse_error=true, raw_response preserved
AND evaluation aggregate score excludes this battle
AND dashboard shows "1 battle failed to parse" warning

GIVEN 10 battles where 2 fail to parse
WHEN evaluation aggregation runs
THEN overall_score = avg of 8 successful battles (not 10)
AND error_count tracked (UI shows "8/10 battles scored, 2 parse errors")
```

- [ ] AC-T7.1: Parse errors don't crash the evaluator workflow
- [ ] AC-T7.2: Parse errors excluded from aggregate scores
- [ ] AC-T7.3: Raw LLM response preserved for debugging
- [ ] AC-T7.4: Dashboard shows error count per evaluation

---

## T8: Callback Retry + Polling Fallback

> Make the webhook callback path resilient: n8n retries on failure, dashboard polls as fallback if callback never arrives.

### Requirements

- [ ] REQ-T8.1: n8n evaluator "Send Callback" HTTP Request node: configure retry (3 attempts, 5s interval, retry on timeout)
- [ ] REQ-T8.2: React hook `useTestRunStatus(testRunId)`: polls `GET /api/test-runs/[id]` every 30s while status is `running` or `evaluating`
- [ ] REQ-T8.3: Polling stops when terminal state reached (completed, failed, aborted)
- [ ] REQ-T8.4: Status reconciliation: if evaluation.status = 'completed' but test_run.status = 'evaluating', frontend triggers `POST /api/test-runs/[id]/reconcile` to fix status
- [ ] REQ-T8.5: Timeout watchdog concept: evaluations stuck in 'running' or 'pending' >30 min → status = 'timeout' (n8n Schedule Trigger — separate lightweight workflow)

### Changes Required

| Component | File/Location | Change |
|-----------|---------------|--------|
| n8n callback | Workflow `202JEX5zm3VlrUT8` HTTP Request node | Add retry config: `{ maxRetries: 3, retryInterval: 5000 }` |
| Status polling hook | `hooks/use-test-run-status.ts` | Exists already — verify polling interval + terminal state logic |
| Reconcile API | `app/api/test-runs/[id]/reconcile/route.ts` | NEW — checks evaluation status, reconciles test_run.status |
| Watchdog workflow | New n8n workflow | Schedule Trigger every 10 min → query stuck evaluations → set timeout |

### Acceptance Criteria

```gherkin
GIVEN evaluator finishes and dashboard webhook is temporarily down
WHEN n8n sends callback
THEN retries 3 times with 5s interval before giving up

GIVEN callback never arrives (all retries failed)
WHEN user views test run in dashboard
THEN polling hook detects evaluation completed in DB
AND reconciles test_run status automatically

GIVEN an evaluation stuck in 'running' for >30 minutes
WHEN watchdog runs
THEN evaluation.status set to 'timeout'
AND error_message describes the timeout
```

- [ ] AC-T8.1: n8n callback retries on failure (visible in n8n execution log)
- [ ] AC-T8.2: Dashboard polling detects completed evaluations even without callback
- [ ] AC-T8.3: Reconcile endpoint fixes mismatched statuses
- [ ] AC-T8.4: Watchdog catches stuck evaluations (nice-to-have, can defer)

---

## Implementation Reference

| Task | Components | Estimated Scope |
|------|-----------|-----------------|
| T5: Analyzer Flag | 1 n8n IF node + 1 API param + 1 migration + 1 UI checkbox | Small |
| T6: Persona Validator | 1 migration + 2 API routes + 1 n8n workflow + UI badges | Medium-Large |
| T7: Parse Resilience | 1 n8n Code node fix + 1 aggregation query fix + UI warning | Small |
| T8: Callback Retry | 1 n8n config + 1 hook check + 1 API route + 1 n8n watchdog | Medium |

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| P0-T1: Hybrid Webhook | T5 depends on this | Done |
| P0-T2: Criteria Taxonomy | T5 reads new criteria format | Done |
| P0-T3: LLM Config | T7 uses model from config | Done |
| P0-T4: Criteria Snapshot | Foundation for T5 analyzer | Done |
| Personas Generator `HltftwB9Bm8LNQsO` | T6 may extend this | Active |

## Parallelization Guide

```
T5 (Analyzer Flag) ──────────── FIRST (depends on P0-T1/T2)
       │
       ├── T6 (Persona Validator)  ── PARALLEL (independent)
       ├── T7 (Parse Resilience)   ── PARALLEL (independent)
       └── T8 (Callback Retry)     ── PARALLEL (after T5 if touching same webhook)
```

**Recommended for parallel agents:**
- Agent A: T5 (analyzer flag) → then T8 (callback retry) — both touch evaluator workflow
- Agent B: T6 (persona validator) — independent, biggest task
- Agent C: T7 (parse resilience) — small, independent

## Manual Test Script

### Prerequisites
- [ ] P0 migrations applied (012, 013)
- [ ] P1 migration applied (014)
- [ ] n8n workflows updated
- [ ] At least 1 completed test run with battles

### Test T5: Analyzer Flag
```
1. Re-evaluate test run with "Include analysis" UNCHECKED
2. Verify evaluator scores battles but skips analyzer
3. Check evaluations.has_analysis = false
4. Re-evaluate same test run with analysis CHECKED
5. Verify analysis_report populated
6. Check evaluations.has_analysis = true

Expected: Skipping analyzer saves ~30-60s per evaluation
Status: NOT TESTED
```

### Test T6: Persona Validator
```
1. Create a new persona with intentionally bad quality (incoherent demographics + behavior)
2. Trigger validation → expect rejection with reason
3. Create a high-quality persona → expect validation pass
4. Try manual override on rejected persona → expect approved_override
5. Launch test run → verify only validated/override personas used

Expected: Quality gate prevents low-quality personas from test runs
Status: NOT TESTED
```

### Test T7: Parse Error Resilience
```
1. (Hard to trigger naturally — simulate by temporarily breaking Judge system prompt)
2. Run evaluation → if parse error occurs → check battle_evaluation has outcome='error'
3. Verify aggregate score excludes errored battles
4. Verify dashboard shows error count warning

Expected: Parse errors don't crash workflow or corrupt scores
Status: NOT TESTED
```

### Test T8: Callback Retry
```
1. Temporarily disable webhook endpoint (stop Next.js server)
2. Run evaluation → n8n should retry 3 times
3. Check n8n execution log for retry attempts
4. Start Next.js server → dashboard polling should detect completed evaluation
5. Verify test_run status reconciled

Expected: System recovers from temporary dashboard downtime
Status: NOT TESTED
```

## Notes

- T5 analyzer flag enables fast re-evaluations (scores only, skip analysis) — useful for A/B testing evaluators
- T6 persona validator is the largest task — consider splitting into sub-tasks if complex
- T7 is a defensive fix — may never trigger in practice with good Judge prompts, but prevents data corruption when it does
- T8 watchdog workflow is nice-to-have — core retry + polling covers 95% of cases
- All tasks follow the guiding principle: "Workflow generici, configurazione specifica"

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-02-20 | Created P1 spec from brainstorming decisions | claude |

---

*Source: docs/plans/2026-02-19-pipeline-architecture-decisions.md (P1 items #5-8)*
