---
version: 3.0
project: AI Agent Testing Dashboard
created: 2026-01-23
last_updated: 2026-01-23
total_phases: 8
status: in_progress
---

# PRD v3 - Master Index

> **Philosophy**: Lean index + granular specs. Each phase has its own SPEC file for focused context.

## Project Goal

Dashboard per testare AI agent conversazionali contro personas simulate. Valuta performance, identifica weakness, ottimizza prompt tramite cicli iterativi.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind, shadcn/ui |
| Backend | Next.js API Routes, Supabase |
| Database | PostgreSQL (Supabase) |
| Orchestration | n8n (self-hosted Railway) |
| AI | Claude via OpenRouter |

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│  Next.js    │────▶│  Supabase   │
│   (React)   │     │  API Routes │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    n8n      │
                   │  Workflows  │
                   └──────┬──────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  Runner  │ │  Battle  │ │ Evaluator│
      │ Workflow │ │  Agent   │ │ Workflow │
      └──────────┘ └──────────┘ └──────────┘
```

## Phase Status

| # | Phase | Status | Spec File | Pending Items |
|---|-------|--------|-----------|---------------|
| 1 | Database Schema | ✅ DONE | [phase-1-schema.md](specs/phase-1-schema.md) | 0 |
| 2 | API Core | ✅ DONE | [phase-2-api-core.md](specs/phase-2-api-core.md) | 0 |
| 3 | API Extended | ✅ DONE | [phase-3-api-extended.md](specs/phase-3-api-extended.md) | 0 |
| 4 | n8n Webhook | ✅ DONE | [phase-4-webhook.md](specs/phase-4-webhook.md) | 0 |
| 5 | n8n Workflows | 🔶 PARTIAL | [phase-5-n8n.md](specs/phase-5-n8n.md) | 4 |
| 6 | Personas UI | ✅ DONE | [phase-6-personas-ui.md](specs/phase-6-personas-ui.md) | 0 |
| 7 | Optimization UI | ✅ DONE | [phase-7-optimization-ui.md](specs/phase-7-optimization-ui.md) | 0 |
| 8 | Polish | ⏳ PENDING | [phase-8-polish.md](specs/phase-8-polish.md) | TBD |

### Status Legend
- ✅ DONE = Implemented + Manually Tested + Validated
- 🔶 PARTIAL = Implemented, pending items exist
- ⏳ PENDING = Not started
- 🔴 BLOCKED = Has blockers (see spec for details)

## Key Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| Prompt Version | `prompt_versions` | System prompt da testare |
| Persona | `personas` | Personalità simulate per test |
| Test Run | `test_runs` | Sessione di test (1 prompt vs N personas) |
| Battle Result | `battle_results` | Risultato singola conversazione |
| Evaluation | `evaluations` | Scoring AI della battle |

## Test Modes

| Mode | Description |
|------|-------------|
| `single` | Una iterazione: run battles → evaluate → done |
| `full_cycle_with_review` | Loop: run → evaluate → analyze → human review → optimize → repeat |

## Quick Reference

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://dlozxirsmrbriuklgcxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[in .env.local]
N8N_SECRET=[in .env.local]
```

### n8n Workflows
| Workflow | ID | Webhook Path |
|----------|----|--------------|
| Test RUNNER | XmpBhcUxsRpxAYPN | `/webhook/test-runner` |
| Battle Agent | Z35cpvwXt7Xy4Mgi | (sub-workflow) |
| Evaluator | 202JEX5zm3VlrUT8 | (sub-workflow) |
| Personas Generator | HltftwB9Bm8LNQsO | `/webhook/generate-personas` |

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/test-runs` | Start new test run |
| POST | `/api/test-runs/[id]/abort` | Kill switch |
| POST | `/api/test-runs/[id]/continue` | Resume after review |
| GET/POST | `/api/personas` | Persona CRUD |
| POST | `/api/personas/[id]/feedback` | Add feedback notes |

## Related Documents

| Document | Purpose |
|----------|---------|
| `_project_specs/n8n/CHANGELOG.md` | n8n modification history |
| `_project_specs/n8n/MODIFICATIONS-REQUIRED.md` | n8n implementation guide |
| `_project_specs/features/ROADMAP-enterprise-features.md` | Deferred enterprise features |
| `_project_specs/session/current-state.md` | Session checkpoint |
| `_project_specs/schema-reference.md` | Full DB schema |

## Workflow: How to Use This PRD

```
1. Check Phase Status table above
2. Find phase with 🔶 PARTIAL or ⏳ PENDING
3. Open corresponding SPEC file
4. Run: /ralph-spec [phase-number]
5. Complete implementation
6. Run manual tests from SPEC
7. Update SPEC status to ✅ DONE
8. Update this index
```

---

*Token count target: <3,000 | Actual: ~2,200*
