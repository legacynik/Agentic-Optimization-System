# Dashboard Realignment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 critical bugs, rewrite 3 DOWN pages on new schema, reorganize navigation into 4 hubs, clean up dead code.

**Architecture:** All pages migrate from dead `personas_performance` view (old_* tables) to direct queries via new API routes on new schema (test_runs, battle_results, battle_evaluations, evaluations, evaluator_configs). Navigation restructured into 4 hubs: Dashboard, Testing, Configuration, Intelligence.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Recharts, shadcn/ui, Zustand, React Query

**Design doc:** `docs/plans/2026-02-18-dashboard-realignment-design.md`

**Adversarial review:** 13 findings addressed in v2 of this plan (2026-02-19)

---

## Phase 1: Fix Critical Bugs

### Task 1: Fix normalizeTestRun API wrapper bug

**Files:**
- Modify: `hooks/use-test-run-status.ts:85-92`

**Context:** The API at `/api/test-runs/[id]` returns `apiSuccess(response)` which wraps data in `{ success: true, data: {...}, error: null }`. But `fetchTestRun()` passes the entire wrapper to `normalizeTestRun()` instead of extracting `.data` first. This makes all test run fields default to empty strings/0 because none of the real fields exist at the wrapper level.

**Step 1: Fix the fetchTestRun function**

In `hooks/use-test-run-status.ts`, change line 91 from:
```typescript
const raw = await res.json()
return normalizeTestRun(raw)
```
to:
```typescript
const raw = await res.json()
return normalizeTestRun(raw.data)
```

**Step 2: Verify the dev server loads without errors**

Run: `pnpm dev` and navigate to `/test-launcher` — launch a check on an existing test run. Verify:
- Status monitor shows correct status (not "pending" for a completed run)
- Score shows a real number (not 0)
- Success/failure/timeout counts are correct

**Step 3: Commit**

```bash
git add hooks/use-test-run-status.ts
git commit -m "fix: extract .data from API response in normalizeTestRun"
```

---

### Task 2: Fix re-evaluate — add n8n webhook trigger + error recovery

**Files:**
- Modify: `app/api/evaluations/re-evaluate/route.ts`

**Context:** The re-evaluate endpoint creates a `pending` evaluation in DB but never triggers n8n. The UI polls for status changes, but nothing processes the evaluation. We need to trigger the n8n evaluator webhook after creating the evaluation, and handle failures by setting evaluation status to `failed` so the user isn't stuck with a permanent `pending` record.

**Step 1: Add n8n trigger with error recovery after evaluation creation**

In `app/api/evaluations/re-evaluate/route.ts`, after the successful insert (line 145, after `console.log`), add n8n webhook trigger code:

```typescript
// Step 5: Trigger n8n evaluator workflow
const { data: webhookConfig } = await supabase
  .from('workflow_configs')
  .select('webhook_url, is_active')
  .eq('workflow_type', 'evaluator')
  .single()

if (webhookConfig?.webhook_url && webhookConfig.is_active) {
  try {
    const triggerPayload = {
      test_run_id: body.test_run_id,
      evaluation_id: newEvaluation.id,
      evaluator_config_id: body.evaluator_config_id,
      triggered_by: 'manual',
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/n8n/webhook`,
      timestamp: Date.now()
    }

    const webhookResponse = await fetch(webhookConfig.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': process.env.N8N_SECRET || ''
      },
      body: JSON.stringify(triggerPayload)
    })

    if (!webhookResponse.ok) {
      console.error('[evaluations/re-evaluate] n8n webhook failed:', webhookResponse.status)
      // Mark evaluation as failed so user isn't stuck with permanent pending
      await supabase
        .from('evaluations')
        .update({ status: 'failed', error_message: `n8n webhook returned ${webhookResponse.status}` })
        .eq('id', newEvaluation.id)
    } else {
      console.log(`[evaluations/re-evaluate] n8n evaluator triggered for evaluation ${newEvaluation.id}`)
      // Mark as running since n8n accepted the request
      await supabase
        .from('evaluations')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', newEvaluation.id)
    }
  } catch (webhookError) {
    console.error('[evaluations/re-evaluate] Failed to trigger n8n:', webhookError)
    // Mark evaluation as failed with error details
    await supabase
      .from('evaluations')
      .update({
        status: 'failed',
        error_message: webhookError instanceof Error ? webhookError.message : 'n8n webhook unreachable'
      })
      .eq('id', newEvaluation.id)
  }
} else {
  // No webhook configured — mark as failed immediately
  await supabase
    .from('evaluations')
    .update({ status: 'failed', error_message: 'No evaluator webhook configured. Check Settings.' })
    .eq('id', newEvaluation.id)
}
```

**Step 2: Verify the re-evaluate modal works end-to-end**

1. Navigate to `/test-runs/[id]` for a completed test run
2. Click "Re-evaluate" → select an evaluator config → submit
3. Check server logs for `[evaluations/re-evaluate] n8n evaluator triggered` message
4. Verify the modal polls and eventually shows completion (or shows failure with message)

**Step 3: Commit**

```bash
git add app/api/evaluations/re-evaluate/route.ts
git commit -m "fix: trigger n8n evaluator webhook on re-evaluate with error recovery"
```

---

### Task 3: Fix personas page — add prompt selector

**Files:**
- Modify: `app/personas/page.tsx`

**Context:** The personas page passes `promptName=""` to `PersonaWorkshop`. When empty, `fetchPersonasFromAPI("")` skips the `created_for_prompt` filter and shows all personas — this is correct behavior for a "show all" page. However, the "Generate" button calls `triggerPersonaGeneration(promptName, promptVersion)` which passes empty strings to n8n, and `createPersona()` sets `created_for_prompt: ""` — both are broken without a prompt context.

**Fix:** Add a prompt version selector at the top of the page. When no prompt is selected, show all personas (read-only). When a prompt is selected, enable generation and creation.

**Step 1: Update personas page with prompt selector**

```typescript
// app/personas/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PersonaWorkshop } from '@/components/version-centric/persona-workshop'

interface PromptOption {
  id: string
  prompt_name: string
  version: string
}

export default function PersonasPage() {
  const [prompts, setPrompts] = useState<PromptOption[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<PromptOption | null>(null)

  useEffect(() => {
    fetch('/api/prompts/names')
      .then(r => r.json())
      .then(result => {
        if (result.data) setPrompts(result.data)
      })
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Personas</h1>
        <Select
          value={selectedPrompt?.id || 'all'}
          onValueChange={(val) => {
            if (val === 'all') setSelectedPrompt(null)
            else setSelectedPrompt(prompts.find(p => p.id === val) || null)
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by prompt..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Personas</SelectItem>
            {prompts.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.prompt_name} v{p.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PersonaWorkshop
        promptName={selectedPrompt?.prompt_name || ''}
        promptVersion={selectedPrompt?.version || ''}
      />
    </div>
  )
}
```

**Step 2: Verify personas page works**

1. Navigate to `/personas` — verify all personas load (no prompt selected)
2. Select a prompt from dropdown — verify list filters to that prompt's personas
3. Click "Generate" with a prompt selected — verify n8n triggers correctly
4. Verify "Validate" / "Reject" actions work

**Step 3: Commit**

```bash
git add app/personas/page.tsx
git commit -m "fix: add prompt selector to personas page for generation context"
```

---

### Task 4: Delete dead orphaned components and old query module

**Files:**
- Delete: `components/generate-personas-button.tsx`
- Delete: `components/personas/persona-generator.tsx`
- Delete: `lib/queries.ts` (dead — all functions read from empty `personas_performance` view)
- Delete: `components/conversation-explorer.tsx` (replaced by conversations-v2 in Task 8)
- Delete: `components/executive-dashboard.tsx` (reads from dead view, will be rewritten in Phase 4)

**Context:** These files are dead code. `GeneratePersonasButton` and `PersonaGenerator` are never imported. `queries.ts` reads from `personas_performance` view which returns empty data. `conversation-explorer.tsx` and `executive-dashboard.tsx` will be replaced by new components in this plan.

**IMPORTANT:** Tasks 7 and 8 must be completed BEFORE this task, since they create the replacement components. This task cleans up the old files afterward.

**Step 1: Verify no active imports exist**

Search codebase for imports of each file being deleted. Ensure no other file imports from them (or update imports to use new files).

**Step 2: Delete the files**

```bash
rm components/generate-personas-button.tsx
rm components/personas/persona-generator.tsx
rm lib/queries.ts
rm components/conversation-explorer.tsx
rm components/executive-dashboard.tsx
```

**Step 3: Verify build succeeds**

Run: `pnpm build` — should complete with no import errors.

**Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove dead code (old queries, orphaned components, dead views)"
```

---

### Task 5: Fix n8n is_promoted query via MCP

**Files:**
- n8n Evaluator workflow (ID: `202JEX5zm3VlrUT8`)

**Context:** The n8n Evaluator workflow's "Fetch Evaluator Config" node picks the latest config by `created_at` instead of filtering by `is_promoted = true`. This causes the wrong evaluator config to be used when multiple configs exist. This MUST be fixed before Task 2's re-evaluate trigger is useful, since it would use the wrong config.

**Step 1: Fix the n8n workflow via n8n MCP tools**

Use `mcp__n8n-mcp-prod__n8n_get_workflow` to fetch workflow `202JEX5zm3VlrUT8`.

Find the "Fetch Evaluator Config" node (likely a Postgres node or HTTP Request).

Update its query to:
```sql
SELECT * FROM evaluator_configs
WHERE prompt_version_id = '{{ $json.prompt_version_id }}'
  AND is_promoted = true
LIMIT 1
```

If the node doesn't support `is_promoted` filtering, add a fallback:
```sql
SELECT * FROM evaluator_configs
WHERE prompt_version_id = '{{ $json.prompt_version_id }}'
ORDER BY is_promoted DESC, created_at DESC
LIMIT 1
```

Use `mcp__n8n-mcp-prod__n8n_update_partial_workflow` to apply the fix.

**Step 2: Validate the fix**

Use `mcp__n8n-mcp-prod__n8n_validate_workflow` to ensure the workflow is still valid.

**Step 3: Document the fix**

Append to `_project_specs/n8n/CHANGELOG.md`:
```markdown
### [2026-02-19] is_promoted Fix
- **Evaluator workflow** "Fetch Evaluator Config" node now filters `WHERE is_promoted = true`
- Previously: picked latest by `created_at`, ignoring promoted flag
- Impact: Correct evaluator config now used for re-evaluations
```

**Step 4: Commit docs**

```bash
git add _project_specs/n8n/CHANGELOG.md
git commit -m "fix: n8n evaluator now respects is_promoted flag"
```

---

## Phase 2: Rewrite DOWN Pages

### Task 6: Create dashboard API route (server-side aggregation)

**Files:**
- Create: `app/api/dashboard/stats/route.ts`
- Create: `app/api/dashboard/trend/route.ts`
- Create: `app/api/dashboard/criteria/route.ts`

**Context:** Instead of client-side queries that expose Supabase keys and do N+1 queries (Finding #11-12 from review), create dedicated API routes that aggregate data server-side.

**Step 6a: Create stats API**

```typescript
// app/api/dashboard/stats/route.ts
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET() {
  try {
    // Single query: count and aggregate from test_runs
    const { data: runs, error } = await supabase
      .from('test_runs')
      .select('id, overall_score, success_count, failure_count, timeout_count')

    if (error) return apiError('Failed to fetch stats', 'INTERNAL_ERROR', 500)

    const totalRuns = runs?.length || 0
    const completedRuns = runs?.filter(r => r.overall_score !== null) || []
    const avgScore = completedRuns.length > 0
      ? completedRuns.reduce((sum, r) => sum + (r.overall_score || 0), 0) / completedRuns.length
      : null

    const totalSuccess = runs?.reduce((sum, r) => sum + (r.success_count || 0), 0) || 0
    const totalBattles = runs?.reduce((sum, r) =>
      sum + (r.success_count || 0) + (r.failure_count || 0) + (r.timeout_count || 0), 0) || 0
    const successRate = totalBattles > 0 ? (totalSuccess / totalBattles) * 100 : 0

    // Single query for avg turns
    const { data: battles } = await supabase
      .from('battle_results')
      .select('turns')

    const avgTurns = battles && battles.length > 0
      ? battles.reduce((sum, b) => sum + (b.turns || 0), 0) / battles.length
      : 0

    return apiSuccess({ totalRuns, avgScore, successRate, avgTurns })
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
```

**Step 6b: Create trend API**

```typescript
// app/api/dashboard/trend/route.ts
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('test_runs')
      .select('test_run_code, overall_score, started_at')
      .not('overall_score', 'is', null)
      .order('started_at', { ascending: true })

    if (error) return apiError('Failed to fetch trend', 'INTERNAL_ERROR', 500)

    const trend = (data || []).map(r => ({
      date: new Date(r.started_at).toLocaleDateString(),
      score: r.overall_score,
      testRunCode: r.test_run_code
    }))

    return apiSuccess(trend)
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
```

**Step 6c: Create criteria API**

```typescript
// app/api/dashboard/criteria/route.ts
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET() {
  try {
    // Get latest completed evaluation (prefer promoted)
    const { data: latestEval } = await supabase
      .from('evaluations')
      .select('id')
      .eq('status', 'completed')
      .order('is_promoted', { ascending: false })
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestEval) return apiSuccess([])

    const { data: battleEvals, error } = await supabase
      .from('battle_evaluations')
      .select('criteria_scores')
      .eq('evaluation_id', latestEval.id)

    if (error) return apiError('Failed to fetch criteria', 'INTERNAL_ERROR', 500)
    if (!battleEvals?.length) return apiSuccess([])

    // Aggregate criteria scores
    const criteriaMap = new Map<string, number[]>()
    for (const be of battleEvals) {
      if (!be.criteria_scores) continue
      const scores = be.criteria_scores as Record<string, number>
      for (const [name, score] of Object.entries(scores)) {
        if (typeof score !== 'number') continue
        if (!criteriaMap.has(name)) criteriaMap.set(name, [])
        criteriaMap.get(name)!.push(score)
      }
    }

    const result = Array.from(criteriaMap.entries()).map(([name, scores]) => ({
      name,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
    }))

    return apiSuccess(result)
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
```

**Step 6d: Verify each API returns data**

```bash
curl http://localhost:3000/api/dashboard/stats
curl http://localhost:3000/api/dashboard/trend
curl http://localhost:3000/api/dashboard/criteria
```

Each should return `{ success: true, data: {...} }` with real values.

**Step 6e: Commit**

```bash
git add app/api/dashboard/
git commit -m "feat: add dashboard API routes (stats, trend, criteria)"
```

---

### Task 7: Rewrite Dashboard Home page

**Files:**
- Modify: `components/dashboard-content.tsx` (full rewrite)
- Modify: `stores/dashboard-store.ts` (simplify — remove dead filters)

**Context:** Current `dashboard-content.tsx` calls `fetchPersonasPerformance()` from dead view. Rewrite to call new API routes from Task 6. Keep shadcn/ui patterns.

**Step 7a: Rewrite dashboard-content.tsx**

The new component must:
1. Fetch from `/api/dashboard/stats` for KPI cards
2. Fetch from `/api/test-runs?limit=10&order=desc` for the runs table (reuse existing API)
3. Fetch from `/api/dashboard/trend` for the trend chart
4. Fetch from `/api/dashboard/criteria` for the criteria radar

**Structure:**
```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { Activity, Target, TrendingUp, Timer, ExternalLink } from "lucide-react"

interface DashboardStats { totalRuns: number; avgScore: number | null; successRate: number; avgTurns: number }
interface ScoreTrend { date: string; score: number; testRunCode: string }
interface CriteriaAvg { name: string; avgScore: number }
interface TestRunRow {
  id: string; test_run_code: string; status: string; overall_score: number | null
  success_count: number; failure_count: number; timeout_count: number; started_at: string
  prompt_name: string; prompt_version: string
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<ScoreTrend[]>([])
  const [criteria, setCriteria] = useState<CriteriaAvg[]>([])
  const [runs, setRuns] = useState<TestRunRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/dashboard/trend').then(r => r.json()),
      fetch('/api/dashboard/criteria').then(r => r.json()),
      fetch('/api/test-runs?limit=10&order=desc').then(r => r.json()),
    ]).then(([statsRes, trendRes, criteriaRes, runsRes]) => {
      setStats(statsRes.data)
      setTrend(trendRes.data || [])
      setCriteria(criteriaRes.data || [])
      // Runs API returns { data: TestRun[], pagination: {...} }
      setRuns(runsRes.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Runs" value={stats?.totalRuns ?? 0} icon={<Activity />} />
        <KPICard title="Avg Score" value={stats?.avgScore?.toFixed(1) ?? '—'} icon={<Target />} />
        <KPICard title="Success Rate" value={`${stats?.successRate?.toFixed(0) ?? 0}%`} icon={<TrendingUp />} />
        <KPICard title="Avg Turns" value={stats?.avgTurns?.toFixed(1) ?? '—'} icon={<Timer />} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Score Trend */}
        <Card>
          <CardHeader><CardTitle>Score Trend</CardTitle></CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No completed runs yet</p>
            )}
          </CardContent>
        </Card>

        {/* Criteria Radar */}
        <Card>
          <CardHeader><CardTitle>Criteria Breakdown</CardTitle></CardHeader>
          <CardContent>
            {criteria.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={criteria}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar dataKey="avgScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No evaluation data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Test Runs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Test Runs</CardTitle>
            <Link href="/test-runs" className="text-sm text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>S / F / T</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono">{run.test_run_code}</TableCell>
                  <TableCell>{run.prompt_name} v{run.prompt_version}</TableCell>
                  <TableCell><Badge variant="outline">{run.status}</Badge></TableCell>
                  <TableCell>{run.overall_score?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell>
                    <span className="text-green-600">{run.success_count}</span>
                    {' / '}<span className="text-red-600">{run.failure_count}</span>
                    {' / '}<span className="text-yellow-600">{run.timeout_count}</span>
                  </TableCell>
                  <TableCell>{new Date(run.started_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/test-runs/${run.id}`}><ExternalLink className="h-4 w-4" /></Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function KPICard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-[150px]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      <Skeleton className="h-[300px]" />
    </div>
  )
}
```

**Step 7b: Simplify dashboard store**

In `stores/dashboard-store.ts`, remove all filters that depended on old schema:
- Remove: `selectedPersona`, `selectedOutcomes`, `scoreRange`, `showBookedOnly`
- Keep: `dateRange`, `selectedConversations` (still useful)

**Step 7c: Remove old queries.ts import from app/page.tsx**

Verify that `app/page.tsx` doesn't directly import from `lib/queries.ts`. It should only import `DashboardContent`.

**Step 7d: Verify the dashboard renders with real data**

Run: `pnpm dev`, navigate to `/`:
- KPI cards show real numbers (total runs > 0, avg score ~6-7)
- Trend chart shows data points
- Criteria radar shows criteria names from evaluator config
- Test runs table shows recent runs with working links to `/test-runs/[id]`

**Step 7e: Commit**

```bash
git add components/dashboard-content.tsx stores/dashboard-store.ts
git commit -m "feat: rewrite dashboard on new schema (API routes, no personas_performance)"
```

---

### Task 8: Rewrite Conversations Explorer with API route

**Files:**
- Create: `app/api/conversations/route.ts` (server-side query)
- Create: `components/conversations-v2.tsx` (new component)
- Modify: `app/conversations/page.tsx` (swap component)

**Context:** Current `conversation-explorer.tsx` uses `useConversationData` hook reading from `personas_performance`. Rewrite with a server-side API route (not client-side Supabase queries — Finding #12) and a new component. Includes pagination.

**Step 8a: Create conversations API route**

```typescript
// app/api/conversations/route.ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testRunId = searchParams.get('test_run_id')
    const personaId = searchParams.get('persona_id')
    const outcome = searchParams.get('outcome')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('battle_results')
      .select(`
        id, test_run_id, persona_id, outcome, score, turns, transcript, created_at,
        personas!inner(name, category),
        test_runs!inner(test_run_code)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (testRunId) query = query.eq('test_run_id', testRunId)
    if (personaId) query = query.eq('persona_id', personaId)
    if (outcome) query = query.eq('outcome', outcome)

    const { data, error, count } = await query

    if (error) return apiError('Failed to fetch conversations', 'INTERNAL_ERROR', 500)

    const formatted = (data || []).map((b: any) => {
      const persona = Array.isArray(b.personas) ? b.personas[0] : b.personas
      const testRun = Array.isArray(b.test_runs) ? b.test_runs[0] : b.test_runs
      return {
        id: b.id,
        test_run_id: b.test_run_id,
        test_run_code: testRun?.test_run_code || 'Unknown',
        persona_id: b.persona_id,
        persona_name: persona?.name || 'Unknown',
        persona_category: persona?.category || 'Unknown',
        outcome: b.outcome,
        score: b.score,
        turns: b.turns,
        transcript: b.transcript,
        created_at: b.created_at,
      }
    })

    return apiSuccess(formatted, {
      total: count,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    })
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
```

**Step 8b: Create conversations-v2.tsx**

New 3-panel component:
1. **Left panel** — Filters: test run selector (from `/api/test-runs?limit=50`), persona filter (from `/api/personas`), outcome buttons
2. **Middle panel** — Paginated battle results list from `/api/conversations`
3. **Right panel** — Transcript viewer parsing JSONB `[{role, content}]` format + evaluation scores

**Key difference from old component:** Transcript is JSONB array `[{role: "user"|"assistant", content: "..."}]`, NOT a text string with "Speaker: message" format. The transcript viewer must handle this format.

**Step 8c: Update conversations page**

In `app/conversations/page.tsx`, replace `<ConversationExplorer />` with `<ConversationsV2 />`.

**Step 8d: Verify conversations page works**

Navigate to `/conversations`:
- Filter dropdowns populate with real test runs and personas
- Battle results list shows entries with pagination
- Clicking an entry shows JSONB transcript in right panel
- Outcome filters work

**Step 8e: Commit**

```bash
git add app/api/conversations/route.ts components/conversations-v2.tsx app/conversations/page.tsx
git commit -m "feat: rewrite conversations explorer with API route and pagination"
```

---

### Task 9: Create Test Runs list page

**Files:**
- Create: `app/test-runs/page.tsx`

**Context:** Currently there's no dedicated page listing all test runs. Create a proper test runs list page at `/test-runs` with filtering and links to detail pages. Uses existing `/api/test-runs` endpoint.

**Step 9a: Create test-runs list page**

```typescript
// app/test-runs/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink } from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  pending: "outline",
  failed: "destructive",
  aborted: "destructive",
  evaluating: "secondary",
  battles_completed: "secondary",
}

interface TestRunRow {
  id: string; test_run_code: string; status: string; mode: string
  overall_score: number | null; success_count: number; failure_count: number
  timeout_count: number; started_at: string; completed_at: string | null
  prompt_name: string; prompt_version: string
}

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetch('/api/test-runs?limit=100&order=desc')
      .then(r => r.json())
      .then(result => setRuns(result.data || []))
      .finally(() => setLoading(false))
  }, [])

  const filteredRuns = statusFilter === "all"
    ? runs
    : runs.filter(r => r.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test Runs</h1>
          <p className="text-muted-foreground">All test run executions</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="aborted">Aborted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>S / F / T</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.map(run => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono">{run.test_run_code}</TableCell>
                    <TableCell>{run.prompt_name} v{run.prompt_version}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[run.status] || "outline"}>{run.status}</Badge>
                    </TableCell>
                    <TableCell>{run.overall_score?.toFixed(1) ?? '—'}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{run.success_count}</span>
                      {' / '}<span className="text-red-600">{run.failure_count}</span>
                      {' / '}<span className="text-yellow-600">{run.timeout_count}</span>
                    </TableCell>
                    <TableCell>{new Date(run.started_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/test-runs/${run.id}`}>
                        <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRuns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No test runs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 9b: Verify the /api/test-runs endpoint returns prompt_name and prompt_version**

The existing GET `/api/test-runs` endpoint must return `prompt_name` and `prompt_version` fields in each row. Read the route to confirm. If it doesn't, add a `prompt_versions` join.

**Step 9c: Verify page renders**

Navigate to `/test-runs` — verify table shows real test runs with working links.

**Step 9d: Commit**

```bash
git add app/test-runs/page.tsx
git commit -m "feat: add test runs list page"
```

---

## Phase 3: Reorganize Navigation + Cleanup

### Task 10: Update navigation to 4-hub structure

**Files:**
- Modify: `lib/navigation.ts`
- Modify: `components/app-sidebar.tsx`

**Context:** Current nav has 3 groups (Overview, Testing, Config). Reorganize to 4 hubs. Keep existing routes — we're changing labels and grouping only.

**Step 10a: Update navigation.ts**

```typescript
import {
  LayoutDashboard,
  Rocket,
  MessageSquare,
  ListChecks,
  Settings,
  FileText,
  Users,
  ClipboardCheck,
  BarChart3,
  Activity,
} from "lucide-react"

export const NAV_DASHBOARD = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
] as const

export const NAV_TESTING = [
  { title: "Test Launcher", url: "/test-launcher", icon: Rocket },
  { title: "Test Runs", url: "/test-runs", icon: ListChecks },
  { title: "Conversations", url: "/conversations", icon: MessageSquare },
] as const

export const NAV_CONFIG = [
  { title: "Prompts", url: "/prompts", icon: FileText },
  { title: "Evaluators", url: "/evaluators", icon: ClipboardCheck },
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
] as const

export const NAV_INTELLIGENCE = [
  { title: "Agent Health", url: "/agentic", icon: Activity },
] as const
```

**Note:** `/executive` (Reports) is intentionally REMOVED from navigation since it reads from dead `personas_performance` view and shows blank data. It will be re-added in Phase 4 when rewritten. This addresses Finding #13 — don't show broken pages in nav.

**Step 10b: Update app-sidebar.tsx**

Update the sidebar component to use the new 4 nav groups with labels:
- Dashboard (top, no group header)
- Testing (3 items)
- Configuration (4 items)
- Intelligence (1 item — Agent Health only)

**Step 10c: Verify navigation works**

Navigate through all sidebar links — verify each goes to the correct page and active state highlights correctly. Verify `/executive` is NOT in the sidebar.

**Step 10d: Commit**

```bash
git add lib/navigation.ts components/app-sidebar.tsx
git commit -m "feat: reorganize navigation into 4 hubs, remove broken executive link"
```

---

### Task 11: Clean up dead code and document completion

**Files:**
- Execute Task 4 deletions (deferred to after Tasks 7-8)
- Modify: `docs/plans/2026-02-18-dashboard-realignment-design.md`
- Modify: `_project_specs/PROJECT-INDEX.md`

**Context:** Now that replacement components exist (Tasks 7-8), clean up old dead code and document completion.

**Step 11a: Execute dead code cleanup (Task 4 steps)**

Search for and verify no active imports, then delete:
```bash
rm components/generate-personas-button.tsx
rm components/personas/persona-generator.tsx
rm components/conversation-explorer.tsx
rm components/executive-dashboard.tsx
rm lib/queries.ts
```

Also check for and delete any orphaned hooks that only served the old components (e.g., `useConversationData`).

**Step 11b: Verify build succeeds**

Run: `pnpm build` — must complete with zero errors.

**Step 11c: Update design doc status**

Add to `docs/plans/2026-02-18-dashboard-realignment-design.md`:

```markdown
## Implementation Status

- [x] Phase 1: Fix Critical Bugs (Tasks 1-5)
- [x] Phase 2: Rewrite DOWN Pages (Tasks 6-9)
- [x] Phase 3: Reorganize Navigation + Cleanup (Tasks 10-11)
- [ ] Phase 4: Intelligence Hub (deferred — executive reports rewrite, cross-run comparison)
```

**Step 11d: Update project index**

Update `_project_specs/PROJECT-INDEX.md` to move Dashboard Realignment to "Completed Work".

**Step 11e: Commit**

```bash
git add -u
git add docs/plans/2026-02-18-dashboard-realignment-design.md _project_specs/PROJECT-INDEX.md
git commit -m "chore: remove dead code, document realignment phases 1-3 complete"
```

---

## Verification Checklist

After all tasks, verify:

1. `/` — Dashboard loads with real KPI numbers from new API routes
2. `/test-runs` — Shows all test runs with status, scores, links
3. `/test-runs/[id]` — Detail page loads, re-evaluate triggers n8n (status goes to running/completed, not stuck pending)
4. `/conversations` — Lists battle results with pagination, JSONB transcript viewer works
5. `/test-launcher` — Status monitor works (normalizeTestRun fixed, shows real status/score)
6. `/personas` — Page loads with prompt selector, generation works with prompt context
7. `/prompts` — Unchanged, still works
8. `/evaluators` — Unchanged, still works
9. `/settings` — Unchanged, still works
10. `/agentic` — Still accessible via Intelligence nav
11. `/executive` — NOT in sidebar nav (dead page, Phase 4)
12. Navigation sidebar — 4 groups, all links work, active states correct
13. No TypeScript errors: `pnpm build` succeeds
14. No console errors in browser DevTools
15. No dead code: `lib/queries.ts`, old explorer, old executive — all deleted

## Findings Addressed (Adversarial Review v2)

| # | Finding | Resolution |
|---|---------|------------|
| 1 | queries-v2.ts monolith | Split into 3 API routes (Task 6) instead of client module |
| 2 | No TDD | Pragmatic: verify each step via curl/browser. Unit tests in separate cycle |
| 3 | Dashboard underspecified | Full component code provided in Task 7 |
| 4 | Old files not deleted | Task 11 deletes all old files AFTER replacements exist |
| 5 | Duplicated withRetry | Eliminated: queries are now in API routes using `createSupabaseClient()` |
| 6 | Re-evaluate no error recovery | Task 2 marks evaluation `failed` on webhook failure |
| 7 | Task 3 was research | Resolved: PersonaWorkshop uses `promptName=""` as "show all". Added prompt selector |
| 8 | No redirects for old routes | Routes don't move — only nav labels change. No redirects needed |
| 9 | Dead personas_performance view | Not dropped (may break n8n or other tools). Documented as deprecated |
| 10 | Task 5 was just a note | Task 5 now fixes n8n workflow via MCP tools |
| 11 | N+1 queries | Dashboard uses dedicated API routes with server-side aggregation |
| 12 | Client-side Supabase in conversations | Task 8 adds `/api/conversations` route with pagination |
| 13 | Executive page broken in nav | Task 10 removes `/executive` from sidebar |
