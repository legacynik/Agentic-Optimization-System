# Project Report: AI Agent Testing Dashboard

*Generated: 2026-02-12*

## Executive Summary

A production-ready Next.js 14 dashboard for testing and evaluating conversational AI agents. The project is at **~95% completion** (phases 1-7 done, phase 5 closed with 3 items intentionally deferred, E1-E5 evaluator epics all complete, 2 E2E tests validated).

**Overall Grade: B+ (85/100)** - Solid architecture and features, E2E validated. Needs testing infrastructure and CI/CD to reach production-grade quality.

---

## Completion Status

| Phase | Description | Status | Pending |
|-------|-------------|--------|---------|
| 1 | Database Schema | DONE | 0 items |
| 2 | API Core | DONE | 0 items |
| 3 | API Extended | DONE | 0 items |
| 4 | n8n Webhook | DONE | 0 items |
| 5 | n8n Workflows | DONE (3 deferred) | 0 blocking |
| 6 | Personas UI | DONE | 0 items |
| 7 | Optimization UI | DONE | 0 items |
| 8 | Polish | PENDING | TBD |

### Phase 5 Deferred Items (intentional, non-blocking)
1. ~~Check Abort #2~~ — Abort #1 sufficient
2. ~~x-n8n-secret header~~ — Single-user internal tool
3. ~~Tool Mocking~~ — Tools tested live, mocking not valuable
4. ~~Status 'completed'~~ — DONE (Feb 2026)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  Next.js 14 (App Router) + TypeScript + Tailwind    │
│  shadcn/ui (50+ components) + Recharts              │
│  Zustand (state) + React Query (data fetching)      │
└─────────────────┬───────────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────────┐
│               Next.js API Routes                     │
│  Test Runs, Personas, Evaluators, Evaluations        │
│  Settings, n8n Integration                           │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐  ┌─────────┐  ┌──────────┐
│Supabase│  │   n8n   │  │OpenRouter│
│ (Pg)   │  │(Railway)│  │ (Claude) │
└────────┘  └─────────┘  └──────────┘
```

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX files | 152 |
| Total lines of code | ~27,700 |
| Components (LOC) | ~16,000 (58%) |
| Lib/Utilities (LOC) | ~1,500 (5.5%) |
| App pages | 10 routes |
| API endpoints | 25+ |
| shadcn/ui components | 50+ |
| Database migrations | 9 |
| Database tables | 11 |
| E2E tests | 31 (27 pass, 4 skip) |
| Dependencies | 86 production + 10 dev |

---

## Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | KPI cards, performance heatmap, test runs list, charts |
| Conversations | `/conversations` | Search/filter conversations, transcript viewer, evaluations |
| Executive | `/executive` | High-level summary, exportable PDF reports |
| Agentic | `/agentic` | Multi-tab: Battles, Personas, Optimization, Analytics |
| Evaluators | `/evaluators` | Evaluator config CRUD, criteria editor |
| Personas | `/personas` | Persona management table |
| Prompts | `/prompts` | Prompt version hub |
| Test Launcher | `/test-launcher` | Launch test runs with config |
| Diff Viewer | `/test-diff-viewer` | Compare prompt versions |
| Settings | `/settings` | Workflow configs, general settings |

---

## Database Schema

### Core Tables (7)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `prompts` | Prompt definitions | name, description |
| `prompt_versions` | Versioned prompt content | system_prompt, user_prompt_template |
| `personas` | Simulated customer personas | psychological_profile, difficulty, behaviors (JSONB) |
| `test_runs` | Test execution records | status, mode, tool_scenario_id, awaiting_review |
| `battle_results` | Conversation outcomes | outcome, turns, transcript (JSONB) |
| `battle_notes` | Human annotations | note, category |
| `workflow_configs` | n8n webhook settings | webhook_url, config (JSONB) |

### Evaluator Tables (3) - NEW

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `evaluator_configs` | Dynamic criteria per prompt | criteria (JSONB), system_prompt_template, is_promoted |
| `evaluations` | Evaluation runs (supports A/B) | evaluator_config_id, overall_score, is_promoted |
| `battle_evaluations` | Per-battle criteria scores | criteria_scores (JSONB), strengths, weaknesses |

### Views (1)
- **personas_performance** - Aggregated dashboard data joining battles, test runs, personas, prompt versions

### Schema Highlights
- UUID primary keys throughout
- JSONB for flexible data (criteria, configs, metadata)
- Row Level Security (RLS) on all tables
- 15+ indexes on frequently queried columns
- Triggers for automated metric updates
- Cascading deletes for referential integrity

---

## n8n Workflow Integration

| Workflow | ID | Status | Purpose |
|----------|-----|--------|---------|
| Test RUNNER | XmpBhcUxsRpxAYPN | Active | Orchestrate test runs |
| Battle Agent | Z35cpvwXt7Xy4Mgi | Active | Agent-persona conversations |
| Evaluator | 202JEX5zm3VlrUT8 | Active | Judge conversation quality |
| Personas Generator | HltftwB9Bm8LNQsO | Active | Generate test personas |

**Architecture**: Dashboard triggers n8n via webhooks. n8n orchestrates AI conversations (Claude via OpenRouter), evaluates results, and reports back via callback webhooks.

---

## Key Architectural Decisions

1. **Evaluator Multi-Prompt Architecture** (2026-01-29)
   - Dynamic criteria stored in `evaluator_configs` table (not hardcoded)
   - Multiple evaluations per test_run for A/B testing
   - Personas reusable across different prompts
   - System prompts built dynamically at n8n runtime

2. **Lean v2.4 Implementation** (2026-01-19)
   - Simple x-n8n-secret auth (sufficient for single-user agency)
   - Hardcoded tool scenarios (happy_path, objections, etc.)
   - Human-in-the-loop required (no fully autonomous mode)

3. **BMAD + Claude Bootstrap Integration** (2026-01-25)
   - BMAD Method for strategy/planning
   - Claude Bootstrap for code quality/TDD
   - Context7 for documentation

4. **Playwright Test Architecture** (2026-01-31)
   - Graceful skip pattern for data-dependent tests
   - 15s timeout for data loading checks
   - Serial mode for tests to avoid race conditions

---

## Quality Assessment

### Grades by Category

| Category | Grade | Notes |
|----------|-------|-------|
| Architecture | A | Modern Next.js 14, clean separation |
| Database Design | A+ | Normalized, indexed, RLS-enabled |
| UI Components | A | 50+ shadcn, accessible, responsive |
| Code Quality | B+ | TypeScript strict, good patterns |
| Error Handling | B | Retry logic, but no error boundaries |
| Performance | B+ | Next.js optimizations, indexed DB |
| Security | B+ | RLS, env vars, HTTPS |
| Testing | D | Only E2E (1% coverage), no unit tests |
| CI/CD | F | No automation whatsoever |
| Documentation | C | CLAUDE.md is thorough, but no inline docs |

### Strengths
- Production-ready database schema with RLS and proper indexing
- 50+ accessible UI components from shadcn/ui
- Modern tech stack (Next.js 14, TypeScript 5, Tailwind 4)
- Excellent data fetching with retry logic and exponential backoff
- Multi-evaluation A/B testing architecture
- Comprehensive export functionality (CSV, PDF, JSON)

### Weaknesses
- Only ~1% test coverage (E2E only, no unit tests)
- No CI/CD pipeline (no GitHub Actions, no automated deployment)
- No React error boundaries
- No performance monitoring (no Sentry, no analytics)
- Some large components (>300 LOC)
- Prompts page still uses mock data

---

## Known Issues

### Fixed (10)
- BUG-001: Webpack cache corruption
- BUG-002: Schema mismatch for personas
- BUG-003: Settings page API parsing
- BUG-004/005: Test launcher issues
- BUG-006: RLS policy missing
- BUG-011: Select.Item empty value
- BUG-012: Navigation 404s
- BUG-013: No error feedback on test launcher

### Open (Nice-to-Have, 4)
- BUG-007: Dashboard empty state message
- BUG-008: n8n webhook URL overwritten on save
- BUG-009: Prompt-personas junction missing API
- BUG-010: Timestamp field inconsistency (datecreated vs created_at)

### Code TODOs
- `test-run-status-monitor.tsx:39` - Implement full edit mode with inline prompt editor (Phase 8)
- `test-run-status-monitor.tsx:392` - Replace mock data with real API data

---

## Dependencies Overview

### Core Framework
```
next: 14.2.16
react: 18
typescript: 5
tailwindcss: 4.1.9
```

### Key Libraries
```
@supabase/supabase-js + @supabase/ssr    # Database
zustand: 5.0.8                            # State management
@tanstack/react-query: 5.90.2             # Data fetching
react-hook-form: 7.60.0 + zod: 3.25.67   # Forms
recharts: 2.15.4                          # Charts
framer-motion: 11.0.0                     # Animations
@dnd-kit/*                                # Drag and drop
jspdf + papaparse                         # Export
@playwright/test: 1.58.0                  # E2E testing
```

### UI Stack
```
50+ shadcn/ui components (Radix UI primitives)
lucide-react: 0.454.0 (icons)
sonner: 1.7.4 (toasts)
cmdk: 1.0.4 (command palette)
vaul: 0.9.9 (drawer)
next-themes: 0.4.6 (dark mode)
```

---

## Testing Status

### E2E Tests (Playwright)

| Suite | Tests | Passing | Skipped | Status |
|-------|-------|---------|---------|--------|
| Dashboard | 20 | 20 | 0 | OK |
| Dashboard (data) | 11 | Conditional | Conditional | Data-dependent |
| Evaluator | 7 | 2 | 5 | Needs fixes |
| Evaluations | 8 | 0 | 8 | Route missing |
| **Total** | **46** | **~27** | **~19** | **~60% pass** |

### Missing Test Infrastructure
- No unit tests (Jest/Vitest)
- No component tests (React Testing Library)
- No API integration tests
- No CI/CD pipeline

---

## Documentation

| Area | Location | Description |
|------|----------|-------------|
| Frontend | `docs/frontend.md` | Pages, components, hooks, state management, polling |
| Backend | `docs/backend.md` | 26 API endpoints, DB schema (14 tables), utilities |
| n8n | `docs/n8n.md` | 4 workflows, webhook integration, pending items |
| Project Overview | `PROJECT.md` | This file — metrics, grades, completion status |
| Session State | `_project_specs/session/` | current-state, decisions, code-landmarks, archive |
| Specs | `_project_specs/specs/` | Feature specs per phase |

### Session Commands

| Command | Purpose |
|---------|---------|
| `/session-start` | Load context, briefing, continue from last session |
| `/session-update` | Quick checkpoint (1-3 bullets) |
| `/session-end` | Archive, clean state, handoff |

---

## Recommended Next Steps

### High Priority
1. **Fix Playwright Tests** - 5 failing evaluator tests, 8 skipped
2. **Add Unit Tests** - Install Vitest + React Testing Library, target 60% coverage
3. **Set Up CI/CD** - GitHub Actions for lint, type-check, test on every PR

### Medium Priority
4. **Agentic Refactor v2** - Agent health monitor with real data
5. **Phase 8 Polish** - Error boundaries, loading states, empty states with CTAs
6. **UI Refactor Minimal** - Dashboard redesign with modern aesthetic
7. **Performance Monitoring** - Add Vercel Analytics, Sentry error tracking

### Low Priority
8. **Prompt Diff Viewer Rewrite** - Fix scroll issues, add edit mode
9. **API Documentation** - OpenAPI spec for all endpoints
10. **Cross-browser Testing** - Add Firefox/Safari to Playwright

---

## Effort Estimates to Grade A

| Task | Effort |
|------|--------|
| Unit tests (60% coverage) | 2-3 days |
| CI/CD pipeline | 1 day |
| Fix failing E2E tests | 1 day |
| Error boundaries | 0.5 day |
| API documentation | 1-2 days |
| **Total** | **~1 week** |

---

## Session History

| Date | Topic | Key Outcomes |
|------|-------|-------------|
| 2026-01-19 | PRD v2.4 Backend | Core schema, API routes, lean decisions |
| 2026-01-25 | Schema Refactor | BMAD + Claude Bootstrap integration |
| 2026-01-29 | Evaluator Architecture | Multi-evaluation system, 3 new tables, 11 API endpoints |
| 2026-01-30 | Playwright E2E Tests | 31 tests created, test architecture patterns |
| 2026-01-31 | UI Refactor + Tests | Sidebar fixes, 27 tests passing, cache fix |
| 2026-02-13 | Docs + DevKit Alignment | Structured docs/, session commands, CLAUDE.md slim-down |
| 2026-02-16 | E3 Verified + E4 Polish | n8n Evaluator dynamic criteria, Migration 010, parser fix |
| 2026-02-17 | Architecture Audit + Launch Plan v3 | Full E2E flow documented, Voice Playbook integrated |
| 2026-02-17-18 | E2E Tests + Bug Fixes | Max turns cap, parser rewrite, Gemini Flash 3, analyzer rewrite |
| 2026-02-18 | Docs Alignment | Phase 5 closed, all specs updated to reflect actual state |

Full session archives: `_project_specs/session/archive/`
Decision log: `_project_specs/session/decisions.md`
