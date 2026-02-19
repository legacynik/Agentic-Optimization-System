---
version: 4.1
project: AI Agent Testing Dashboard
created: 2026-02-16
updated: 2026-02-19
status: in_progress
---

# Project Index

> Dashboard per testare AI agent conversazionali contro personas simulate.
> Valuta performance, identifica weakness, ottimizza prompt tramite cicli iterativi.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Supabase |
| Database | PostgreSQL (Supabase) |
| Orchestration | n8n (self-hosted Railway) |
| AI | Claude via OpenRouter |

## Architecture

```
Dashboard (React) → Next.js API Routes → Supabase (Postgres)
                           │
                           ▼
                     n8n Workflows
                     ├── Test Runner
                     ├── Battle Agent
                     ├── Evaluator
                     └── Personas Generator
```

---

## Completed Work

Fasi originali (PRD v2-v3) completate e validate:

| Area | What | When |
|------|------|------|
| DB Schema | Tables: prompts, prompt_versions, personas, test_runs, battle_results, battle_notes | Jan 2026 |
| API Core | CRUD prompts, personas, test-runs, webhook handler | Jan 2026 |
| API Extended | Abort, continue, feedback, filters, pagination | Jan 2026 |
| n8n Webhook | Webhook handler + callback system | Jan 2026 |
| Personas UI | Persona management page | Jan 2026 |
| Optimization UI | Prompt version management, diff viewer | Jan 2026 |
| Evaluator Schema (E1) | Tables: evaluator_configs, evaluations, battle_evaluations + migrations | Jan 2026 |
| Evaluator Multi-Prompt (E2-E5) | API endpoints, n8n dynamic evaluator, UI management, A/B compare | Feb 2026 |
| Evaluator Migration | n8n workflow migrated to new schema (absorbed into E3) | Feb 2026 |
| Phase 5 n8n Core | REQ-5.1–5.5, REQ-5.9 done. REQ-5.6/5.7/5.8 deferred (not needed) | Feb 2026 |
| n8n Bug Fixes | Max turns cap, parser rewrite, Gemini Flash 3, post-loop analyzer | Feb 2026 |
| E2E Validation | 2 test runs (H9C, J90) — system stable, 10/10 success on second run | Feb 2026 |
| Dashboard Realignment | Phases 1-3: bug fixes, page rewrites, nav reorganization | Feb 2026 |
| Agentic Refactor v2 (Phases 1-5) | DB columns, API endpoints, 5 components, page rewrite, hooks | Feb 2026 |
| Agentic Refactor v2 (Phase 7 partial) | Evaluator post-loop analyzer (PG Aggregate + LLM + Save Report) | Feb 2026 |
| Prompt Optimizer Workflow | n8n workflow JSON created (ID: honcSigslEtpoVqy) | Jan 2026 |

> Dettagli storici in `archive/PRD-v3-index.md` e `archive/PRD-n8n-integration-v2.md`

---

## Active Specs

Specs attive con lavoro pendente, in ordine di priorità:

### 1. Agentic Refactor v2 — Remaining Work

**File**: [agentic-refactor-v2.md](specs/agentic-refactor-v2.md)
**Status**: IN PROGRESS (~70% done, ~3-4h remaining)
**Source**: Party Mode Brainstorming (Jan 24)

Already done: DB columns, API endpoints, 5 agentic components, page rewrite, hooks, evaluator post-loop analyzer, optimizer JSON.

Remaining:
- FIX: Webhook handler not persisting `analysis_report` (circular dependency with optimizer trigger)
- FIX: `use-agent-health` partial outcome count hardcoded to 0
- VERIFY: Optimizer workflow deployment + `workflow_configs` row
- VALIDATE: LLM prompts in n8n (analyzer + optimizer) — flagged NEEDS_OPTIMIZATION
- WIRE: Draft approval flow (create draft → diff → approve/discard)
- E2E: Full flow test

---

## Planned Specs

Non ancora prioritizzate, da fare dopo le Active:

### 5. UI Refactor Minimal

**File**: [ui-refactor-minimal.md](specs/ui-refactor-minimal.md)
**Status**: PENDING
**Effort**: TBD

Redesign dashboard principale con estetica minimal moderna, shadcn/ui v4 patterns.

### 6. Prompt Diff Viewer Rewrite

**File**: [prompt-diff-viewer-rewrite.md](specs/prompt-diff-viewer-rewrite.md)
**Status**: BLOCKED (needs UI agent focus)

Fix layout issues: horizontal scroll, text wrapping, panel scroll, edit mode.

---

## Deferred

| Item | File | Notes |
|------|------|-------|
| Phase 8: Polish | (no spec file) | Error handling, loading states, mobile |
| Enterprise Features | [ROADMAP](features/ROADMAP-enterprise-features.md) | Rate limiting, multi-tenant, public API |

---

## Housekeeping

| Task | Priority | Notes |
|------|----------|-------|
| Remove .backup files | LOW | dashboard-overview.tsx.backup, filter-bar.tsx.backup |
| Fix Playwright tests | MEDIUM | 5 failing (evaluator), 8 skipped (/evaluations page) |
| Add unit tests | LOW | Vitest + RTL, currently 0% |
| Setup CI/CD | LOW | No GitHub Actions |

---

## Key References

| Resource | Location |
|----------|----------|
| Frontend docs | `docs/frontend.md` |
| Backend docs | `docs/backend.md` |
| n8n docs | `docs/n8n.md` |
| Session state | `_project_specs/session/current-state.md` |
| Code landmarks | `_project_specs/session/code-landmarks.md` |
| Schema reference | `_project_specs/schema-reference.md` |
| n8n changelog | `_project_specs/n8n/CHANGELOG.md` |

## n8n Workflows

| Workflow | ID | Trigger |
|----------|----|---------|
| Test RUNNER | XmpBhcUxsRpxAYPN | `/webhook/test-runner` |
| Battle Agent | Z35cpvwXt7Xy4Mgi | sub-workflow |
| Evaluator | 202JEX5zm3VlrUT8 | sub-workflow |
| Personas Generator | HltftwB9Bm8LNQsO | `/webhook/generate-personas` |
| Prompt Optimizer | honcSigslEtpoVqy | `/webhook/optimizer` |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/test-runs` | Start new test run |
| POST | `/api/test-runs/[id]/abort` | Kill switch |
| POST | `/api/test-runs/[id]/continue` | Resume after review |
| GET/POST | `/api/personas` | Persona CRUD |
| POST | `/api/personas/[id]/feedback` | Add feedback notes |
| GET | `/api/prompts/names` | List prompt names |
| GET/POST | `/api/evaluator-configs` | Evaluator config CRUD (E2) |
| GET | `/api/evaluations` | List evaluations (E2) |
| POST | `/api/n8n/trigger` | Trigger optimizer/analyzer workflows |
| POST | `/api/n8n/webhook` | Receive n8n callbacks |

---

## Workflow: Come Usare Questo Indice

```
1. Guarda "Active Specs" sopra
2. Scegli la spec con priorità più alta
3. Apri il file SPEC corrispondente
4. Implementa con TDD: /ralph-spec [spec-name]
5. Aggiorna lo status nella spec
6. Aggiorna questo indice
```
