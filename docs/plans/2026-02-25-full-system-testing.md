# Full System Testing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate every component, prompt, and workflow before UI optimization — sync n8n JSONs, test all features E2E, create regression scripts for LLM prompts, build reusable datasets.

**Architecture:** 4 parallel tracks after a sync prerequisite. Track 1 downloads live workflow JSONs and updates docs. Track 2 tests API+UI+features. Track 3 validates LLM prompts with regression scripts. Track 4 builds datasets from DB exports + real call recordings.

**Tech Stack:** n8n MCP (workflow download), Supabase MCP (data export), bash scripts (smoke tests, regression), Next.js API routes (E2E)

**Design Doc:** `docs/plans/2026-02-25-full-system-testing-design.md`

---

## Phase 1: Sync & Docs (Track 1 — prerequisite)

### Task 1: Download all 6 workflow JSONs from live n8n

**Files:**
- Overwrite: `_project_specs/n8n/workflows/Test-RUNNER-Battle.json`
- Overwrite: `_project_specs/n8n/workflows/Test-Battle-Agent-v1.0.json`
- Overwrite: `_project_specs/n8n/workflows/Battles-Evaluator.json`
- Overwrite: `_project_specs/n8n/workflows/Prompt-Optimizer.json`
- Overwrite: `_project_specs/n8n/workflows/Personas-Generator-v2.json`
- Create: `_project_specs/n8n/workflows/Personas-Validator.json`

**Step 1: Download each workflow via n8n MCP**

Use `mcp__n8n-mcp-prod__n8n_get_workflow` for each ID:
- Test RUNNER: `XmpBhcUxsRpxAYPN`
- Battle Agent: `Z35cpvwXt7Xy4Mgi`
- Evaluator: `202JEX5zm3VlrUT8`
- Optimizer: `honcSigslEtpoVqy`
- Personas Generator: `HltftwB9Bm8LNQsO`
- Personas Validator: `aGlmWu7SPHw17eYQ`

**Step 2: Save JSONs with normalized names**

Save all to `_project_specs/n8n/workflows/` with kebab-case names (no spaces, no parentheses). This becomes the single canonical location.

**Step 3: Remove old duplicates**

Delete the old `n8n workflows/` root directory (it has outdated copies):
```bash
rm -rf "n8n workflows/"
```

Also delete old files in `_project_specs/n8n/workflows/` with spaces in names:
```bash
rm "_project_specs/n8n/workflows/Battles Evaluator.json"
rm "_project_specs/n8n/workflows/Test Battle Agent v1.0 (1).json"
rm "_project_specs/n8n/workflows/Test RUNNER Battle.json"
```

**Step 4: Commit**

```bash
git add _project_specs/n8n/workflows/
git add -u "n8n workflows/"
git commit -m "chore: sync all 6 n8n workflow JSONs from live instance"
```

---

### Task 2: Extract prompt reference from workflow JSONs

**Files:**
- Create: `docs/prompts-reference.md`

**Step 1: Extract prompts from each JSON**

For each downloaded workflow JSON, find all nodes with LLM prompts (look for `systemMessage`, `text`, `messages` fields in agent/LLM nodes). Document:
- Node name
- System message (full text)
- User message template
- Model + provider
- Temperature / max tokens

**Step 2: Write prompts-reference.md**

Structure:
```markdown
# LLM Prompts Reference

## 1. Judge Evaluator (Battles-Evaluator.json)
### System Prompt
[full text]
### User Message Template
[full text]
### Model Config
- Model: [from JSON]
- Provider: [from JSON]

## 2. Post-Loop Analyzer (Battles-Evaluator.json)
...

## 3. Optimizer (Prompt-Optimizer.json)
...

## 4. Persona Validator (Personas-Validator.json)
...

## 5. Persona Generator (Personas-Generator-v2.json)
...

## 6. Battle Agent — Dynamic
- Source: DB `prompt_versions.content`
- Injected at runtime via `agentPrompt` param

## 7. Persona Simulator — Dynamic
- Source: DB `personas.personaprompt`
- Injected at runtime via `personasPrompt` param
```

**Step 3: Commit**

```bash
git add docs/prompts-reference.md
git commit -m "docs: extract LLM prompts reference from workflow JSONs"
```

---

### Task 3: Update n8n documentation

**Files:**
- Modify: `docs/n8n.md`
- Modify: `_project_specs/n8n/CHANGELOG.md`
- Modify: `_project_specs/n8n/README.md`

**Step 1: Update docs/n8n.md**

- Add Personas Validator to workflow table (ID `aGlmWu7SPHw17eYQ`, status Active)
- Add Optimizer to workflow table (ID `honcSigslEtpoVqy`, status Active)
- Update node counts from fresh JSONs
- Add current LLM models used per workflow
- Add P0/P1/P2 feature references

**Step 2: Update CHANGELOG.md**

Add entry for workflow sync:
```markdown
## 2026-02-25 — Workflow JSON Sync

All 6 workflow JSONs re-exported from live n8n. Previous exports were from Jan 19-25.
Changes since last export: P0 (criteria taxonomy, LLM rotation), P1 (analyzer flag, parse resilience),
P2 (optimizer dual mode, latency metrics, quote verification).
```

**Step 3: Update README.md**

- Fix workflow table (add all 6 workflows with correct IDs)
- Fix file structure section to match new normalized file names
- Remove reference to `MODIFICATIONS-REQUIRED.md` if it doesn't exist

**Step 4: Commit**

```bash
git add docs/n8n.md _project_specs/n8n/CHANGELOG.md _project_specs/n8n/README.md
git commit -m "docs: update n8n docs with all 6 workflows and P0-P2 changes"
```

---

## Phase 2A: Feature E2E Testing (Track 2)

### Task 4: Create API smoke test script

**Files:**
- Create: `scripts/smoke-test.sh`

**Step 1: Write the smoke test script**

Script that curls every API endpoint with valid + invalid payloads. Structure:

```bash
#!/bin/bash
# API Smoke Test — validates all endpoints respond correctly
# Usage: ./scripts/smoke-test.sh [--group core|triggers|eval|support|all]

BASE_URL="${BASE_URL:-http://localhost:3000}"
REPORT_DIR="datasets/reports"
PASS=0; FAIL=0; SKIP=0

mkdir -p "$REPORT_DIR"

test_endpoint() {
  local method="$1" path="$2" expected="$3" body="$4" desc="$5"
  # curl with timeout, check status code, log result
}

# Group: core — CRUD endpoints
test_core() {
  test_endpoint GET "/api/prompts/names" 200 "" "List prompt names"
  test_endpoint GET "/api/personas" 200 "" "List personas"
  test_endpoint GET "/api/evaluator-configs" 200 "" "List evaluator configs"
  test_endpoint GET "/api/test-runs" 200 "" "List test runs"
  test_endpoint GET "/api/conversations" 200 "" "List conversations"
  test_endpoint GET "/api/criteria-definitions" 200 "" "List criteria"
  test_endpoint GET "/api/battle-notes" 200 "" "List battle notes"
  test_endpoint GET "/api/settings" 200 "" "List settings"
}

# Group: eval — Evaluation chain
test_eval() {
  test_endpoint GET "/api/evaluations?test_run_id=LATEST" 200 "" "List evaluations"
  test_endpoint GET "/api/dashboard/stats" 200 "" "Dashboard stats"
  test_endpoint GET "/api/dashboard/trend" 200 "" "Dashboard trend"
  test_endpoint GET "/api/dashboard/criteria" 200 "" "Dashboard criteria"
}

# Group: triggers — Workflow triggers (read-only check, no actual trigger)
test_triggers() {
  # POST with empty body should return 400, not 500
  test_endpoint POST "/api/n8n/trigger" 400 '{}' "Trigger missing workflow_type"
  test_endpoint POST "/api/test-runs" 400 '{}' "Test run missing params"
  test_endpoint POST "/api/generate-personas" 400 '{}' "Generate missing params"
}

# Group: support — Error handling
test_support() {
  test_endpoint GET "/api/test-runs/nonexistent" 404 "" "Invalid test run ID"
  test_endpoint GET "/api/evaluator-configs/nonexistent" 404 "" "Invalid config ID"
}
```

Full script ~150 lines, tests ~25 endpoints, outputs JSON report.

**Step 2: Make executable and test**

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh --group core
```

Expected: All core endpoints return 200.

**Step 3: Commit**

```bash
git add scripts/smoke-test.sh
git commit -m "test: add API smoke test script for all endpoints"
```

---

### Task 5: Create UI walkthrough checklist

**Files:**
- Create: `docs/testing/ui-walkthrough.md`

**Step 1: Write the checklist**

Markdown checklist with 12 pages, each with specific items to verify visually. Include screenshots path for evidence.

```markdown
# UI Walkthrough Checklist

## Instructions
1. Run `pnpm dev`
2. Open http://localhost:3000
3. Check each item, mark [x] when verified
4. Note issues in "Issues" column

## Pages

### / (Dashboard)
- [ ] KPI cards load with real data (not 0 or NaN)
- [ ] Score trend line chart renders
- [ ] Criteria radar chart renders
- [ ] Test runs table shows recent runs
- [ ] Filter controls work

### /test-launcher
- [ ] Prompt selector populates
- [ ] Persona selector populates
- [ ] Launch button triggers test run
- [ ] Progress bar updates during run
- [ ] Abort button works
- [ ] Status monitor shows correct state

[... one section per page, ~5 items each ...]
```

**Step 2: Commit**

```bash
mkdir -p docs/testing
git add docs/testing/ui-walkthrough.md
git commit -m "test: add UI walkthrough checklist for all 12 pages"
```

---

### Task 6: Create P0/P1/P2 feature test checklist

**Files:**
- Create: `docs/testing/feature-tests-p0-p2.md`

**Step 1: Write feature-specific test procedures**

One section per feature (T1-T12), each with:
- **Setup**: What state you need
- **Steps**: Exact actions
- **Verify**: What to check in DB/UI/n8n
- **Rollback**: How to clean up

Example for T12 (Quote Verification):
```markdown
### T12: Quote Verification

**Setup**: Need a completed test run with analyzer enabled

**Steps**:
1. Go to `/test-launcher`, select a prompt and personas
2. Launch test with "Run Analyzer" checked
3. Wait for completion

**Verify**:
- [ ] `test_runs.insights_verification` is NOT NULL in Supabase
- [ ] Each insight has verification entries (exact/pattern/unverified)
- [ ] Go to `/agentic` > select the agent > insights show traffic light badges
- [ ] Green = exact quote found, Yellow = pattern, Red = unverified

**Rollback**: No cleanup needed (non-destructive)
```

**Step 2: Commit**

```bash
git add docs/testing/feature-tests-p0-p2.md
git commit -m "test: add P0-P2 feature-specific test procedures"
```

---

## Phase 2B: Prompt Validation (Track 3)

### Task 7: Export baseline dataset from Supabase

**Files:**
- Create: `datasets/baselines/metadata.json`
- Create: `datasets/baselines/YYYY-MM-DD-baseline.json`

**Step 1: Create datasets directory structure**

```bash
mkdir -p datasets/{baselines,golden/transcripts,golden/expected,reports}
```

**Step 2: Export completed test runs via Supabase MCP**

Query Supabase for all completed test runs with their evaluations:
```sql
SELECT tr.id, tr.test_run_code, tr.overall_score, tr.status,
       pv.prompt_name, pv.version,
       e.overall_score as eval_score, e.model_used,
       COUNT(be.id) as battle_count
FROM test_runs tr
JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
LEFT JOIN evaluations e ON e.test_run_id = tr.id AND e.is_promoted = true
LEFT JOIN battle_evaluations be ON be.evaluation_id = e.id
WHERE tr.status = 'completed'
GROUP BY tr.id, pv.id, e.id
ORDER BY tr.started_at DESC
```

**Step 3: Export battle transcripts for baseline runs**

For each baseline test run, export `battle_results` with transcripts:
```sql
SELECT br.id, br.persona_id, br.outcome, br.score, br.turns,
       br.transcript, br.transcript_structured,
       br.avg_agent_latency_ms, br.max_agent_latency_ms,
       p.name as persona_name, p.category, p.difficulty
FROM battle_results br
JOIN personas p ON br.persona_id = p.id
WHERE br.test_run_id = '<test_run_id>'
```

**Step 4: Save as baseline JSON + metadata**

```json
// datasets/baselines/metadata.json
{
  "created": "2026-02-25",
  "test_runs": ["<id1>", "<id2>"],
  "prompt_versions": ["qual-audit-new-v3.0"],
  "total_battles": 20,
  "baseline_scores": {
    "overall": 7.5,
    "by_criterion": { ... }
  }
}
```

**Step 5: Commit**

```bash
git add datasets/
git commit -m "test: export baseline dataset from completed test runs"
```

---

### Task 8: Create prompt regression script

**Files:**
- Create: `scripts/prompt-regression.sh`

**Step 1: Write the regression script**

```bash
#!/bin/bash
# Prompt Regression Testing
# Usage:
#   ./scripts/prompt-regression.sh --baseline          # Save current as baseline
#   ./scripts/prompt-regression.sh --run               # Run test + compare with baseline
#   ./scripts/prompt-regression.sh --compare           # Compare last run with baseline (no new run)
#
# Env: BASE_URL (default http://localhost:3000)

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASELINE_DIR="datasets/baselines"
REPORT_DIR="datasets/reports"
THRESHOLD=1.0  # FAIL if any criterion drops > 1.0 points

run_test() {
  # 1. Find latest prompt version + promoted evaluator config
  # 2. POST /api/test-runs to launch a test
  # 3. Poll GET /api/test-runs/<id> until status=completed
  # 4. GET /api/evaluations?test_run_id=<id> for scores
  # 5. Save results to datasets/reports/YYYY-MM-DD-run.json
}

compare_with_baseline() {
  # 1. Load baseline from datasets/baselines/
  # 2. Load latest run from datasets/reports/
  # 3. Compute per-criterion delta
  # 4. Output: PASS (delta <= threshold), WARN (0.5-1.0), FAIL (> 1.0)
  # 5. Save comparison report
}

save_baseline() {
  # 1. Run test (or use latest)
  # 2. Copy results to datasets/baselines/
  # 3. Update metadata.json
}
```

**Step 2: Make executable and dry-run**

```bash
chmod +x scripts/prompt-regression.sh
./scripts/prompt-regression.sh --help
```

**Step 3: Commit**

```bash
git add scripts/prompt-regression.sh
git commit -m "test: add prompt regression script with baseline compare"
```

---

### Task 9: Run dedicated test for each prompt and generate reports

**Step 1: Run a full test cycle**

```bash
# Launch a test run with the current production prompt + all active personas
curl -X POST $BASE_URL/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{"prompt_version_id": "<LATEST>", "mode": "full_cycle", "max_iterations": 1}'
```

**Step 2: Validate Judge Evaluator (P3)**

After test completes, check:
- Scores follow the rules (timeout → max 4.0, turns > 35 → flow_control penalized)
- Criteria scores are in valid 1-10 range
- JSON output parses correctly
- Evidence fields populated

**Step 3: Validate Post-Loop Analyzer (P4)**

If analyzer ran, check:
- `test_runs.analysis_report` populated
- `insights` array has actionable items
- `suggestions` array has specific changes
- `insights_verification` shows mix of exact/pattern (not all unverified)

**Step 4: Validate Persona behavior (P2)**

Review battle transcripts:
- Persona stays in character per their description
- Difficulty matches declared level
- Conversation feels natural (not robotic)

**Step 5: Generate per-prompt report**

Save to `datasets/reports/2026-02-25-prompt-validation.json`:
```json
{
  "date": "2026-02-25",
  "prompts_tested": {
    "judge_evaluator": { "status": "PASS|WARN|FAIL", "issues": [] },
    "analyzer": { "status": "PASS|WARN|FAIL", "issues": [] },
    "optimizer_surgical": { "status": "PASS|WARN|FAIL", "issues": [] },
    "optimizer_full": { "status": "PASS|WARN|FAIL", "issues": [] },
    "persona_validator": { "status": "PASS|WARN|FAIL", "issues": [] },
    "persona_simulator": { "status": "PASS|WARN|FAIL", "issues": [] }
  }
}
```

**Step 6: Commit reports**

```bash
git add datasets/reports/
git commit -m "test: prompt validation reports for all 6 LLM prompts"
```

---

## Phase 2C: Dataset (Track 4)

### Task 10: Create golden set import script

**Files:**
- Create: `scripts/import-golden-set.sh`
- Create: `datasets/golden/manifest.json`

**Step 1: Write import script**

```bash
#!/bin/bash
# Import real call recordings into golden dataset
# Usage: ./scripts/import-golden-set.sh <input_dir>
#
# Expects: directory with transcript files (txt/json)
# Outputs: normalized transcripts in datasets/golden/transcripts/

INPUT_DIR="$1"
GOLDEN_DIR="datasets/golden"

normalize_transcript() {
  # Convert to transcript_structured JSONB format:
  # { turns: [{ speaker, message, timestamp_ms }] }
  # Handle multiple input formats (txt, json, csv)
}

for file in "$INPUT_DIR"/*; do
  normalize_transcript "$file"
done

# Update manifest
update_manifest() {
  # Add entry to manifest.json mapping file → scenario
}
```

**Step 2: Create empty manifest**

```json
// datasets/golden/manifest.json
{
  "created": "2026-02-25",
  "format_version": "1.0",
  "entries": []
}
```

**Step 3: Commit**

```bash
git add scripts/import-golden-set.sh datasets/golden/manifest.json
git commit -m "test: add golden set import script and manifest"
```

---

### Task 11: Create baseline comparison script

**Files:**
- Create: `scripts/compare-baseline.sh`

**Step 1: Write comparison script**

```bash
#!/bin/bash
# Compare a test run's results against golden set expected scores
# Usage: ./scripts/compare-baseline.sh <test_run_id>
#
# Loads golden/expected/*.json, compares with actual evaluation scores
# Outputs: comparison report with per-criterion deltas

TEST_RUN_ID="$1"
GOLDEN_DIR="datasets/golden/expected"
REPORT_DIR="datasets/reports"

# 1. Fetch test run evaluation scores from API
# 2. Load golden expected scores
# 3. Compute deltas per criterion
# 4. Output PASS/WARN/FAIL
# 5. Save report
```

**Step 2: Commit**

```bash
git add scripts/compare-baseline.sh
git commit -m "test: add golden set comparison script"
```

---

## Phase 3: Final Report

### Task 12: Generate consolidated testing report

**Files:**
- Create: `docs/testing/testing-report.md`

**Step 1: Merge all results**

Combine outputs from:
- `datasets/reports/smoke-*.json` (API tests)
- `docs/testing/ui-walkthrough.md` (UI checks)
- `docs/testing/feature-tests-p0-p2.md` (feature tests)
- `datasets/reports/*-prompt-validation.json` (prompt tests)
- `datasets/reports/*-baseline-compare.json` (regression)

**Step 2: Write report**

```markdown
# System Testing Report — 2026-02-25

## Summary
| Track | Status | Pass | Warn | Fail |
|-------|--------|------|------|------|
| API Smoke Tests | ✅/⚠️/❌ | X | Y | Z |
| UI Walkthrough | ✅/⚠️/❌ | X | Y | Z |
| P0-P2 Features | ✅/⚠️/❌ | X | Y | Z |
| Prompt Validation | ✅/⚠️/❌ | X | Y | Z |
| Regression Baseline | ✅/⚠️/❌ | X | Y | Z |

## Issues Found
[list of issues with severity and suggested fix]

## Prompt Health
[per-prompt pass/fail with details]

## Next Steps
[what to fix before UI optimization]
```

**Step 3: Commit**

```bash
git add docs/testing/
git commit -m "test: consolidated testing report"
```

---

## Task Dependencies

```
Task 1 (sync JSONs) ──→ Task 2 (extract prompts) ──→ Task 3 (update docs)
                                                          │
                              ┌────────────────────────────┤
                              ▼                            ▼
                    Task 4 (smoke script)        Task 7 (export baseline)
                    Task 5 (UI checklist)        Task 8 (regression script)
                    Task 6 (feature tests)       Task 9 (run prompt tests)
                              │                            │
                              ▼                            ▼
                    Task 10 (golden import)    Task 11 (compare script)
                              │                            │
                              └──────────┬─────────────────┘
                                         ▼
                              Task 12 (final report)
```

## Execution Notes

- **Subagent rule**: Tasks 1-3 (sync) and Task 7 (Supabase export) use MCP tools → MUST run in subagents
- **Parallel after Task 3**: Tasks 4-6 and 7-9 can run in parallel tracks
- **Task 9 requires running n8n**: Need live n8n instance for actual test runs
- **Task 10 awaits user**: Golden set import waits for real call recordings from user
- **Commits**: One commit per task, atomic

---

*Generated from design doc: `docs/plans/2026-02-25-full-system-testing-design.md`*
