---
version: 4.0
project: AI Agent Testing Dashboard
created: 2026-02-16
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

> Dettagli storici in `archive/PRD-v3-index.md` e `archive/PRD-n8n-integration-v2.md`

---

## Active Specs

Specs attive con lavoro pendente, in ordine di priorità:

### 1. Evaluator Multi-Prompt (E2-E5)

**File**: [evaluator-multi-prompt.md](specs/evaluator-multi-prompt.md) + [tasks](specs/evaluator-multi-prompt-tasks.md)
**Status**: E1 DONE, E2-E5 PENDING
**Effort**: ~18h remaining
**Source**: Party Mode Brainstorming (Jan 29)

Evoluzione dell'evaluator da hardcoded a dinamico con criteri configurabili e A/B testing.

| Epic | Description | Status | Effort |
|------|-------------|--------|--------|
| E1 Schema + Migration | 3 nuove tabelle + data migration | DONE | 3h |
| E2 API Endpoints | CRUD evaluator-configs, evaluations, compare | PENDING | 4h |
| E3 n8n Workflow Update | Evaluator usa criteri dinamici | PENDING | 3h |
| E4 UI Evaluator Management | Pagina /evaluators | PENDING | 5h |
| E5 UI Re-evaluate + Compare | A/B comparison overlay | PENDING | 6h |

```
E1 (DONE) → E2 (API) → E4 (UI Evaluator)
  │            │
  │            └──→ E5 (UI Compare)
  │
  └──→ E3 (n8n Workflow) ← can run parallel with E2
```

### 2. Evaluator Migration (n8n Workflow)

**File**: [evaluator-migration.md](specs/evaluator-migration.md)
**Status**: Ready for Implementation
**Effort**: ~2h
**Dependency**: None (independent from multi-prompt)

Migra il workflow n8n Evaluator dal vecchio schema (conversations/turns) al nuovo (test_runs/battle_results). 4 nodi da modificare, 1 da eliminare.

> Nota: Questa migration va fatta PRIMA di E3 (multi-prompt workflow update), oppure assorbita in E3.

### 3. Phase 5: n8n Workflows

**File**: [phase-5-n8n.md](specs/phase-5-n8n.md)
**Status**: PARTIAL (4 pending su 9)
**Effort**: ~3h

| Requirement | Description | Status |
|-------------|-------------|--------|
| REQ-5.6 | Check Abort #2 (after LLM) in Battle Agent | PENDING |
| REQ-5.7 | x-n8n-secret header on HTTP callbacks | PENDING |
| REQ-5.8 | Tool Mocking in Battle Agent | PENDING |
| REQ-5.9 | Update test_run status to 'completed' | PENDING |

### 4. Agentic Refactor v2

**File**: [agentic-refactor-v2.md](specs/agentic-refactor-v2.md)
**Status**: APPROVED, not started
**Effort**: ~10h
**Source**: Party Mode Brainstorming (Jan 24)

Refactor `/agentic` da demo con dati fake a "Agent Health Monitor" con dati reali.

Key changes:
- BattleArena → `/test-launcher`
- PersonaGenerator → `/personas`
- Analyzer = Evaluator esteso (non workflow separato)
- Optimizer = Nuovo workflow n8n
- Design system: Soft Pop Theme

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
