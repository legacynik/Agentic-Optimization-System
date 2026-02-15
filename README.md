# AI Agent Testing Dashboard

A full-stack Next.js 14 dashboard for testing, evaluating, and optimizing conversational AI agents. Launch test runs against simulated personas, evaluate performance with configurable criteria, compare evaluators with A/B testing, and visualize results with rich analytics.

## Features

- **Test Execution** - Launch test runs with prompt selection, real-time status monitoring, abort/continue controls
- **Multi-Evaluation System** - Dynamic evaluator configs per prompt, A/B test evaluators, compare results side-by-side
- **Persona Management** - CRUD personas, validation tracking, prompt-persona associations, bulk generation via n8n
- **Rich Analytics** - KPI cards, performance heatmaps, trend analysis, appointments funnel, AI-powered insights
- **Conversation Explorer** - Search, filter, and review full conversation transcripts with evaluation breakdowns
- **Executive Dashboard** - High-level summary view with exportable PDF reports
- **Export** - CSV, PDF, JSON export for all data views

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | shadcn/ui + Radix UI + Tailwind CSS 4 |
| State | Zustand 5 + TanStack React Query 5 |
| Database | Supabase (PostgreSQL) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Orchestration | n8n (self-hosted on Railway) |
| AI | Claude via OpenRouter |
| Testing | Playwright (E2E) |
| Package Manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase account (or local Supabase CLI)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-agent-dashboard

# Install dependencies
pnpm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
N8N_SECRET=your_n8n_webhook_secret
```

### Database Setup

Run the migrations in order against your Supabase project:

```
supabase/migrations/
├── 001_version_centric_schema.sql    # Core tables
├── 002_prd_v2_4_schema.sql           # n8n integration
├── 003_personas_performance_view.sql # Dashboard view
├── 004_analysis_report_columns.sql   # Reporting columns
├── 005_fix_prompt_personas.sql       # Bug fix
├── 006_create_evaluations_schema.sql # Evaluator system
├── 007_insert_legacy_evaluator.sql   # Seed data
├── 008_migrate_test_runs_to_evaluations.sql
└── 009_migrate_battle_results_to_evaluations.sql
```

### Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

### Testing

```bash
# Run E2E tests
pnpm test

# Run with UI mode
pnpm test:ui

# Run headed (visible browser)
pnpm test:headed

# Debug tests
pnpm test:debug

# View test report
pnpm test:report
```

## Project Structure

```
app/
├── page.tsx                  # Dashboard (main view)
├── layout.tsx                # Root layout with sidebar
├── agentic/                  # Agentic testing (battles, personas, optimization, analytics)
├── conversations/            # Conversation explorer
├── evaluators/               # Evaluator config management
├── executive/                # Executive summary dashboard
├── personas/                 # Persona management
├── prompts/                  # Prompt version hub
├── settings/                 # Workflow configs & settings
├── test-launcher/            # Launch test runs
├── test-diff-viewer/         # Compare prompt versions
└── api/                      # REST API routes
    ├── test-runs/            # Test run CRUD + abort/continue
    ├── personas/             # Persona CRUD + feedback
    ├── evaluator-configs/    # Evaluator config CRUD + promote
    ├── evaluations/          # Evaluations list + re-evaluate + compare
    ├── battle-notes/         # Battle notes CRUD
    ├── prompts/              # Prompt names
    ├── settings/             # Workflow configs
    └── n8n/                  # n8n webhook + trigger

components/
├── ui/                       # 50+ shadcn/ui components
├── dashboard/                # Dashboard-specific (KPIs, test runs)
├── app-sidebar.tsx           # Navigation sidebar
├── filter-bar.tsx            # Filter controls
├── conversation-*.tsx        # Conversation components
├── personas-heatmap.tsx      # Performance heatmap
├── executive-*.tsx           # Executive dashboard
├── evaluator-*.tsx           # Evaluator system
└── export-menu.tsx           # Export (CSV/PDF/JSON)

lib/
├── supabase.ts               # Supabase client (singleton)
├── queries.ts                # DB queries with retry logic
├── export-*.ts               # Export utilities
├── outliers.ts               # Statistical calculations
└── utils.ts                  # Shared utilities

supabase/
├── migrations/               # 9 SQL migrations
├── config.toml               # Local dev config
└── seed.sql                  # Seed data

tests/
├── dashboard.spec.ts         # Dashboard E2E tests
├── evaluations.spec.ts       # Evaluations E2E tests
└── evaluator.spec.ts         # Evaluator E2E tests
```

## API Reference

### Test Runs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/test-runs` | List test runs |
| POST | `/api/test-runs` | Create test run |
| GET | `/api/test-runs/[id]` | Get test run details |
| POST | `/api/test-runs/[id]/abort` | Abort running test |
| POST | `/api/test-runs/[id]/continue` | Continue after review |

### Personas
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personas` | List personas (with filters) |
| POST | `/api/personas` | Create persona |
| GET | `/api/personas/[id]` | Get persona |
| PATCH | `/api/personas/[id]` | Update persona |
| DELETE | `/api/personas/[id]` | Delete persona |
| POST | `/api/personas/[id]/feedback` | Add feedback notes |

### Evaluator Configs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/evaluator-configs` | List configs |
| POST | `/api/evaluator-configs` | Create config |
| GET | `/api/evaluator-configs/[id]` | Get config |
| PATCH | `/api/evaluator-configs/[id]` | Update config |
| DELETE | `/api/evaluator-configs/[id]` | Soft delete (deprecated) |
| POST | `/api/evaluator-configs/[id]/promote` | Set as default |

### Evaluations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/evaluations` | List evaluations |
| POST | `/api/evaluations/re-evaluate` | Re-evaluate with different evaluator |
| POST | `/api/evaluations/[id]/promote` | Set as primary |
| GET | `/api/evaluations/[id]/compare/[otherId]` | Compare two evaluations |

### Settings & n8n
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/settings` | Workflow configs |
| POST | `/api/settings/[type]/test` | Test webhook |
| POST | `/api/n8n/webhook` | n8n status webhook |
| POST | `/api/n8n/trigger` | Trigger n8n workflow |

## Database Schema

### Core Tables
- **prompts** - Prompt definitions
- **prompt_versions** - Versioned prompt content (system + user templates)
- **personas** - Simulated customer personas with psychological profiles
- **test_runs** - Test execution records with status tracking
- **battle_results** - Individual conversation outcomes with transcripts
- **battle_notes** - Human annotations on battles
- **workflow_configs** - n8n webhook URLs and settings

### Evaluator Tables
- **evaluator_configs** - Dynamic evaluation criteria per prompt (JSONB)
- **evaluations** - Evaluation runs (supports multiple per test_run for A/B testing)
- **battle_evaluations** - Per-battle scores with criteria breakdown

### Views
- **personas_performance** - Aggregated performance data for dashboard

## Design System

- **Theme**: "Soft Pop" - friendly, playful aesthetic with vibrant colors
- **Styling**: Tailwind CSS 4 with OKLCH color space
- **Components**: 50+ shadcn/ui components (Radix UI primitives)
- **Typography**: DM Sans (body) + Space Mono (code)
- **Dark Mode**: Full support via next-themes
- **Icons**: Lucide React

## n8n Workflows

| Workflow | Purpose | Status |
|----------|---------|--------|
| Test RUNNER | Orchestrate test runs | Active |
| Battle Agent | Execute agent-persona conversations | Active |
| Evaluator | Judge conversation quality | Active |
| Personas Generator | Generate test personas | Active |

## License

Private - All rights reserved.
