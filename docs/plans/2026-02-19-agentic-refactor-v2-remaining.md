# Agentic Refactor v2 — Remaining Implementation Plan

**Date**: 2026-02-19
**Status**: Ready for implementation
**Estimated effort**: ~3-4h
**Spec**: `_project_specs/specs/agentic-refactor-v2.md`

---

## Context

Adversarial review revealed ~70% of the spec is already implemented. This plan covers ONLY the remaining gaps found during codebase exploration.

### Already Done (no work needed)
- Phase 1 (Cleanup): mock files already removed
- Phase 2 (Database): `analysis_report` + `analyzed_at` columns exist (migration 004)
- Phase 3 (API): `/api/prompts/names`, `/api/n8n/trigger`, `/api/n8n/webhook` all built
- Phase 4 (Components): All 5 components exist (`agent-selector`, `health-monitor`, `agent-details`, `optimization-panel`, `n8n-status-bar`)
- Phase 5 (Page rewrite): `/agentic/page.tsx` fully rewritten with hooks
- Phase 7 partial: Evaluator post-loop analyzer nodes exist (PG Aggregate → LLM Analyzer → Code Parser → Save Report)
- Optimizer workflow JSON exists (`n8n workflows/Prompt-Optimizer.json`, ID: `honcSigslEtpoVqy`)

---

## Tasks (ordered by dependency)

### T1: Fix webhook handler — persist analysis_report [BUG FIX]

**File**: `app/api/n8n/webhook/route.ts`
**Problem**: `handleAnalyzerCallback` (lines 272-293) only writes `failure_patterns`, `strengths`, `weaknesses`. Drops `analysis_report` and `analyzed_at`.
**Impact**: If analyzer is triggered via separate callback (not evaluator post-loop), data is lost.
**Note**: The evaluator's "Save Report" node writes directly to DB via PostgreSQL, so the post-loop path works. But the webhook path is broken.

**Fix**:
```typescript
// In handleAnalyzerCallback, add:
analysis_report: result.analysis || null,
analyzed_at: new Date().toISOString(),
```

Also fix `handleEvaluatorCallback` to forward `result.analysis` if present (evaluator may include analysis in its completed callback).

**Effort**: 15 min

---

### T2: Fix partial outcome count in use-agent-health [BUG FIX]

**File**: `hooks/use-agent-health.ts`
**Problem**: Line 185: `partial: 0` hardcoded. The hook only uses `success_count` and `failure_count` from test_runs.
**Impact**: Outcome bars in Health Monitor show 0% partial always.

**Fix**: Fetch `partial_count` from API if available, or calculate as `total_battles - success_count - failure_count`. The `test_runs` table doesn't have `partial_count` but `battle_results` has `outcome='partial'` rows. Options:
1. Add `partial_count` to `updateTestRunAggregates` in webhook handler (preferred)
2. Calculate client-side from total

**Effort**: 20 min

---

### T3: Verify Optimizer workflow deployment + workflow_configs [INFRA]

**Problem**: Optimizer JSON exists in repo but unknown if deployed to Railway n8n. Also unknown if `workflow_configs` has a row for `optimizer` type.

**Actions**:
1. Check n8n MCP: list workflows, verify `honcSigslEtpoVqy` exists and is active
2. Check Supabase: `SELECT * FROM workflow_configs WHERE workflow_type = 'optimizer'`
3. If missing, insert row with correct webhook URL
4. Test trigger via `/api/n8n/trigger` with a completed test_run that has analysis_report

**Effort**: 30 min

---

### T4: Validate + document LLM prompts [NEEDS_OPTIMIZATION]

**Problem**: Two LLM prompts exist in n8n workflows but have never been tested with the optimization test infrastructure.

**Prompts to flag**:

#### PROMPT 1: LLM Analyzer (Evaluator workflow `202JEX5zm3VlrUT8`)
- **Node**: "LLM Analyzer"
- **System prompt**: "You are a Voice Agent Performance Analyst..." (Italian B2B focused)
- **User prompt**: "Analyze this test run and identify patterns in failures..."
- **Output format**: JSON with summary, top_issues, strengths, suggestions
- **Status**: `NEEDS_OPTIMIZATION` — hardcoded to Italian B2B voice agent, should be more generic or configurable
- **Risk**: Works only for current use case, breaks for other agent types

#### PROMPT 2: LLM Optimize (Optimizer workflow `honcSigslEtpoVqy`)
- **Node**: "LLM Optimize"
- **Prompt**: "Sei un esperto di prompt engineering. Ottimizza il prompt..."
- **Output**: Complete new prompt text
- **Status**: `NEEDS_OPTIMIZATION` — too simple, no structured output format, no guardrails
- **Risk**: LLM might return wrapped text instead of raw prompt, no validation of output quality

**Action**: Document these in the spec file with NEEDS_OPTIMIZATION tag. Do NOT modify prompts now — wait for test infrastructure.

**Effort**: 15 min

---

### T5: Wire draft approval minimal flow [FEATURE]

**Depends on**: T3 (optimizer must be deployed)

**Problem**: Optimizer creates draft `prompt_version` (status='draft') but there's no UI to approve/discard it.

**Scope** (MINIMAL — no chat refinement):
1. **PromptVersionsHub**: Show draft versions with "Draft" badge
2. **Draft actions**: "Approve" (set status='testing') + "Discard" (delete)
3. **Diff view**: Show diff between draft and parent version (using `created_from` FK)
4. **API**: `PATCH /api/prompt-versions/[id]` already exists — verify it handles status transitions

**Files to modify**:
- `components/version-centric/prompt-versions-hub.tsx` — add draft badge + approve/discard buttons
- `app/api/prompt-versions/[id]/route.ts` — verify PATCH handles `status: 'testing'` and DELETE for drafts

**NOT in scope** (deferred to future):
- Chat-based prompt refinement
- Live draft editing
- "Lancia Test con nuova versione" auto-trigger

**Effort**: 1.5h

---

### T6: E2E test full Analyzer → Optimizer → Draft flow [VERIFICATION]

**Depends on**: T1-T5

**Steps**:
1. Run a test via Test Launcher
2. Wait for completion + evaluation + analysis
3. Verify `analysis_report` populated in DB
4. Open Agent Health Monitor, verify data shows
5. Click "Optimize" with suggestions selected
6. Verify draft prompt_version created
7. Open Prompts page, verify draft visible
8. Approve draft, verify status change

**Effort**: 30 min

---

## Summary

| Task | Type | Effort | Depends |
|------|------|--------|---------|
| T1: Fix webhook analysis_report | Bug fix | 15 min | - |
| T2: Fix partial outcome count | Bug fix | 20 min | - |
| T3: Verify optimizer deployment | Infra | 30 min | - |
| T4: Document LLM prompts | Doc | 15 min | - |
| T5: Wire draft approval flow | Feature | 1.5h | T3 |
| T6: E2E test | Verification | 30 min | T1-T5 |
| **Total** | | **~3.5h** | |

## Subagent Strategy

- T1 + T2: Can be done in parallel (independent bug fixes)
- T3: Sequential (needs MCP tools for n8n/Supabase verification)
- T4: Can be done in parallel with T1/T2 (documentation only)
- T5: Sequential after T3 (needs optimizer working)
- T6: Sequential after everything

## n8n LLM Prompts — NEEDS_OPTIMIZATION Registry

| Workflow | Node | Prompt Purpose | Status | Notes |
|----------|------|---------------|--------|-------|
| Evaluator `202JEX5zm3VlrUT8` | LLM Analyzer | Analyze battle failures, generate suggestions | NEEDS_OPTIMIZATION | Hardcoded to Italian B2B voice agent |
| Optimizer `honcSigslEtpoVqy` | LLM Optimize | Generate optimized prompt from suggestions | NEEDS_OPTIMIZATION | No structured output, no guardrails |
