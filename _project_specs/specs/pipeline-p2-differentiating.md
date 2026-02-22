---
phase: P2
name: "Pipeline Differentiating — Eval A/B, Optimizer Modes, Latency Metrics, Quote Verification"
status: pending
created: 2026-02-20
last_updated: 2026-02-20
last_tested: null
tested_by: null
pending_items: 4
blockers: ["P1-T5 (analyzer flag) for T10 and T12"]
source: docs/plans/2026-02-20-pipeline-p2-differentiating.md
---

# P2: Pipeline Differentiating Features

> Four features that elevate the pipeline from functional to intelligent: enhanced A/B eval comparison, optimizer surgical mode, latency metrics from transcripts, and post-analyzer evidence verification.

## Overview

P0 laid foundations (webhook, criteria, LLM rotation, snapshots). P1 added robustness (analyzer flag, persona validator, parse resilience, callback retry). P2 adds the features that differentiate the system: deeper comparisons, smarter optimization, temporal analysis, and evidence verification.

**Execution order**: T9 first (quick win), then T10/T11/T12 in parallel.

**Cross-reference**: Brainstorming items P12 (#9), P13 (#10), P10 (#11), Chaos #5 (#12).

---

## T9: Eval A/B Testing Enhancement

> Surface all compare data in UI (model/token diffs, criteria snapshot diffs) and add cross-test-run comparison.

### Requirements

- [ ] REQ-T9.1: Compare API returns `model_used` and `tokens_used` per evaluation in comparison response
- [ ] REQ-T9.2: EvaluationCompareView shows "Config" tab with model diff, token diff, criteria snapshot diff
- [ ] REQ-T9.3: New `GET /api/evaluations/cross-compare?eval_a=UUID&eval_b=UUID` endpoint — same as compare but without test_run_id validation
- [ ] REQ-T9.4: UI allows selecting evaluations from different test runs for cross-comparison
- [ ] REQ-T9.5: Cross-compare shows warning when prompt versions differ between test runs

### Acceptance Criteria

- [ ] AC-T9.1: Compare view shows model_used diff (same/different badge)
- [ ] AC-T9.2: Compare view shows tokens_used delta
- [ ] AC-T9.3: criteria_snapshot_diff rendered in UI (not just returned by API)
- [ ] AC-T9.4: Cross-test-run comparison works end-to-end
- [ ] AC-T9.5: Warning displayed when comparing across different prompt versions

---

## T10: Optimizer Dual Mode (Surgical vs Full)

> Add `optimizer_mode: 'surgical' | 'full'` to optimizer trigger. Surgical makes exactly 1 change per suggestion. Full rewrites freely.

### Requirements

- [ ] REQ-T10.1: `POST /api/n8n/trigger` accepts `optimizer_mode` param (default: 'full')
- [ ] REQ-T10.2: n8n Optimizer workflow `honcSigslEtpoVqy` branches on mode: surgical uses constrained LLM prompt, full uses existing prompt
- [ ] REQ-T10.3: `optimization_history` records `optimizer_mode` and `optimization_round`
- [ ] REQ-T10.4: Circuit breaker: `max_optimization_rounds` in `workflow_configs.config` (default: 3)
- [ ] REQ-T10.5: If draft score is >1 point WORSE than original → auto-block with `regression_detected` flag
- [ ] REQ-T10.6: Dashboard OptimizationPanel has radio selector: Full Rewrite / Surgical

### Acceptance Criteria

- [ ] AC-T10.1: Surgical mode produces minimal diff (1 change per suggestion)
- [ ] AC-T10.2: Full mode behavior unchanged from current
- [ ] AC-T10.3: `optimization_history.optimizer_mode` populated
- [ ] AC-T10.4: Circuit breaker prevents >3 rounds for same prompt version
- [ ] AC-T10.5: Regression detection blocks auto-promotion of worse drafts

---

## T11: Latency Metrics from Chat History

> Extract per-turn timestamps from battle transcripts, compute latency stats, pass to Judge, display in UI.

### Requirements

- [ ] REQ-T11.1: n8n Battle Agent saves `transcript_structured JSONB` alongside existing `transcript` text. Format: `{ turns: [{ speaker, message, timestamp_ms }] }`
- [ ] REQ-T11.2: n8n Battle Agent computes and saves `avg_agent_latency_ms` and `max_agent_latency_ms` per battle
- [ ] REQ-T11.3: n8n Evaluator pre-processes latency stats and injects "Temporal Context" section into Judge system prompt
- [ ] REQ-T11.4: `battle_evaluations.latency_context` stores `{ avg_agent_latency_ms, max_agent_latency_ms, slow_turns }`
- [ ] REQ-T11.5: ConversationTranscript component shows latency badge per agent turn (green <5s, yellow 5-10s, red >10s)
- [ ] REQ-T11.6: Backward compatible: old transcripts (text-only) continue to render without latency data
- [ ] REQ-T11.7: Test run detail shows aggregate latency stats (avg across battles, slowest battle)

### Acceptance Criteria

- [ ] AC-T11.1: New battles save structured transcript with timestamps
- [ ] AC-T11.2: Latency stats computed and saved to battle_results columns
- [ ] AC-T11.3: Judge receives temporal context for all new evaluations
- [ ] AC-T11.4: UI shows latency per turn with color-coded badges
- [ ] AC-T11.5: Old transcripts still render correctly (no breakage)

---

## T12: Quote Verification (Post-Analyzer Evidence Checking)

> Verify each `evidence` string in `analysis_report.insights[]` against actual transcripts. 3-tier: exact match, pattern summary, unverified.

### Requirements

- [ ] REQ-T12.1: Analyzer LLM prompt enforces evidence format: EXACT QUOTE (with turn number) or PATTERN (with conversation count)
- [ ] REQ-T12.2: n8n Evaluator adds "Verify Evidence" Code node after Analyzer, before saving report
- [ ] REQ-T12.3: Verification results saved to `test_runs.insights_verification JSONB` — array of `{ insight_index, evidence_index, status, matched_in }`
- [ ] REQ-T12.4: UI shows traffic light per evidence: green (exact), yellow (pattern), red (unverified)
- [ ] REQ-T12.5: Verification is best-effort — does not block evaluation completion on failure

### Verification Logic (3-tier)

```
Tier 1 (exact): Extract quoted text from evidence string → substring match against all transcripts → if found: 'exact'
Tier 2 (pattern): Check if evidence contains pattern phrases ("pattern observed", "across N conversations", "tends to") → if yes: 'pattern'
Tier 3 (unverified): Neither match → 'unverified'
```

### Acceptance Criteria

- [ ] AC-T12.1: Analyzer outputs evidence in correct format (exact quotes or patterns)
- [ ] AC-T12.2: Verification Code node runs without errors
- [ ] AC-T12.3: `insights_verification` populated in DB after analyzer runs
- [ ] AC-T12.4: UI renders traffic light badges on evidence items
- [ ] AC-T12.5: Verification failure does not crash evaluation pipeline

---

## DB Migration: `015_p2_differentiating.sql`

```sql
-- T10: Optimizer dual mode
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS optimizer_mode VARCHAR(20) DEFAULT 'full';
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS optimization_round INTEGER DEFAULT 1;

-- T11: Latency metrics
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS transcript_structured JSONB;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS avg_agent_latency_ms INTEGER;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS max_agent_latency_ms INTEGER;
ALTER TABLE battle_evaluations ADD COLUMN IF NOT EXISTS latency_context JSONB;

-- T12: Quote verification
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS insights_verification JSONB;
```

## Implementation Reference

| Task | Components | Estimated Scope |
|------|-----------|-----------------|
| T9: Eval A/B Enhancement | 1 API enhance + 1 new API route + UI tabs | Small |
| T10: Optimizer Dual Mode | 1 API param + n8n IF branch + migration + UI radio | Medium |
| T11: Latency Metrics | n8n Battle Agent change + n8n Evaluator change + UI component + migration | Large |
| T12: Quote Verification | n8n Code node + prompt update + UI badges + migration | Medium |

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| P0-T1 through T4 | Foundation | Done |
| P1-T5: Analyzer Flag | Required by T10, T12 | Pending |
| Optimizer workflow `honcSigslEtpoVqy` | Modified by T10 | Active |
| Battle Agent `Z35cpvwXt7Xy4Mgi` | Modified by T11 | Active |
| Evaluator `202JEX5zm3VlrUT8` | Modified by T11, T12 | Active |

## Manual Test Script

### Test T9: Eval A/B Enhancement
```
1. Run a test → evaluate with config A → evaluate with config B (different model)
2. Select both evaluations → click Compare
3. Verify "Config" tab shows model diff, token diff
4. Verify criteria_snapshot_diff rendered
5. Try cross-test-run compare with evaluations from different runs

Expected: All comparison data visible, cross-compare works
Status: NOT TESTED
```

### Test T10: Optimizer Dual Mode
```
1. Trigger optimizer in Surgical mode with 1 suggestion selected
2. Verify draft has minimal diff (only 1 change)
3. Trigger optimizer in Full mode
4. Verify draft may have multiple changes
5. Try exceeding max_optimization_rounds → expect blocked

Expected: Surgical produces focused changes, circuit breaker works
Status: NOT TESTED
```

### Test T11: Latency Metrics
```
1. Run a new test (post-migration)
2. Check battle_results: transcript_structured populated with timestamps
3. Check avg_agent_latency_ms and max_agent_latency_ms populated
4. View conversation transcript → verify latency badges per agent turn
5. Check old test runs → verify transcript still renders (backward compat)

Expected: New tests have latency data, old tests unaffected
Status: NOT TESTED
```

### Test T12: Quote Verification
```
1. Run a test with analyzer enabled
2. Check test_runs.insights_verification populated
3. View analysis report in dashboard → verify traffic light badges
4. Check at least some evidence is 'exact' (green) or 'pattern' (yellow)
5. Verify evaluation completes even if verification logic encounters errors

Expected: Evidence tagged, UI shows verification status
Status: NOT TESTED
```

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-02-20 | Created P2 spec from brainstorming decisions | claude |

---

*Source: docs/plans/2026-02-20-pipeline-p2-differentiating.md (P2 items #9-12)*
