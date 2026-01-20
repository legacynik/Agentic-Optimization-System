# Code Landmarks

Quick reference to important parts of the codebase for the AI Agent Testing Dashboard.

## Entry Points
| Location | Purpose |
|----------|---------|
| app/page.tsx | Main dashboard page |
| app/layout.tsx | Root layout with theme provider |
| app/conversations/page.tsx | Conversation explorer page |
| app/agentic/page.tsx | Agentic testing dashboard |
| app/test-launcher/page.tsx | Test launcher UI |

## API Routes (PRD v2.4 Implementation)
| Location | Purpose |
|----------|---------|
| app/api/test-runs/route.ts | Create/list test runs |
| app/api/test-runs/[id]/route.ts | Single test run CRUD |
| app/api/test-runs/[id]/abort/route.ts | Kill switch for running tests |
| app/api/test-runs/[id]/continue/route.ts | Resume after human review |
| app/api/personas/route.ts | Create/list personas |
| app/api/personas/[id]/route.ts | Single persona CRUD |
| app/api/personas/[id]/feedback/route.ts | Feedback notes |
| app/api/prompt-personas/route.ts | Persona-prompt associations |
| app/api/n8n/webhook/route.ts | n8n callback handler (secured) |
| app/api/settings/route.ts | Workflow configs |
| app/api/settings/[workflowType]/test/route.ts | Webhook connectivity test |
| app/api/battle-notes/route.ts | Human notes on battles |

## Core Business Logic
| Location | Purpose |
|----------|---------|
| lib/tool-scenarios.ts | Hardcoded tool mock scenarios |
| lib/queries.ts | Database query functions |
| lib/supabase.ts | Supabase client configuration |
| lib/utils.ts | Utility functions |

## UI Components
| Location | Purpose |
|----------|---------|
| components/dashboard-overview.tsx | Main dashboard with KPIs |
| components/conversation-explorer.tsx | Filterable conversation list |
| components/conversation-transcript.tsx | Individual conversation display |
| components/agentic/battle-arena.tsx | Battle test UI |
| components/agentic/persona-generator.tsx | Persona generation UI |
| components/version-centric/prompt-versions-hub.tsx | Prompt versions timeline |
| components/version-centric/persona-workshop.tsx | Persona approval flow |

## Configuration
| Location | Purpose |
|----------|---------|
| .env.local | Environment variables (N8N_SECRET, Supabase keys) |
| supabase/config.toml | Supabase local dev configuration |
| CLAUDE.md | Project instructions and context |

## Database Schema
| Location | Purpose |
|----------|---------|
| supabase/migrations/001_version_centric_schema.sql | Base schema (prompt_versions, personas, test_runs, battle_results) |
| supabase/migrations/002_prd_v2_4_schema.sql | PRD v2.4 additions (workflow_configs, prompt_personas, battle_notes) |

## Key Patterns
| Pattern | Example Location | Notes |
|---------|------------------|-------|
| API Route Handler | app/api/test-runs/route.ts | GET/POST in same file |
| UUID Validation | All API routes | `isValidUUID()` helper |
| Supabase Client | lib/supabase.ts | Uses anon key for client |
| Error Response | All API routes | Consistent `{ error, code }` format |

## n8n Integration Points
| Location | Purpose |
|----------|---------|
| workflow_configs table | Stores webhook URLs and settings |
| app/api/n8n/webhook/route.ts | Receives callbacks, updates test_runs |
| x-n8n-secret header | Simple auth for callbacks |

## Gotchas & Non-Obvious Behavior
| Location | Issue | Notes |
|----------|-------|-------|
| app/api/n8n/webhook/route.ts | Auth bypass | Allows requests if N8N_SECRET not set (dev mode) |
| lib/tool-scenarios.ts | Dynamic placeholders | `{{random}}`, `{{selected_slot}}` replaced at runtime |
| test_runs.mode | Only 2 values | `single` or `full_cycle_with_review` (v2.4 removed `full_cycle`) |
| personas.validation_status | Only 2 values | `pending` or `validated` (v2.4 simplified) |
| prompt_personas trigger | Validates prompt_name | Must exist in prompt_versions table |
