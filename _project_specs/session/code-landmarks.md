# Code Landmarks

Quick reference to important parts of the codebase for the AI Agent Testing Dashboard.

## Entry Points
| Location | Purpose |
|----------|---------|
| app/page.tsx | Main dashboard page |
| app/layout.tsx | Root layout with sidebar, theme provider, fonts |
| app/conversations/page.tsx | Conversation explorer page |
| app/agentic/page.tsx | Agentic testing dashboard |
| app/test-launcher/page.tsx | Test launcher UI |
| app/evaluators/page.tsx | Evaluator configs CRUD |
| app/executive/page.tsx | Executive analytics |
| app/personas/page.tsx | Persona management |
| app/prompts/page.tsx | Prompt versions hub |
| app/settings/page.tsx | Workflow configs, general settings |

## API Routes
| Location | Purpose |
|----------|---------|
| app/api/test-runs/route.ts | Create/list test runs |
| app/api/test-runs/[id]/route.ts | Single test run CRUD |
| app/api/test-runs/[id]/abort/route.ts | Kill switch |
| app/api/test-runs/[id]/continue/route.ts | Resume after review |
| app/api/personas/route.ts | Create/list personas |
| app/api/personas/[id]/route.ts | Single persona CRUD |
| app/api/personas/[id]/feedback/route.ts | Feedback notes |
| app/api/prompt-personas/route.ts | Persona-prompt links |
| app/api/evaluations/route.ts | List evaluations |
| app/api/evaluations/re-evaluate/route.ts | Trigger re-evaluation |
| app/api/evaluations/[id]/promote/route.ts | Promote evaluation |
| app/api/evaluations/[id]/compare/[otherId]/route.ts | Compare evaluations |
| app/api/evaluator-configs/route.ts | Evaluator config CRUD |
| app/api/evaluator-configs/[id]/route.ts | Single config CRUD |
| app/api/evaluator-configs/[id]/promote/route.ts | Promote config |
| app/api/n8n/webhook/route.ts | n8n callback handler |
| app/api/n8n/trigger/route.ts | Generic n8n trigger |
| app/api/settings/route.ts | Workflow configs |
| app/api/prompts/names/route.ts | Prompt names for dropdowns |
| app/api/battle-notes/route.ts | Human notes on battles |

## Core Business Logic
| Location | Purpose |
|----------|---------|
| lib/queries.ts | Supabase query functions with retry |
| lib/supabase.ts | Supabase client singleton |
| lib/tool-scenarios.ts | Hardcoded tool mock scenarios |
| lib/utils.ts | cn() classname utility |
| lib/outliers.ts | Statistical outlier detection |
| lib/export-*.ts | CSV, PDF, JSON export functions |

## Documentation
| Location | Purpose |
|----------|---------|
| docs/frontend.md | Pages, components, hooks, state management |
| docs/backend.md | API routes, DB schema, utilities |
| docs/n8n.md | Workflows, webhooks, environment |
| CLAUDE.md | Project instructions and AI workflow |
| PROJECT.md | Project metrics, grades, completion |

## Session Commands
| Command | Purpose |
|---------|---------|
| /session-start | Load context, briefing, continue |
| /session-update | Quick checkpoint |
| /session-end | Archive, clean state, handoff |

## Database Schema
| Location | Purpose |
|----------|---------|
| supabase/migrations/001_*.sql | Base schema (prompts, personas, test_runs, battles) |
| supabase/migrations/002_*.sql | PRD v2.4 (workflow_configs, prompt_personas, battle_notes) |
| supabase/migrations/006_*.sql | Evaluations schema (evaluator_configs, evaluations, battle_evaluations) |
| supabase/migrations/007-009_*.sql | Legacy evaluator + data migrations |

## Key Patterns
| Pattern | Example Location | Notes |
|---------|------------------|-------|
| API Route Handler | app/api/test-runs/route.ts | GET/POST in same file |
| UUID Validation | All [id] API routes | `isValidUUID()` helper |
| Supabase Client | lib/supabase.ts | Singleton, anon key |
| Error Response | All API routes | Consistent `{ error, code }` format |
| Retry Wrapper | lib/queries.ts | `withRetry()` — 2 retries, exponential backoff |
| React Query | hooks/use-test-run-status.ts | Polling + caching for test runs |

## n8n Integration Points
| Location | Purpose |
|----------|---------|
| workflow_configs table | Stores webhook URLs and settings |
| app/api/n8n/webhook/route.ts | Receives callbacks, updates test_runs |
| app/api/n8n/trigger/route.ts | Triggers n8n workflows |

## Gotchas & Non-Obvious Behavior
| Location | Issue | Notes |
|----------|-------|-------|
| app/api/n8n/webhook/route.ts | Auth bypass | Allows requests if N8N_SECRET not set (dev mode) |
| lib/tool-scenarios.ts | Dynamic placeholders | `{{random}}`, `{{selected_slot}}` replaced at runtime |
| test_runs.mode | Only 2 values | `single` or `full_cycle_with_review` |
| personas.validation_status | Only 2 values | `pending` or `validated` |
