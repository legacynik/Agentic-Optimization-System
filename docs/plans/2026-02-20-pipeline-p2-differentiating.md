# P2: Pipeline Differentiating Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add four differentiating features that elevate the pipeline from functional to intelligent: enhanced A/B eval comparison, optimizer surgical mode, latency metrics from transcripts, and post-analyzer evidence verification.

**Architecture:** All four tasks follow the "workflow generici, configurazione specifica" principle — n8n workflows are domain-agnostic engines, all configuration lives in Supabase. T9 is mostly UI polish on existing infra. T10 adds a mode switch to the existing optimizer. T11 requires a transcript format change (biggest effort). T12 adds a new n8n Code node post-analyzer.

**Tech Stack:** Next.js 14 API Routes, Supabase (PostgreSQL), n8n workflows, React 18 + shadcn/ui, TypeScript

**Dependencies:** P0 (T1-T4) DONE, P1 (T5-T8) should be DONE or in progress. T10 depends on P1-T5 (analyzer flag). T12 depends on P1-T5 (analyzer must exist).

---

## Execution Order & Parallelization

```
T9 (Eval A/B Enhancement)  ────── INDEPENDENT, start anytime
T10 (Optimizer Dual Mode)  ────── Requires P1-T5 (analyzer flag)
T11 (Latency Metrics)      ────── INDEPENDENT, biggest task
T12 (Quote Verification)   ────── Requires P1-T5 (analyzer exists)

Parallel groups:
  Agent A: T9 → T12  (both touch evaluator/compare UI)
  Agent B: T11        (independent, transcript changes)
  Agent C: T10        (independent, optimizer workflow)
```

---

## T9: Eval A/B Testing Enhancement

> Enhance the existing A/B compare infrastructure to surface all available data: criteria snapshot diffs, model/token comparisons, and optional cross-test-run comparison.

**Existing infra (already works):**
- `evaluations` supports multiple per test_run (UNIQUE on test_run_id + evaluator_config_id)
- `GET /api/evaluations/[id]/compare/[otherId]` returns full comparison with criteria deltas
- `EvaluationCompareView` component with 3 tabs (Overview, Criteria, Per Persona)
- `ReEvaluateModal` with evaluator config picker

**Files:**
- Modify: `components/evaluation-compare-view.tsx` — add model/token diff, snapshot diff display
- Modify: `app/api/evaluations/[id]/compare/[otherId]/route.ts` — add model_used + tokens_used in response
- Create: `app/api/evaluations/cross-compare/route.ts` — cross-test-run comparison endpoint
- Test: `tests/eval-compare.spec.ts`

### Step 1: Read current compare API response

Read: `app/api/evaluations/[id]/compare/[otherId]/route.ts`
Understand what fields are already returned vs missing.

### Step 2: Enhance compare API — add model & token fields

Modify: `app/api/evaluations/[id]/compare/[otherId]/route.ts`

Add to the response object:
```typescript
// After existing fields, add:
model_comparison: {
  eval_a: { model_used: evalA.model_used, tokens_used: evalA.tokens_used },
  eval_b: { model_used: evalB.model_used, tokens_used: evalB.tokens_used },
  same_model: evalA.model_used === evalB.model_used,
},
```

### Step 3: Run existing tests to verify no regression

Run: `pnpm exec playwright test tests/ --grep "compare|evaluation" -v`
Expected: existing tests pass

### Step 4: Update EvaluationCompareView — add Model tab

Modify: `components/evaluation-compare-view.tsx`

Add a 4th tab "Config" that shows:
- Model A vs Model B (with "same/different" badge)
- Tokens used A vs B (with delta)
- Criteria snapshot diff (the API already returns `criteria_snapshot_diff` — render it)

```tsx
// New tab content:
<TabsContent value="config">
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Evaluation A</CardTitle></CardHeader>
        <CardContent>
          <p>Model: {data.model_comparison.eval_a.model_used ?? 'N/A'}</p>
          <p>Tokens: {data.model_comparison.eval_a.tokens_used?.toLocaleString() ?? 'N/A'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Evaluation B</CardTitle></CardHeader>
        <CardContent>
          <p>Model: {data.model_comparison.eval_b.model_used ?? 'N/A'}</p>
          <p>Tokens: {data.model_comparison.eval_b.tokens_used?.toLocaleString() ?? 'N/A'}</p>
        </CardContent>
      </Card>
    </div>
    {data.criteria_snapshot_diff && (
      <CriteriaSnapshotDiff diff={data.criteria_snapshot_diff} />
    )}
  </div>
</TabsContent>
```

### Step 5: Create cross-test-run compare endpoint

Create: `app/api/evaluations/cross-compare/route.ts`

```typescript
// GET /api/evaluations/cross-compare?eval_a=UUID&eval_b=UUID
// Same logic as single-test-run compare but WITHOUT the test_run_id check
// Returns same response shape as existing compare endpoint
```

This enables comparing evaluations across different test runs (e.g., compare v2.0 eval vs v3.0 eval).

### Step 6: Add cross-compare button to evaluations list

Modify: `components/evaluations-list.tsx`

When user selects 2 evaluations from DIFFERENT test runs (via a global evaluation picker), enable "Cross Compare" button that calls the new endpoint.

### Step 7: Commit

```bash
git add app/api/evaluations/ components/evaluation-compare-view.tsx components/evaluations-list.tsx
git commit -m "feat(T9): enhance eval A/B compare — model/token diff, cross-test-run support"
```

---

## T10: Optimizer Dual Mode (Surgical vs Full)

> Add `optimizer_mode: 'surgical' | 'full'` to the optimizer trigger. Surgical mode makes exactly 1 targeted change per suggestion. Full mode rewrites freely. Dashboard lets user pick mode.

**Existing infra:**
- Optimizer workflow `honcSigslEtpoVqy` exists and works (tested in session 12)
- `POST /api/n8n/trigger` with `workflow_type: 'optimizer'` sends `selected_suggestions` + `human_feedback`
- `OptimizationPanel` component has suggestion checkboxes + feedback textarea
- `optimization_history` table tracks from/to versions with `optimization_type` and `changes_made`

**Files:**
- Modify: `app/api/n8n/trigger/route.ts` — add `optimizer_mode` to payload
- Modify: `components/version-centric/prompt-versions-hub.tsx` (or wherever OptimizationPanel lives) — add mode selector
- Modify: n8n workflow `honcSigslEtpoVqy` — branch on mode, adjust LLM prompt
- Modify: `supabase/migrations/` — add `optimizer_mode` to `optimization_history`
- Create: `supabase/migrations/015_p2_differentiating.sql`

### Step 1: Create DB migration

Create: `supabase/migrations/015_p2_differentiating.sql`

```sql
-- P2: Differentiating Features

-- T10: Optimizer dual mode
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS optimizer_mode VARCHAR(20) DEFAULT 'full';
-- Values: 'surgical', 'full'

-- T10: Circuit breaker
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS optimization_round INTEGER DEFAULT 1;
-- Track which round this is (max_optimization_rounds in workflow_configs)

-- T11: Latency metrics (structured transcript)
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS transcript_structured JSONB;
-- { turns: [{ speaker: string, message: string, timestamp_ms: number }] }
-- Keep existing `transcript` column for backward compat

ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS avg_agent_latency_ms INTEGER;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS max_agent_latency_ms INTEGER;

ALTER TABLE battle_evaluations ADD COLUMN IF NOT EXISTS latency_context JSONB;
-- { avg_agent_latency_ms, max_agent_latency_ms, slow_turns: number }
-- Passed to Judge for temporal scoring

-- T12: Quote verification
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS insights_verification JSONB;
-- [{ insight_index: number, evidence_index: number, status: 'exact'|'pattern'|'unverified', matched_in: string }]
```

### Step 2: Apply migration locally

Run: `supabase db push` or apply via Supabase MCP
Expected: migration succeeds, new columns visible

### Step 3: Add optimizer_mode to trigger API

Modify: `app/api/n8n/trigger/route.ts`

In the optimizer case, add `optimizer_mode` to the payload sent to n8n:
```typescript
// In the optimizer trigger section:
const payload = {
  execution_id: crypto.randomUUID(),
  workflow_type: 'optimizer',
  test_run_id: body.test_run_id,
  selected_suggestions: body.selected_suggestions,
  human_feedback: body.human_feedback,
  optimizer_mode: body.optimizer_mode || 'full', // NEW
  callback_url: `${appUrl}/api/n8n/webhook`,
  timestamp: new Date().toISOString(),
};
```

### Step 4: Add mode selector to OptimizationPanel UI

Find the OptimizationPanel component and add a radio group:
```tsx
<RadioGroup value={optimizerMode} onValueChange={setOptimizerMode}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="full" id="mode-full" />
    <Label htmlFor="mode-full">Full Rewrite</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="surgical" id="mode-surgical" />
    <Label htmlFor="mode-surgical">Surgical (1 change per suggestion)</Label>
  </div>
</RadioGroup>
```

### Step 5: Update n8n optimizer workflow — add mode branching

Use n8n MCP to update workflow `honcSigslEtpoVqy`:
- After webhook receive, add IF node: `{{ $json.optimizer_mode === 'surgical' }}`
- **Surgical path**: LLM prompt says "Make EXACTLY ONE targeted change based on this suggestion. Do NOT modify any other part of the prompt. Preserve all existing text except the specific section addressed by the suggestion."
- **Full path**: existing LLM prompt (no change)

### Step 6: Add circuit breaker config

Seed `workflow_configs` with optimizer circuit breaker:
```sql
UPDATE workflow_configs
SET config = config || '{"max_optimization_rounds": 3, "regression_threshold": 1.0}'::jsonb
WHERE workflow_type = 'optimizer';
```

### Step 7: Update optimization_history on callback

Modify: `app/api/n8n/webhook/route.ts` — when optimizer callback arrives, save `optimizer_mode` and `optimization_round` to `optimization_history`.

### Step 8: Commit

```bash
git add supabase/migrations/015_p2_differentiating.sql app/api/n8n/ components/
git commit -m "feat(T10): optimizer dual mode — surgical vs full, circuit breaker config"
```

---

## T11: Latency Metrics from Chat History

> Extract per-turn timestamps from battle transcripts. Pre-process into latency stats. Pass to Judge for temporal scoring. Display in transcript viewer.

**This is the largest T in P2.** The core challenge: the n8n Battle Agent must include timestamps per turn, and the transcript format changes from unstructured text to structured JSONB.

**Files:**
- Modify: n8n Battle Agent workflow `Z35cpvwXt7Xy4Mgi` — add timestamp per turn in transcript output
- Modify: n8n Evaluator workflow `202JEX5zm3VlrUT8` — pre-process latency stats, pass to Judge
- Modify: `components/conversation-transcript.tsx` — display latency per turn
- Migration already in `015_p2_differentiating.sql` (Step 1 of T10)
- Modify: `app/api/test-runs/[id]/route.ts` — return structured transcript + latency stats

### Step 1: Understand current Battle Agent transcript format

Use n8n MCP to read Battle Agent workflow `Z35cpvwXt7Xy4Mgi` structure.
Identify where transcript is assembled (likely a Code node that concatenates "Speaker: message\n\n").

### Step 2: Update Battle Agent — structured transcript with timestamps

Modify the transcript assembly Code node in n8n to output:
```javascript
// Instead of: transcript += `${speaker}: ${message}\n\n`
// Output structured format:
const turn = {
  speaker: speaker,     // 'Agent' or 'User'
  message: message,
  timestamp_ms: Date.now(),
};
turns.push(turn);

// Save both formats for backward compat:
// transcript (text) = existing format for legacy
// transcript_structured (JSONB) = new format with timestamps
```

### Step 3: Update Battle Agent — save both transcript formats

In the "Save Battle Result" node, save:
```javascript
{
  transcript: turnsToText(turns),              // legacy format
  transcript_structured: { turns: turns },      // new structured format
  avg_agent_latency_ms: calculateAvgLatency(turns),
  max_agent_latency_ms: calculateMaxLatency(turns),
}
```

Latency calculation:
```javascript
function calculateLatency(turns) {
  const agentLatencies = [];
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].speaker === 'Agent') {
      const latency = turns[i].timestamp_ms - turns[i-1].timestamp_ms;
      agentLatencies.push(latency);
    }
  }
  return {
    avg: Math.round(agentLatencies.reduce((a,b) => a+b, 0) / agentLatencies.length),
    max: Math.max(...agentLatencies),
    slow_turns: agentLatencies.filter(l => l > 10000).length, // >10s
  };
}
```

### Step 4: Update Evaluator — pre-process latency context for Judge

Modify n8n Evaluator workflow `202JEX5zm3VlrUT8`:
- Before Judge Agent call, add Code node "Prepare Latency Context"
- Reads `battle_results.transcript_structured` and `avg_agent_latency_ms`
- Injects into Judge system prompt as context:

```
## Temporal Context
- Average agent response time: {avg_agent_latency_ms}ms
- Maximum response time: {max_agent_latency_ms}ms
- Slow turns (>10s): {slow_turns}
Consider response latency when evaluating the agent's performance.
```

Save latency context to `battle_evaluations.latency_context`.

### Step 5: Update ConversationTranscript component — show latency

Modify: `components/conversation-transcript.tsx`

```tsx
// When transcript_structured is available, use it instead of text parsing
// Show latency badge per agent turn:
{turn.speaker === 'Agent' && latency && (
  <Badge variant={latency > 10000 ? 'destructive' : latency > 5000 ? 'warning' : 'secondary'}>
    {(latency / 1000).toFixed(1)}s
  </Badge>
)}
```

### Step 6: Update test-run detail API — return latency stats

Modify: `app/api/test-runs/[id]/route.ts`

Include `avg_agent_latency_ms`, `max_agent_latency_ms`, and `transcript_structured` in battle results response.

### Step 7: Add latency summary to test run detail page

Show aggregate latency stats in the test run detail header:
- Average response time across all battles
- Slowest battle (persona name + latency)
- % of turns with >10s response time

### Step 8: Backward compatibility — handle old transcripts

`ConversationTranscript` component should check:
```tsx
const hasStructured = battle.transcript_structured?.turns?.length > 0;
// If structured → use new renderer with latency badges
// If not → fall back to existing text parser
```

### Step 9: Commit

```bash
git add components/conversation-transcript.tsx app/api/test-runs/ supabase/migrations/
git commit -m "feat(T11): latency metrics — structured transcripts, per-turn timing, Judge context"
```

---

## T12: Quote Verification (Post-Analyzer Evidence Checking)

> Add a verification step after the LLM Analyzer runs. Check each `evidence` string in `analysis_report.insights[]` against actual transcript content. Tag as exact/pattern/unverified.

**Files:**
- Modify: n8n Evaluator workflow `202JEX5zm3VlrUT8` — add "Verify Evidence" Code node after Analyzer
- Modify: Analyzer LLM system prompt — enforce exact quote vs pattern format
- Create: UI component for evidence traffic light badges
- Modify: `components/agentic/agent-details.tsx` (or wherever insights are displayed) — show verification status
- Migration already in `015_p2_differentiating.sql`

### Step 1: Update Analyzer system prompt — enforce evidence format

In `evaluator_configs.system_prompt_template` (or in the n8n Analyzer node prompt), add:

```
EVIDENCE FORMAT RULES (MANDATORY):
You MUST use one of two formats for the "evidence" field in each insight:
1. EXACT QUOTE: Copy-paste the exact phrase from the transcript in quotation marks, with turn number. Example: "Turn 5: 'Capisco la sua preoccupazione, mi permetta di spiegarle'"
2. PATTERN: Write 'Pattern observed across N conversations: [description]'. Example: "Pattern observed across 4 conversations: agent tends to ask multiple questions in a single turn"
NEVER paraphrase a specific quote. Either quote exactly or describe the pattern.
```

### Step 2: Add "Verify Evidence" Code node in n8n Evaluator

After the Analyzer completes and saves `analysis_report`, add a Code node:

```javascript
// Input: analysis_report (from Analyzer output) + all battle transcripts
const report = $json.analysis_report;
const transcripts = $json.all_transcripts; // array of transcript texts

const verification = [];

if (report.insights) {
  for (let i = 0; i < report.insights.length; i++) {
    const insight = report.insights[i];
    if (!insight.evidence) continue;

    for (let j = 0; j < insight.evidence.length; j++) {
      const evidence = insight.evidence[j];
      let status = 'unverified';
      let matched_in = null;

      // Tier 1: Exact substring match
      for (const transcript of transcripts) {
        // Extract quoted text from evidence
        const quoteMatch = evidence.match(/'([^']+)'|"([^"]+)"/);
        if (quoteMatch) {
          const quote = quoteMatch[1] || quoteMatch[2];
          if (transcript.includes(quote)) {
            status = 'exact';
            matched_in = 'transcript';
            break;
          }
        }
      }

      // Tier 2: Pattern summary detection
      if (status === 'unverified') {
        const patternPhrases = ['pattern observed', 'across', 'conversations', 'generally', 'tends to', 'consistently'];
        const isPattern = patternPhrases.some(p => evidence.toLowerCase().includes(p));
        if (isPattern) {
          status = 'pattern';
        }
      }

      verification.push({
        insight_index: i,
        evidence_index: j,
        status: status,
        matched_in: matched_in,
      });
    }
  }
}

return { insights_verification: verification };
```

### Step 3: Save verification to DB

After the Code node, update `test_runs.insights_verification` with the verification array:
```sql
UPDATE test_runs SET insights_verification = $1 WHERE id = $2
```

### Step 4: Update analysis report display — traffic light badges

Modify the component that displays `analysis_report.insights` (likely in `components/agentic/agent-details.tsx`):

```tsx
// For each evidence item, look up its verification status
function EvidenceBadge({ status }: { status: 'exact' | 'pattern' | 'unverified' }) {
  const config = {
    exact: { color: 'bg-green-500', label: 'Verified', icon: CheckCircle },
    pattern: { color: 'bg-yellow-500', label: 'Pattern', icon: AlertCircle },
    unverified: { color: 'bg-red-500', label: 'Unverified', icon: XCircle },
  };
  const c = config[status];
  return (
    <Badge className={c.color}>
      <c.icon className="h-3 w-3 mr-1" />
      {c.label}
    </Badge>
  );
}
```

### Step 5: Update test-run detail API — return insights_verification

Modify: `app/api/test-runs/[id]/route.ts`

Include `insights_verification` in the response when fetching a test run.

### Step 6: Commit

```bash
git add app/api/ components/agentic/ supabase/migrations/
git commit -m "feat(T12): quote verification — 3-tier evidence checking, traffic light UI"
```

---

## Summary — All Tasks

| Task | Scope | Key Changes | Dependencies |
|------|-------|-------------|--------------|
| T9: Eval A/B Enhancement | Small | Compare API + UI polish, cross-test-run compare | None (existing infra) |
| T10: Optimizer Dual Mode | Medium | API mode param, n8n IF branch, circuit breaker | P1-T5 (analyzer flag) |
| T11: Latency Metrics | Large | Transcript format change, n8n Battle Agent, pre-processing, UI | None (but breaks transcript format) |
| T12: Quote Verification | Medium | n8n post-analyzer Code node, evidence matching, traffic light UI | P1-T5 (analyzer exists) |

## Risk Register

| Risk | Mitigation |
|------|-----------|
| T11 transcript format is a breaking change | Keep `transcript` (text) alongside `transcript_structured` (JSONB). Fallback in UI. |
| T12 verification is heuristic (regex-based) | Tier system acknowledges limitations. Prompt improvement is primary defense, verification is safety net. |
| T10 surgical mode may produce worse results | Circuit breaker: if draft score >1 point worse → auto-block with "regression detected" flag. |
| T9 cross-compare across test runs may compare apples to oranges | UI warning when comparing across runs with different prompt versions. |

## Migration Checklist

- [ ] Backup production DB before applying `015_p2_differentiating.sql`
- [ ] Migration has DOWN section for rollback
- [ ] All new columns are nullable (backward compatible)
- [ ] Test on local Supabase first

---

*Source: Brainstorming decisions P2 items #9-12 from `docs/plans/2026-02-19-pipeline-architecture-decisions.md`*
