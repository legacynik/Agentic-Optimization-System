# Guida Implementazione PRD v2.4 Lean

> Usa questo documento come contesto iniziale per sessioni di implementazione.

## Contesto

Implementare `_project_specs/features/PRD-n8n-integration-v2.md` (v2.4 Lean) - sistema testing AI agents con dashboard Next.js + n8n workflows.

**Tech Stack**: Next.js 14, TypeScript, Supabase, shadcn/ui, n8n (Railway)

---

## Pre-requisiti (5 min)

```bash
# 1. Genera secret
echo "N8N_SECRET=$(openssl rand -hex 32)" >> .env.local

# 2. Installa dipendenza
pnpm add use-debounce

# 3. Configura stesso N8N_SECRET in Railway → n8n → Environment Variables
#    Aggiungi anche: DASHBOARD_CALLBACK_URL=https://your-dashboard.vercel.app
```

---

## Fasi Implementazione

| Phase | Focus | Output Principale |
|-------|-------|-------------------|
| 1 | Schema + API base | Migrations, `/api/test-runs`, `/api/n8n/webhook` |
| 2 | Personas | `/api/personas`, `prompt_personas` junction |
| 3 | Tool Mocking | `lib/tool-scenarios.ts`, test config UI |
| 4 | n8n Integration | Check Abort nodes, callbacks, E2E test |
| 5 | Full Cycle | Analyzer, Optimizer, human review flow |
| 6 | Personas Generator | Workflow + validation |
| 7 | Optimization UI | Prompt diff viewer, approval flow |
| 8 | Polish | Error handling, loading states |

---

## Workflow BMAD per UI (subagents paralleli)

```
*workflow-init → scegli "Feature Implementation"
```

Per UI components in parallelo, usa **Task tool** con:
- `subagent_type: "react-nextjs-developer"` per componenti React/Next.js
- `subagent_type: "backend-developer"` per API routes

**Esempio lancio parallelo:**
```
"Lancia in parallelo:
 1. react-nextjs-developer: Settings Page UI (components/settings/)
 2. backend-developer: /api/settings CRUD endpoints
 3. react-nextjs-developer: Test Launcher form (components/test-launcher/)"
```

---

## File Chiave da Leggere

| File | Contenuto |
|------|-----------|
| `_project_specs/features/PRD-n8n-integration-v2.md` | Spec completa v2.4 |
| `_project_specs/n8n/MODIFICATIONS-REQUIRED.md` | Task manuali n8n |
| `_project_specs/n8n/CHANGELOG.md` | Cronologia modifiche n8n |
| `.claude/skills/base/SKILL.md` | Coding standards |
| `.claude/skills/supabase-nextjs/SKILL.md` | Patterns Supabase + Next.js |
| `.claude/skills/security/SKILL.md` | Security patterns |

---

## Regole Coding (da CLAUDE.md)

- **Commenta tutto**: header file + docstrings + inline per logica non ovvia
- **Testa manualmente**: avvia app, curl, verifica DB (unit test non basta)
- **Logging obbligatorio**: ogni feature deve loggare
- **`/code-review`** prima di ogni commit
- **Preflight**: `./scripts/preflight.sh` prima di push

### MCP Tools da Usare
- **Brainstorming/Analisi**: `mcp__sequential-thinking__sequentialthinking`
- **Docs librerie**: Context7 (`mcp__context7__query-docs`)
- **Database**: Supabase MCP tools (`mcp__supabase__*`)

---

## Schema Semplificato v2.4

| Entità | Semplificazione |
|--------|-----------------|
| `prompt_personas` | Join semplice (NO override_config, NO version-specific) |
| `validation_status` | Solo 2 stati: `'pending'` \| `'validated'` |
| `mode` | Solo 2 valori: `'single'` \| `'full_cycle_with_review'` |
| `tool_scenario_id` | VARCHAR string (NO UUID, NO FK) |
| `cycle_state` | **RIMOSSO** (recovery manuale per MVP) |

---

## Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD (Next.js)                                            │
│                                                                 │
│  [Test Launcher] ──► POST /api/test-runs ──► trigger n8n       │
│                                                                 │
│  [Status Monitor] ◄── polling GET /api/test-runs/:id           │
│                                                                 │
│  [Webhook Handler] ◄── POST /api/n8n/webhook ◄── n8n callback  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  N8N (Railway)                                                  │
│                                                                 │
│  [Test Runner] → [Evaluator] → [Analyzer] → [Optimizer]        │
│       │              │              │             │             │
│       └──────────────┴──────────────┴─────────────┘             │
│                    callbacks to dashboard                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                       │
│                                                                 │
│  prompt_versions ◄─► prompt_personas ◄─► personas              │
│        │                                      │                 │
│        ▼                                      ▼                 │
│   test_runs ──────────────────────► battle_results             │
└─────────────────────────────────────────────────────────────────┘
```

---

## n8n Task Manuali (Phase 4)

1. **Check Abort nodes** (2 punti: pre-LLM + post-LLM)
2. **Header `x-n8n-secret`** su tutti i callback HTTP
3. **Query personas** con `validation_status = 'validated'`

Tempo stimato: ~40 min per workflow

---

## Quick Start Sessione

```
1. Leggi questo file come contesto
2. *workflow-init → Feature Implementation
3. Chiedi: "Inizia Phase X del PRD"
4. Usa subagents paralleli per UI + Backend
5. /code-review prima di commit
```

---

*Ultimo aggiornamento: 2026-01-19 - PRD v2.4 Lean*
