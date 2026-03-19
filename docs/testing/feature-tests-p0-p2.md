# Feature Test Checklist: T1-T12 (P0/P1/P2)

> Detailed test procedures for every pipeline feature from P0 Foundations through P2 Differentiating.
> Each section is self-contained: setup, steps, verifications, and rollback.

**Last updated**: 2026-02-25
**Migrations required**: 012 (P0), 013 (P0 alignment), 014 (P1), 015 (P2 - pending)
**n8n workflows**: Evaluator `202JEX5zm3VlrUT8`, Runner `XmpBhcUxsRpxAYPN`, Battle Agent `Z35cpvwXt7Xy4Mgi`, Optimizer `honcSigslEtpoVqy`, Personas Generator `HltftwB9Bm8LNQsO`

---

## Prerequisites (all features)

- [ ] `.env.local` configured with Supabase URL, anon key, `N8N_SECRET`, `NEXT_PUBLIC_APP_URL`
- [ ] All migrations applied (`012_p0_pipeline_foundations.sql`, `013_p0_alignment_patch.sql`, `014_p1_high_impact.sql`)
- [ ] n8n instance reachable and workflow_configs table populated with webhook URLs
- [ ] At least 1 completed test run with battle_results in the database
- [ ] Dashboard dev server running (`pnpm dev`)

---

## P0: Pipeline Foundations

---

### T1: Hybrid Webhook Callback System

**Priority**: P0
**Spec**: `_project_specs/specs/pipeline-p0-foundations.md` (section T1)
**Key files**: `app/api/evaluations/re-evaluate/route.ts`, `app/api/n8n/webhook/route.ts`

**Setup**:
- A completed test run (status=`completed`) with at least 3 battle_results
- Evaluator workflow_config row with `is_active=true` and valid `webhook_url`
- n8n evaluator workflow `202JEX5zm3VlrUT8` deployed with the hybrid webhook trigger node

**Steps**:
1. **Test Runner path**: Trigger a full test run from the Test Launcher UI. Wait for the Runner to finish battles and POST the evaluator trigger payload.
2. **Re-evaluate path**: From the test run detail page, click "Re-evaluate". Select an evaluator config. Confirm.
3. Inspect both `evaluations` rows created in step 1 and step 2.
4. Compare the trigger payloads in n8n execution logs for both runs.

**Verify**:
- [ ] Both evaluations use the same webhook URL (single entry in `workflow_configs WHERE workflow_type='evaluator'`)
- [ ] Runner-created evaluation has `triggered_by = 'auto'`
- [ ] Re-evaluate-created evaluation has `triggered_by = 'manual'`
- [ ] Both evaluator n8n executions received identical payload shape: `{ evaluation_id, test_run_id, evaluator_config_id, triggered_by, run_analyzer, callback_url, timestamp }`
- [ ] Evaluator workflow fetches by `evaluation_id`, NOT by querying `WHERE status='pending'`
- [ ] Both evaluations produce `battle_evaluations` rows with valid scores
- [ ] `POST /api/n8n/webhook` health check returns 200: `GET /api/n8n/webhook`

**Rollback**: Non-destructive. Delete created `evaluations` rows if needed: `DELETE FROM evaluations WHERE id IN (...)`

---

### T2: Criteria Taxonomy (Core + Domain Weighting)

**Priority**: P0
**Spec**: `_project_specs/specs/pipeline-p0-foundations.md` (section T2)
**Key files**: `supabase/migrations/012_p0_pipeline_foundations.sql`, `app/api/evaluator-configs/route.ts`

**Setup**:
- Migration 012 applied
- Access to Supabase Studio or psql for direct queries

**Steps**:
1. Query `criteria_definitions` table: verify 6 core + 5 outbound_sales + 4 outbound_cold rows exist (15+ total).
2. Query `evaluator_configs WHERE name='sales-evaluator' AND version='1.0'`: inspect the `criteria` column.
3. Create a new evaluator config via the API or UI, specifying core + domain criteria with custom weights.
4. Run an evaluation using the migrated config. Inspect `battle_evaluations.criteria_scores`.
5. Verify weighted score calculation: a criterion with `weight: 1.5` should contribute more to the overall score.

**Verify**:
- [ ] `criteria_definitions` has >= 15 rows: `SELECT COUNT(*) FROM criteria_definitions`
- [ ] 6 rows with `category='core'`, `domain_type IS NULL`
- [ ] 5 rows with `category='domain'`, `domain_type='outbound_sales'`
- [ ] 4 rows with `category='domain'`, `domain_type='outbound_cold'`
- [ ] `sales-evaluator v1.0` criteria format: `{ core: [...], domain: [...], weights: {...} }` (not flat array)
- [ ] `discovery_socratica` has weight 1.5, `gestione_obiezioni` has weight 1.5 in existing config
- [ ] n8n evaluator merges core+domain into a single criteria list for the Judge system prompt
- [ ] Weighted mean: `SUM(score_i * weight_i) / SUM(weight_i)` used for `overall_score`
- [ ] Unknown criteria name in config causes evaluation failure with explicit error (not silently ignored)
- [ ] API `POST /evaluator-configs` validates `{ core, domain, weights }` format

**Rollback**: Migration 012 is additive. To revert criteria format: restore from `criteria_legacy` column if it exists, or re-run the inverse UPDATE.

---

### T3: LLM Model Rotation (Primary + Fallback)

**Priority**: P0
**Spec**: `_project_specs/specs/pipeline-p0-foundations.md` (section T3)
**Key files**: `supabase/migrations/012_p0_pipeline_foundations.sql`, n8n evaluator workflow

**Setup**:
- Migration 012 applied (adds `llm_config` to evaluator_configs, `model_used` to evaluations)
- n8n evaluator Judge Agent node uses expression `={{ $json.llm_config.judge.model }}`

**Steps**:
1. Check default `llm_config` on evaluator_configs: should be Gemini 2.5 Flash.
2. Run an evaluation. Check `evaluations.model_used` column after completion.
3. Update `evaluator_configs.llm_config` in DB to use `gemini-2.0-flash` as primary.
4. Run another evaluation (without touching n8n). Check `evaluations.model_used`.
5. To test fallback: temporarily set primary model to an invalid model name (e.g., `gemini-nonexistent`). Run evaluation. Check if fallback model was used.

**Verify**:
- [ ] `evaluator_configs.llm_config` column exists and defaults to `{ judge: { model: "gemini-2.5-flash", ... }, analyzer: { ... } }`
- [ ] `evaluations.model_used` is populated after evaluation (not NULL)
- [ ] Changing `llm_config` in DB changes the model used -- zero n8n workflow edits needed
- [ ] n8n Judge Agent node model field is an expression (`={{ ... }}`), not hardcoded
- [ ] Fallback scenario: when primary returns 429/500/timeout, n8n retries with fallback model after 5s backoff
- [ ] Fallback recorded as `"gemini-2.0-flash (fallback)"` in `model_used`
- [ ] `evaluations.tokens_used` populated (if implemented) for budget tracking

**Rollback**: Set `llm_config` back to original Gemini default. n8n model field can be reverted to hardcoded string.

---

### T4: Criteria Snapshot Persistence

**Priority**: P0
**Spec**: `_project_specs/specs/pipeline-p0-foundations.md` (section T4)
**Key files**: `app/api/evaluations/re-evaluate/route.ts`, `supabase/migrations/012_p0_pipeline_foundations.sql`

**Setup**:
- Migration 012 applied (adds `criteria_snapshot`, `llm_config_snapshot` to evaluations)
- A completed test run with an existing evaluation

**Steps**:
1. Trigger a re-evaluation via `POST /api/evaluations/re-evaluate`. Note the evaluation ID.
2. Query `evaluations WHERE id = '<new_eval_id>'`: check `criteria_snapshot` and `llm_config_snapshot`.
3. Modify the evaluator_config's criteria (add a new domain criterion or change a weight).
4. Query the same evaluation row again: snapshot should be unchanged.
5. Trigger another re-evaluation. Compare the two evaluations' snapshots -- they should differ.
6. Test the compare endpoint: `GET /api/evaluations/<eval1>/compare/<eval2>`. Check `criteria_snapshot_diff`.

**Verify**:
- [ ] `evaluations.criteria_snapshot` is populated on INSERT (not NULL) for re-evaluate path
- [ ] `evaluations.llm_config_snapshot` is populated on INSERT (not NULL)
- [ ] Snapshot content matches `evaluator_configs.criteria` at the moment of creation
- [ ] Modifying `evaluator_configs.criteria` after evaluation creation has zero impact on snapshot
- [ ] n8n evaluator reads from `evaluations.criteria_snapshot`, not from `evaluator_configs.criteria`
- [ ] Compare API (`/api/evaluations/[id]/compare/[otherId]`) returns `criteria_snapshot_diff` with `added_criteria`, `removed_criteria`, `weight_changes`
- [ ] Backfilled: existing evaluations (pre-migration) have snapshots from their config: `SELECT COUNT(*) FROM evaluations WHERE criteria_snapshot IS NOT NULL`

**Rollback**: Non-destructive. Snapshot columns are nullable. n8n can fallback with `COALESCE(e.criteria_snapshot, ec.criteria)`.

---

## P1: Pipeline High Impact

---

### T5: Analyzer Conditional Flag

**Priority**: P1
**Spec**: `_project_specs/specs/pipeline-p1-high-impact.md` (section T5)
**Key files**: `app/api/evaluations/re-evaluate/route.ts`, n8n evaluator workflow

**Setup**:
- Migration 014 applied (adds `has_analysis BOOLEAN` to evaluations)
- A completed test run with battles

**Steps**:
1. From the dashboard, click Re-evaluate on a completed test run. In the re-evaluate modal, UNCHECK "Include analysis".
2. Wait for evaluation to complete.
3. Check `evaluations.has_analysis` for the new evaluation.
4. Re-evaluate the same test run again, this time with "Include analysis" CHECKED (default).
5. Wait for evaluation to complete.
6. Check `evaluations.has_analysis` for this second evaluation.
7. Compare execution times of step 2 vs step 5 in n8n execution log.

**Verify**:
- [ ] Re-evaluate API accepts `run_analyzer` boolean in request body (default: `true`)
- [ ] n8n evaluator webhook payload includes `run_analyzer` field
- [ ] When `run_analyzer=false`: evaluation completes with `has_analysis=false`, no `analysis_report` update on test_run
- [ ] When `run_analyzer=true`: evaluation completes with `has_analysis=true`, `analysis_report` updated
- [ ] n8n execution log shows IF node branching: `run_analyzer=false` skips PG Aggregate + LLM Analyzer + Save Report nodes
- [ ] Skipping analyzer saves measurable time (check n8n execution duration: expect ~30-60s savings)
- [ ] Dashboard evaluation detail shows whether analysis is available
- [ ] Default behavior unchanged: omitting `run_analyzer` defaults to `true`

**Rollback**: Non-destructive. `has_analysis` column is nullable boolean with default false.

---

### T6: Persona Validator Integration

**Priority**: P1
**Spec**: `_project_specs/specs/pipeline-p1-high-impact.md` (section T6)
**Key files**: `app/api/personas/[id]/validate/route.ts`, `app/api/personas/[id]/approve-override/route.ts`, `supabase/migrations/014_p1_high_impact.sql`

**Setup**:
- Migration 014 applied (adds `validation_score`, `validation_details`, `rejection_reason` to personas; updates CHECK constraint)
- `workflow_configs` has a `personas_validator` row with `is_active=true` and valid webhook_url
- n8n persona validator workflow deployed (or extended Personas Generator `HltftwB9Bm8LNQsO`)

**Steps**:
1. Query personas table: verify all old `pending` statuses were migrated to `pending_validation`.
2. Pick a persona. Call `POST /api/personas/<id>/validate`.
3. Check persona status changed to `pending_validation` immediately.
4. Wait for n8n callback. Check persona status changed to `validated` or `rejected`.
5. If validated: check `validation_score >= 7.0`, `validation_details` has naturalness/coherence/testability scores.
6. If rejected: check `validation_score < 7.0`, `rejection_reason` is populated.
7. For a rejected persona: call `POST /api/personas/<id>/approve-override`.
8. Check status changed to `approved_override`.
9. Try override on a non-rejected persona (e.g., validated): expect 400 error.
10. Launch a test run: verify Test Runner only selects personas with `validation_status IN ('validated', 'approved_override')`.

**Verify**:
- [ ] `POST /api/personas/<id>/validate` sets status to `pending_validation` and triggers n8n webhook
- [ ] n8n validator scores naturalness, coherence, testability (each 1-10)
- [ ] Weighted avg >= 7.0 results in `validated` status
- [ ] Weighted avg < 7.0 results in `rejected` status with `rejection_reason`
- [ ] `POST /api/personas/<id>/approve-override` only works on `rejected` personas (returns 400 for others)
- [ ] Override sets status to `approved_override`
- [ ] n8n callback to `/api/n8n/webhook` with `workflow_type='personas_validator'` correctly updates persona status
- [ ] `workflow_configs.config.threshold` is `7.0` for `personas_validator`
- [ ] Validation threshold is configurable: changing it in DB changes the pass/fail cutoff
- [ ] Test Runner SQL filters: `WHERE validation_status IN ('validated', 'approved_override')`
- [ ] Dashboard personas page shows validation badge (green/red/yellow/blue)
- [ ] CHECK constraint enforced: `INSERT INTO personas (validation_status) VALUES ('invalid')` fails

**Rollback**: Drop new columns with `ALTER TABLE personas DROP COLUMN validation_score, DROP COLUMN validation_details, DROP COLUMN rejection_reason`. Reset statuses: `UPDATE personas SET validation_status = 'pending_validation'`. Remove CHECK constraint.

---

### T7: Parse Resilience for Malformed JSON

**Priority**: P1
**Spec**: `_project_specs/specs/pipeline-p1-high-impact.md` (section T7)
**Key files**: n8n evaluator workflow `202JEX5zm3VlrUT8` "Parse Evaluation" Code node

**Setup**:
- n8n evaluator workflow deployed with updated Parse Evaluation Code node (try/catch wrapper)
- A completed test run with battles to evaluate

**Steps**:
1. **Simulate parse failure**: Temporarily modify the Judge system prompt to include instructions that produce markdown-wrapped JSON (e.g., add "wrap your response in ```json blocks"). Or inject a malformed response via a test Code node.
2. Run an evaluation against this modified setup.
3. Check `battle_evaluations` for the affected battles.
4. Check the aggregation query for the evaluation overall_score.
5. Check the dashboard evaluation detail page.
6. Restore the Judge system prompt.

**Verify**:
- [ ] Parse failure does NOT crash the n8n evaluator workflow (execution completes)
- [ ] Failed-to-parse battle has `outcome = 'error'` (not `'failure'`)
- [ ] Failed-to-parse battle has `raw_response` preserved in `battle_evaluations` for debugging
- [ ] `parse_error: true` flag stored in the battle evaluation record
- [ ] Aggregation query: `WHERE outcome != 'error'` excludes errored battles from score calculation
- [ ] If 10 battles and 2 fail to parse: `overall_score = avg of 8 successful battles` (not 10)
- [ ] Dashboard shows warning: "N battles failed to parse" with count
- [ ] Optional retry: before saving error, evaluator retries LLM call once with stricter prompt

**Rollback**: Non-destructive. Revert the n8n Parse Evaluation Code node to previous version via n8n version history.

---

### T8: Callback Retry / Reconciliation

**Priority**: P1
**Spec**: `_project_specs/specs/pipeline-p1-high-impact.md` (section T8)
**Key files**: `hooks/use-test-run-status.ts`, `app/api/test-runs/[id]/reconcile/route.ts`, n8n evaluator HTTP Request node

**Setup**:
- n8n evaluator workflow callback HTTP Request node configured with retry settings
- Dashboard running with React Query polling enabled
- A test run in `evaluating` state

**Steps**:
1. **Test n8n retry**: Stop the Next.js dev server. Trigger an evaluation in n8n. Check n8n execution logs for retry attempts (expect 3 retries with 5s interval).
2. **Test polling fallback**: Start Next.js server again. Navigate to the test run detail page. The `useTestRunStatus` hook should poll every 5s and detect the evaluation completed in DB.
3. **Test auto-reconciliation**: Create a scenario where `evaluations.status = 'completed'` but `test_runs.status = 'evaluating'`. Wait >2 minutes on the detail page. The hook should auto-call `POST /api/test-runs/<id>/reconcile`.
4. **Test reconcile API directly**: `POST /api/test-runs/<id>/reconcile` on a stuck test run. Verify it fixes the mismatch.
5. **Test terminal states**: Verify polling stops when test_run reaches `completed`, `failed`, or `aborted`.

**Verify**:
- [ ] n8n HTTP Request "Send Callback" node has retry configured: 3 attempts, 5s interval
- [ ] n8n execution log shows retry attempts when dashboard is down
- [ ] `useTestRunStatus` hook polls every 5s for active states (`pending`, `running`, `battles_completed`, `evaluating`)
- [ ] Polling stops for terminal states (`completed`, `failed`, `aborted`)
- [ ] After 2 minutes stuck in `evaluating`, hook auto-triggers reconcile
- [ ] `POST /api/test-runs/<id>/reconcile` returns `{ reconciled: true, new_status: 'completed' }` when evaluation is complete but test_run is stuck
- [ ] Reconcile uses optimistic locking: `.eq('status', currentStatus)` prevents concurrent double-update
- [ ] Reconcile handles failed evaluations: stuck test_run becomes `failed` if evaluation failed
- [ ] Reconcile on already-terminal test_run returns `{ reconciled: false }` (no-op)
- [ ] React Query cache is invalidated after successful reconciliation

**Rollback**: Non-destructive. Reconcile API only transitions to terminal states. Remove retry config from n8n node to revert.

---

## P2: Pipeline Differentiating

---

### T9: Evaluation A/B Comparison

**Priority**: P2
**Spec**: `_project_specs/specs/pipeline-p2-differentiating.md` (section T9)
**Key files**: `app/api/evaluations/[id]/compare/[otherId]/route.ts`, `app/api/evaluations/cross-compare/route.ts`, `lib/evaluation-compare.ts`

**Setup**:
- Two evaluations for the SAME test run (e.g., one with sales-evaluator v1.0, another with a different config)
- Two evaluations from DIFFERENT test runs (cross-compare scenario)
- Both evaluations should have `criteria_snapshot`, `model_used`, and `battle_evaluations` populated

**Steps**:
1. **Same-run compare**: `GET /api/evaluations/<evalA>/compare/<evalB>` where both belong to the same test_run.
2. Inspect the response: `evaluation_a`, `evaluation_b`, `deltas`, `criteria_snapshot_diff`, `model_comparison`, `per_persona`, `verdict`.
3. **Cross-run compare**: `GET /api/evaluations/cross-compare?eval_a=<UUID>&eval_b=<UUID>` with evaluations from different test runs.
4. Inspect the response: same structure plus `cross_test_run: true`, `test_run_a`, `test_run_b`.
5. **Prompt version warning**: Use evaluations from test runs with different `prompt_version_id`. Check `prompt_version_warning.differs = true`.
6. **Edge cases**: Try comparing an evaluation with itself (expect 400). Try with non-existent UUID (expect 404).

**Verify**:
- [ ] Same-run compare: `GET /api/evaluations/<A>/compare/<B>` returns 200 with full comparison data
- [ ] Cross-run compare: `GET /api/evaluations/cross-compare?eval_a=X&eval_b=Y` returns 200
- [ ] Same-run endpoint rejects cross-run evaluations with 400 ("Use /cross-compare instead")
- [ ] `model_comparison` shows `same_model: true/false` badge, and `model_used` for each eval
- [ ] `model_comparison` shows `tokens_used` delta
- [ ] `criteria_snapshot_diff` rendered: `added_criteria`, `removed_criteria`, `weight_changes`
- [ ] `criteria_snapshot_diff.same_config` is `true` when both snapshots are identical
- [ ] `per_persona` array shows score deltas per persona
- [ ] `verdict.better_evaluation` is `"a"`, `"b"`, or `"tie"` based on score delta threshold (0.1)
- [ ] `prompt_version_warning.differs` is `true` when comparing across different prompt versions
- [ ] Self-compare (`eval_a == eval_b`) returns 400 error
- [ ] Non-existent evaluation ID returns 404

**Rollback**: Non-destructive. Read-only endpoints, no data mutation.

---

### T10: Optimizer Dual Mode (Surgical / Full)

**Priority**: P2
**Spec**: `_project_specs/specs/pipeline-p2-differentiating.md` (section T10)
**Key files**: `app/api/n8n/trigger/route.ts`, n8n optimizer workflow `honcSigslEtpoVqy`

**Setup**:
- P2 migration applied (adds `optimizer_mode`, `optimization_round` to `optimization_history`)
- A completed test run with `analysis_report` populated (required by optimizer)
- n8n optimizer workflow `honcSigslEtpoVqy` deployed with dual-mode IF branch
- `workflow_configs` has `optimizer` row with `config.max_optimization_rounds` set (default: 3)

**Steps**:
1. **Surgical mode**: Call `POST /api/n8n/trigger` with `{ workflow_type: 'optimizer', test_run_id: '<id>', additional_params: { optimizer_mode: 'surgical' }, selected_suggestions: ['<one_suggestion>'] }`.
2. Wait for optimizer to complete. Check the generated draft prompt_version.
3. **Full mode**: Call `POST /api/n8n/trigger` with `{ ..., additional_params: { optimizer_mode: 'full' } }`.
4. Wait for optimizer to complete. Check the generated draft.
5. **Circuit breaker**: Trigger optimization 4 times for the same prompt_version. Expect the 4th to be blocked.
6. **Regression detection**: If draft score is >1 point worse than original, check for `regression_detected` flag.

**Verify**:
- [ ] `POST /api/n8n/trigger` accepts `optimizer_mode` via `additional_params` (default: `full`)
- [ ] Surgical mode: n8n optimizer uses constrained LLM prompt producing minimal diff (1 change per suggestion)
- [ ] Full mode: n8n optimizer uses existing prompt allowing broader rewrites
- [ ] `optimization_history.optimizer_mode` populated with `'surgical'` or `'full'`
- [ ] `optimization_history.optimization_round` incremented per prompt_version
- [ ] Circuit breaker: `max_optimization_rounds` in `workflow_configs.config` (default: 3) prevents > N rounds
- [ ] 4th optimization attempt returns error or is blocked by n8n workflow
- [ ] Regression detection: draft with score >1 point worse gets `regression_detected` flag, auto-promotion blocked
- [ ] Dashboard OptimizationPanel shows radio selector: "Full Rewrite" / "Surgical"

**Rollback**: Delete draft prompt_versions and optimization_history rows. Revert n8n optimizer to previous version.

---

### T11: Latency Metrics

**Priority**: P2
**Spec**: `_project_specs/specs/pipeline-p2-differentiating.md` (section T11)
**Key files**: n8n Battle Agent `Z35cpvwXt7Xy4Mgi`, n8n evaluator workflow, `supabase/migrations/015_p2_differentiating.sql`

**Setup**:
- P2 migration applied (adds `transcript_structured`, `avg_agent_latency_ms`, `max_agent_latency_ms` to `battle_results`; adds `latency_context` to `battle_evaluations`)
- n8n Battle Agent updated to save structured transcripts with timestamps
- At least 1 OLD test run (pre-migration, text-only transcript) for backward compat test

**Steps**:
1. Run a NEW test (post-migration) via Test Launcher.
2. After battles complete, query `battle_results` for the new test run.
3. Check `transcript_structured` contains `{ turns: [{ speaker, message, timestamp_ms }, ...] }`.
4. Check `avg_agent_latency_ms` and `max_agent_latency_ms` are computed and saved.
5. Run an evaluation on this test run. Check `battle_evaluations.latency_context`.
6. View the conversation transcript in the dashboard. Check for latency badges.
7. View an OLD test run's transcript. Verify it still renders without errors.
8. View test run detail page: check aggregate latency stats (avg across battles, slowest battle).

**Verify**:
- [ ] `battle_results.transcript_structured` populated for new battles with `{ turns: [{ speaker, message, timestamp_ms }] }`
- [ ] `battle_results.avg_agent_latency_ms` computed correctly (mean of agent response times)
- [ ] `battle_results.max_agent_latency_ms` computed correctly (worst response time)
- [ ] `battle_evaluations.latency_context` populated: `{ avg_agent_latency_ms, max_agent_latency_ms, slow_turns }`
- [ ] n8n Evaluator injects "Temporal Context" section into Judge system prompt
- [ ] UI: ConversationTranscript shows latency badge per agent turn: green (<5s), yellow (5-10s), red (>10s)
- [ ] Backward compatible: OLD transcripts (text-only, no `transcript_structured`) render without errors
- [ ] Test run detail page shows aggregate latency: avg latency across all battles, slowest battle

**Rollback**: Drop new columns: `ALTER TABLE battle_results DROP COLUMN transcript_structured, DROP COLUMN avg_agent_latency_ms, DROP COLUMN max_agent_latency_ms`. Revert n8n Battle Agent to previous version.

---

### T12: Quote Verification (3-Tier Evidence Checking)

**Priority**: P2
**Spec**: `_project_specs/specs/pipeline-p2-differentiating.md` (section T12)
**Key files**: n8n evaluator workflow "Verify Evidence" Code node, `supabase/migrations/015_p2_differentiating.sql`

**Setup**:
- P2 migration applied (adds `insights_verification JSONB` to `test_runs`)
- n8n evaluator workflow has "Verify Evidence" Code node after Analyzer, before saving report
- Analyzer LLM prompt enforces evidence format: EXACT QUOTE (with turn number) or PATTERN (with count)
- A completed test run with `run_analyzer=true` so analysis_report exists

**Steps**:
1. Run a full evaluation with analyzer enabled (`run_analyzer: true`).
2. Wait for analyzer to complete and insights_verification to be populated.
3. Query `test_runs.insights_verification` for the test run.
4. Inspect the verification array: each entry should have `{ insight_index, evidence_index, status, matched_in }`.
5. Check for at least one `status='exact'` (green) evidence -- an exact quote found in transcripts.
6. Check for pattern evidence (`status='pattern'`) -- summary-style evidence.
7. Check for unverified evidence (`status='unverified'`) -- neither match found.
8. View the analysis report in the dashboard: check for traffic light badges.
9. **Failure resilience**: Temporarily break the Verify Evidence Code node (e.g., throw an error). Run evaluation. Verify it completes without the verification step blocking.

**Verify**:
- [ ] Analyzer outputs evidence in correct format: exact quotes with turn numbers OR pattern summaries with conversation counts
- [ ] `test_runs.insights_verification` JSONB populated after analyzer runs
- [ ] Verification array items: `{ insight_index, evidence_index, status: 'exact'|'pattern'|'unverified', matched_in }`
- [ ] Tier 1 (exact): quoted text substring-matched against all transcripts -- `status='exact'`
- [ ] Tier 2 (pattern): evidence contains pattern phrases ("pattern observed", "across N conversations", "tends to") -- `status='pattern'`
- [ ] Tier 3 (unverified): neither match -- `status='unverified'`
- [ ] UI: traffic light badges on evidence items: green (exact), yellow (pattern), red (unverified)
- [ ] Verification failure does NOT crash the evaluation pipeline (best-effort, non-blocking)
- [ ] Evaluation completes even if Verify Evidence node throws an error
- [ ] Verification runs only when `run_analyzer=true` (skipped when analyzer is skipped)

**Rollback**: Non-destructive. `insights_verification` is nullable. Revert n8n Verify Evidence node or remove it. Dashboard gracefully handles `NULL` verification data.

---

## Quick Reference: API Endpoints Under Test

| Endpoint | Method | Feature(s) | Purpose |
|----------|--------|------------|---------|
| `/api/n8n/webhook` | POST | T1, T8 | Receive n8n callbacks |
| `/api/n8n/webhook` | GET | T1 | Health check |
| `/api/evaluations/re-evaluate` | POST | T1, T4, T5 | Trigger re-evaluation |
| `/api/evaluator-configs` | GET/POST | T2, T3 | Manage evaluator configs |
| `/api/evaluations/[id]/compare/[otherId]` | GET | T9 | Same-run A/B compare |
| `/api/evaluations/cross-compare` | GET | T9 | Cross-run A/B compare |
| `/api/personas/[id]/validate` | POST | T6 | Trigger persona validation |
| `/api/personas/[id]/approve-override` | POST | T6 | Manual override |
| `/api/test-runs/[id]/reconcile` | POST | T8 | Fix status mismatch |
| `/api/n8n/trigger` | POST | T10 | Trigger optimizer/analyzer |

## Quick Reference: DB Columns Under Test

| Table | Column | Migration | Feature |
|-------|--------|-----------|---------|
| `criteria_definitions` | (entire table) | 012 | T2 |
| `evaluator_configs` | `criteria` (new format) | 012 | T2 |
| `evaluator_configs` | `llm_config` | 012 | T3 |
| `evaluations` | `model_used` | 012 | T3 |
| `evaluations` | `criteria_snapshot` | 012 | T4 |
| `evaluations` | `llm_config_snapshot` | 012 | T4 |
| `evaluations` | `has_analysis` | 014 | T5 |
| `personas` | `validation_score` | 014 | T6 |
| `personas` | `validation_details` | 014 | T6 |
| `personas` | `rejection_reason` | 014 | T6 |
| `optimization_history` | `optimizer_mode` | 015 | T10 |
| `optimization_history` | `optimization_round` | 015 | T10 |
| `battle_results` | `transcript_structured` | 015 | T11 |
| `battle_results` | `avg_agent_latency_ms` | 015 | T11 |
| `battle_results` | `max_agent_latency_ms` | 015 | T11 |
| `battle_evaluations` | `latency_context` | 015 | T11 |
| `test_runs` | `insights_verification` | 015 | T12 |
