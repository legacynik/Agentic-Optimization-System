# Full System Testing Plan — Design Document

> Validate every component, prompt, and workflow before UI optimization.

**Created**: 2026-02-25
**Status**: Approved
**Approach**: Parallel Tracks (B)

---

## Context

Pipeline trilogy complete (P0 T1-T4, P1 T5-T8, P2 T9-T12). Before touching UI, we need to:

1. Sync local workflow JSONs with live n8n (outdated since Jan 19-25)
2. Update workflow documentation
3. Validate every LLM prompt with real test runs + regression scripts
4. Create reusable datasets from DB test runs + real call recordings
5. E2E test all features across API, UI, and n8n

**Anti-bloat rule**: Every track runs via dedicated subagent. Main context is coordination only.

---

## Track Structure

```
Track 1: SYNC & DOCS        (prerequisite, 1 session)
Track 2: FEATURE E2E        (independent, checklist)
Track 3: PROMPT VALIDATION   (core, regression scripts)
Track 4: DATASET             (incremental, fed by Track 2+3)
```

---

## Track 1: Sync & Docs

### 1.1 Workflow JSON Sync

Download all 6 workflows from live n8n via MCP, save to canonical location.

| Workflow | n8n ID | Local Status |
|----------|--------|-------------|
| Test RUNNER | `XmpBhcUxsRpxAYPN` | Outdated (Jan 19/24) |
| Battle Agent | `Z35cpvwXt7Xy4Mgi` | Outdated (Jan 19/20) |
| Evaluator | `202JEX5zm3VlrUT8` | Outdated — P0/P1/P2 changes missing |
| Optimizer | `honcSigslEtpoVqy` | Outdated — T10 surgical mode missing |
| Personas Generator | `HltftwB9Bm8LNQsO` | Outdated (Jan 20) |
| Personas Validator | `aGlmWu7SPHw17eYQ` | **MISSING** — never exported |

**Actions**:
- Download 6 JSON via n8n MCP
- Save to `_project_specs/n8n/workflows/` (single canonical location)
- Remove or consolidate duplicates in `n8n workflows/` root directory
- Diff old vs new for each workflow, note changes

### 1.2 Docs Update

| File | Update |
|------|--------|
| `docs/n8n.md` | Workflow table (add Persona Validator), node counts, current LLM models |
| `_project_specs/n8n/CHANGELOG.md` | P2 entries (T10-T12 changes applied to workflows) |
| `_project_specs/n8n/README.md` | Sync with current state |

### 1.3 Prompt Reference Extraction

Extract every LLM prompt from the updated JSONs into `docs/prompts-reference.md`:
- System message, user message template, model, temperature
- One section per prompt (Judge, Analyzer, Optimizer, Persona Validator, Persona Generator)
- Dynamic prompts (Agent, Persona Simulator) documented with their DB source

---

## Track 2: Feature E2E Testing

### 2.1 API Smoke Tests

```
scripts/smoke-test.sh [--group core|triggers|eval|support|all]
```

4 endpoint groups, ~25 endpoints total:

| Group | Endpoints | Test |
|-------|-----------|------|
| **Core CRUD** | prompts, personas, evaluator-configs, test-runs | GET list, POST create, PATCH update, DELETE |
| **Workflow Triggers** | n8n/trigger, test-runs POST, generate-personas, personas/validate | Trigger + verify callback |
| **Evaluation Chain** | evaluations, re-evaluate, compare, cross-compare, promote | Full flow: run > evaluate > compare > promote |
| **Support** | dashboard/stats, trend, criteria, settings, battle-notes, reconcile | Correct responses, no 500s |

Per endpoint: valid payload (expect 200/201) + invalid payload (expect 400/422).
Results saved to `datasets/reports/smoke-YYYY-MM-DD.json`.

### 2.2 UI Walkthrough Checklist

| Page | Verify |
|------|--------|
| `/` Dashboard | KPI cards load, trend chart, radar, test runs table |
| `/test-launcher` | Select prompt + personas, launch, progress bar, abort |
| `/test-runs` | List with status filters, pagination |
| `/test-runs/[id]` | Detail, battle list, evaluations, re-evaluate modal, compare, latency stats (T11) |
| `/agentic` | Agent selector, health card, optimization panel (surgical/full T10), evidence badges (T12) |
| `/conversations` | 3-panel view, filters, transcript with latency badges (T11) |
| `/evaluators` | CRUD config, criteria editor, promote, LLM config |
| `/personas` | Generate, validate (T6), approve override, feedback, 4-state badges |
| `/prompts` | Version list, diff viewer, create new version |
| `/settings` | Webhook URLs, connectivity test per workflow |
| `/executive` | Placeholder redirect (verify no crash) |

### 2.3 P0/P1/P2 Feature-Specific Tests

| Feature | Specific Test |
|---------|---------------|
| P0-T1: Hybrid webhook | Trigger test run > callback arrives with correct format |
| P0-T2: Criteria taxonomy | Evaluator config with core+domain > scores respect weights |
| P0-T3: LLM rotation | Config with fallback model > if primary fails, uses fallback |
| P0-T4: Criteria snapshot | After evaluate, `criteria_snapshot` populated in DB |
| P1-T5: Analyzer flag | Re-evaluate with `run_analyzer=false` > skips analysis |
| P1-T6: Persona validator | Validate persona > score + status update |
| P1-T7: Parse resilience | Malformed JSON in evaluator > no crash, warning shown |
| P1-T8: Callback retry | Simulate stuck evaluation > reconcile resolves it |
| P2-T9: Eval A/B | Compare 2 evals > Config tab with model diff |
| P2-T10: Optimizer dual | Surgical vs full mode > diff size differs |
| P2-T11: Latency metrics | New battle > `transcript_structured` + UI badges |
| P2-T12: Quote verification | Analyzer with insights > `insights_verification` populated, traffic light UI |

---

## Track 3: Prompt Validation & Regression

### 3.1 Prompts to Test (6 total)

| # | Prompt | Location | What to Validate |
|---|--------|----------|------------------|
| P1 | **Battle Agent** (voice agent) | DB: `prompt_versions.content` | Conversation quality, objection handling, closing |
| P2 | **Persona Simulator** | DB: `personas.personaprompt` | Naturalness, profile coherence, calibrated difficulty |
| P3 | **Judge Evaluator** | n8n: "Judge Agent" `systemMessage` | Accurate scoring, rule compliance (timeout>max 4, turns>35>no flow) |
| P4 | **Post-Loop Analyzer** | n8n: "Analyzer" node | Actionable insights, verifiable evidence, pattern detection |
| P5 | **Optimizer** (surgical/full) | n8n: "Optimizer" node | Surgical=1 change only, full=quality rewrite, no regression |
| P6 | **Persona Validator** | n8n: workflow `aGlmWu7SPHw17eYQ` | Naturalness/coherence/testability scores coherent |

### 3.2 Regression Script

```
scripts/prompt-regression.sh <prompt_type> [--baseline] [--compare]

Workflow:
  --baseline   Execute test run, save results to datasets/baselines/
  (default)    Execute test run, compare with baseline
  --compare    Compare only (no new run)

Output: JSON report + tabular summary
  - Score delta per criterion
  - PASS/WARN/FAIL per metric
  - FAIL if score drops > 1 point on any criterion
```

### 3.3 Validation Process per Prompt

```
1. Run dedicated test with known personas (controlled input)
2. Capture raw LLM output
3. Score against expected behavior criteria
4. Compare with baseline (if exists)
5. Generate report: score, issues found, suggested fixes
```

---

## Track 4: Dataset Creation

### 4.1 Directory Structure

```
datasets/
├── baselines/           # Snapshots from historical test runs
│   ├── YYYY-MM-DD-baseline.json
│   └── metadata.json    # Which test runs, which prompt versions
├── golden/              # From real call recordings (when provided)
│   ├── transcripts/     # Normalized transcriptions
│   ├── expected/        # Expected evaluation scores
│   └── manifest.json    # File > scenario mapping
└── reports/             # Regression test output
    └── YYYY-MM-DD-report.json
```

### 4.2 Baseline from DB

Export completed test runs (H9C, J90, and later) as fixtures:
- Battle transcripts + scores
- Evaluation results + criteria scores
- Analyzer reports + evidence verification results

### 4.3 Golden Set from Real Calls

When real call recordings are provided:
- Normalize transcripts to match `transcript_structured` JSONB format
- Define expected evaluation scores (human-annotated)
- Create manifest mapping each file to a test scenario
- Use as ground truth for Judge prompt accuracy testing

---

## Execution Order

```
PHASE 0: PREP (this session)
  └── Write design doc + implementation plan

PHASE 1: SYNC & DOCS (Track 1) — prerequisite
  ├── T-1.1 to 1.2: Download JSONs, unify, update docs
  └── T-1.3: Extract prompt reference

PHASE 2: PARALLEL (after Phase 1)
  ├── Track 2: Feature E2E
  │   ├── Create scripts/smoke-test.sh
  │   ├── Execute API smoke tests
  │   ├── UI walkthrough checklist
  │   └── P0/P1/P2 feature-specific tests
  │
  ├── Track 3: Prompt Validation
  │   ├── Export baseline from DB test runs
  │   ├── Create scripts/prompt-regression.sh
  │   ├── Run dedicated tests for P1-P6
  │   └── Generate per-prompt reports
  │
  └── Track 4: Dataset
      ├── Export historical fixtures
      ├── (AWAITS) Import real call recordings
      └── Create golden set + manifest

PHASE 3: FINAL REPORT
  └── Merge all reports → testing-report.md with pass/fail summary
```

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| n8n MCP access | Required for Track 1 | Download workflow JSONs |
| Supabase access | Required for Track 3+4 | Export test run data |
| Real call recordings | Async (Track 4) | User provides when ready |
| Running n8n instance | Required for Track 2+3 | Execute test runs |

---

*Source: Brainstorming session 2026-02-25, Approach B (Parallel Tracks) approved.*
