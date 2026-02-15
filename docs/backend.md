# Backend Architecture

## API Routes

### Test Runs

| Method | Path | Purpose | Body/Params |
|--------|------|---------|-------------|
| GET | `/api/test-runs` | List test runs | — |
| POST | `/api/test-runs` | Create test run | `{prompt_version_id, mode, tool_scenario_id?, max_iterations?}` |
| GET | `/api/test-runs/[id]` | Get single test run | — |
| POST | `/api/test-runs/[id]/abort` | Abort running test | — |
| POST | `/api/test-runs/[id]/continue` | Continue test iteration | — |

### Personas

| Method | Path | Purpose | Body/Params |
|--------|------|---------|-------------|
| GET | `/api/personas` | List personas | — |
| POST | `/api/personas` | Create persona | `{name, personaprompt, description?, category?, difficulty?, behaviors?, created_for_prompt?}` |
| GET | `/api/personas/[id]` | Get persona | — |
| PATCH | `/api/personas/[id]` | Update persona | Partial persona fields |
| DELETE | `/api/personas/[id]` | Delete persona | — |
| POST | `/api/personas/[id]/feedback` | Add feedback | Updates `feedback_notes` JSONB |
| GET | `/api/prompt-personas` | List prompt-persona links | Query: `prompt_name` |
| POST | `/api/prompt-personas` | Link persona to prompt | `{persona_id, prompt_name}` |
| DELETE | `/api/prompt-personas` | Unlink persona | `{persona_id, prompt_name}` |

### Settings & Workflows

| Method | Path | Purpose | Body/Params |
|--------|------|---------|-------------|
| GET | `/api/settings` | List workflow configs | — |
| POST | `/api/settings` | Update workflow config | `{workflow_type, webhook_url?, is_active?, config?}` |
| POST | `/api/settings/[workflowType]/test` | Test webhook | Pings URL to verify connectivity |

### n8n Integration

| Method | Path | Purpose | Body/Params |
|--------|------|---------|-------------|
| POST | `/api/n8n/trigger-test` | Trigger test runner | Legacy endpoint |
| POST | `/api/n8n/webhook` | Webhook callback | Receives status updates from n8n |
| POST | `/api/n8n/trigger` | Generic trigger | `{workflow_type, test_run_id, ...}` |

### Evaluations

| Method | Path | Purpose | Body/Params |
|--------|------|---------|-------------|
| GET | `/api/evaluations` | List evaluations | Query: `test_run_id` (required) |
| POST | `/api/evaluations/re-evaluate` | Trigger re-evaluation | `{test_run_id, evaluator_config_id, triggered_by?}` |
| POST | `/api/evaluations/[id]/promote` | Promote evaluation | Sets `is_promoted=true` |
| GET | `/api/evaluations/[id]/compare/[otherId]` | Compare evaluations | Returns criteria score diff |
| GET | `/api/evaluator-configs` | List evaluator configs | — |
| POST | `/api/evaluator-configs` | Create evaluator config | `{name, version, prompt_id, criteria, system_prompt_template}` |
| GET | `/api/evaluator-configs/[id]` | Get evaluator config | — |
| PATCH | `/api/evaluator-configs/[id]` | Update evaluator config | Partial fields |
| DELETE | `/api/evaluator-configs/[id]` | Delete evaluator config | — |
| POST | `/api/evaluator-configs/[id]/promote` | Promote config | Sets `is_promoted=true` for prompt |

### Miscellaneous

| Method | Path | Purpose | Body/Params |
|--------|------|---------|-------------|
| POST | `/api/battle-notes` | Add battle note | `{battle_result_id, note, category, created_by}` |
| POST | `/api/generate-personas` | Generate via AI | `{prompt_name, count, categories}` |
| POST | `/api/launch-test` | Legacy launcher | Deprecated — use `/api/test-runs` |
| GET | `/api/prompts/names` | List prompts | Returns `{id, name}[]` |

## Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `prompts` | Prompt definitions | `id, prompt_name, created_at` |
| `prompt_versions` | Version history | `id, prompt_name, version, content, status` |
| `personas` | Test personas | `id, name, personaprompt, category, difficulty, validation_status, created_for_prompt` |
| `test_runs` | Test executions | `id, test_run_code, prompt_version_id, mode, status, current_iteration, max_iterations, overall_score, tool_scenario_id, awaiting_review` |
| `battle_results` | Conversation results | `id, test_run_id, persona_id, outcome, score, turns, transcript, tool_session_state` |
| `workflow_configs` | n8n webhook config | `id, workflow_type, webhook_url, is_active, config, last_triggered_at, total_executions` |

### Junction Tables

| Table | Purpose | Columns |
|-------|---------|---------|
| `prompt_personas` | Prompt-persona link | `persona_id, prompt_name, is_active, priority` |

### Evaluator Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `evaluator_configs` | Evaluator definitions | `id, name, version, prompt_id, criteria (JSONB), system_prompt_template, is_promoted, status` |
| `evaluations` | Evaluation runs | `id, test_run_id, evaluator_config_id, status, overall_score, success_count, failure_count, is_promoted` |
| `battle_evaluations` | Per-battle scores | `id, evaluation_id, battle_result_id, score, criteria_scores (JSONB), outcome, summary, strengths, weaknesses` |

### Views

| View | Purpose | Sources |
|------|---------|---------|
| `personas_performance` | Dashboard aggregation | Joins test_runs + personas + battle_results + evaluation_criteria |

#### personas_performance Schema

```typescript
{
  conversationid: number
  personaid: string
  persona_description: string
  persona_category: string
  testrunid: string
  promptversionid: string
  agentversion: string
  avg_score: number
  avg_turns: number
  test_date: string
  all_criteria_details: Array<{
    criteria_name: string
    score: number
    conversation_id: number
  }>
  conversations_summary: Array<{
    conversationid: number
    outcome: "success" | "partial" | "failure"
    score: number
    summary: string
    human_notes: string
    turns: number
    appointment_booked?: boolean
  }>
  conversations_transcripts: string // JSON
}
```

### Test Run Status Machine

```
pending → running → battles_completed → evaluating → completed
                                                    ↘ failed
                                                    ↘ aborted
                  ↘ awaiting_review (full_cycle mode)
```

## Lib Utilities

| File | Exports | Purpose |
|------|---------|---------|
| `lib/supabase.ts` | `getSupabase()`, `PersonaPerformanceRow` | Supabase client singleton with env validation |
| `lib/queries.ts` | `fetchPersonasPerformance()`, `fetchTestRuns()`, `fetchHeatmapData()`, `updateConversationNotes()` | Core query functions with retry |
| `lib/react-query.ts` | `queryClient` | React Query client instance |
| `lib/utils.ts` | `cn()` | classnames merge (clsx + tailwind-merge) |
| `lib/outliers.ts` | `calculateOutliers()` | Statistical outlier detection |
| `lib/tool-scenarios.ts` | `TOOL_SCENARIOS`, `getScenarioOptions()` | Tool mock scenario definitions |
| `lib/export-csv.ts` | `exportDashboardToCSV()` | CSV export |
| `lib/export-pdf.ts` | `exportDashboardToPDF()` | PDF export |
| `lib/export-json.ts` | `exportDashboardToJSON()` | JSON export |
| `lib/export-executive-pdf.ts` | `exportExecutiveToPDF()` | Executive PDF export |
| `lib/mock-data.ts` | Sample data | Development fallback data |

## Patterns

### Retry Logic

All Supabase queries use `withRetry()` wrapper:
- 2 retries max
- 100ms initial delay, exponential backoff
- Located in `lib/queries.ts`

### Error Handling

- API routes: try/catch → NextResponse.json with status code
- Client: try/catch → setState error → error UI
- Loading states: `loading` boolean → skeleton/spinner
- Empty states: check data length → custom empty UI

### UUID Validation

API routes with `[id]` params validate UUID format before querying:
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-...$/i
```

### Supabase Client

Singleton pattern in `lib/supabase.ts`:
- Browser client from `@supabase/ssr`
- Environment variable validation with logging
- Shared across all queries
