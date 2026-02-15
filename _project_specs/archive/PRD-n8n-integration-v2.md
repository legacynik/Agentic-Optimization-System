# PRD: n8n Integration v2 - Full Cycle Testing System

**Version**: 2.4 Lean
**Author**: Claude + User
**Date**: 2026-01-19
**Status**: Ready for Implementation (MVP Single-User)

> ⚠️ **v2.4 LEAN**: Versione ultra-semplificata per MVP single-user.
> Enterprise features in `ROADMAP-enterprise-features.md`.
>
> **Changelog v2.4 da v2.3:**
> - Rimosso FK `tool_scenario_id` → VARCHAR con CHECK constraint
> - Rimosso `full_cycle` mode → solo `single` | `full_cycle_with_review`
> - Rimosso `/api/tool-scenarios` endpoints → scenari hardcoded
> - Rimosso `cycle_state` JSONB → recovery manuale per MVP
> - Semplificato `prompt_personas` → no override_config
> - Ridotto `validation_status` → solo 'pending' | 'validated'
> - Semplificato LLM config → selezione senza costi realtime
> - Aggiunto n8n Implementation Notes section
> - Ottimizzato Check Abort → 2 punti invece di 4+

---

## 1. Executive Summary

Sistema di testing per AI agents che integra dashboard Next.js con workflow n8n. Ottimizzato per **single-user agency use case**.

### Decisioni Chiave v2.3
- **NO** Upstash/Redis rate limiting (single user → in-memory + debounce)
- **NO** timing-safe HMAC (tool interno → string comparison sufficiente)
- **NO** autonomous optimization loop (rischio overfitting → human review obbligatorio)
- **NO** tool_mock_scenarios su DB (3 scenari → hardcoded)
- **SI** trigger da dashboard + manuale n8n
- **SI** relazione personas ↔ prompts (many-to-many con override)
- **SI** settings page per configurare webhook URLs + **LLM models**
- **SI** Kill Switch per fermare test in corso
- **SI** Cost Estimation prima di lanciare test

### Modalità Test (v2.4 Simplified)
- **Single Test**: Test → Evaluate → STOP
- **Full Cycle with Review**: Test → Evaluate → Analyze → **Human Review** → Optimize → Loop

> ~~Full Cycle Auto~~: **RIMOSSO** in v2.3 (vedi `ROADMAP-enterprise-features.md`)

### Human-in-the-Loop (OBBLIGATORIO)
- **Note Umane**: Aggiungere note analizzando conversations
- **Feedback Integration**: Note considerate nell'analisi
- **Personas Feedback**: Feedback per miglioramento iterativo
- **Optimization Review**: **SEMPRE** richiesto prima di applicare modifiche AI

### LLM Configuration
Sistema supporta LLM diversi per ruoli diversi:
- **Battle Agent LLM**: GPT-4.1 mini, GPT-5 mini (configurabile)
- **Persona LLM**: GPT-4.1 mini, GPT-5 mini (configurabile)
- **Evaluator LLM**: Claude Sonnet 4, Gemini 2.5 Pro (sempre diverso da battle)
- **Analyzer/Optimizer LLM**: Modelli potenti (Sonnet 4, GPT-4.1)

### Personas Validation Cycle
- **Test Personas**: Ogni nuova persona testata dopo creazione
- **Evaluator Personas**: Workflow dedicato per validazione
- **Improvement Loop**: Personas → Test → Evaluate → Improve → Repeat

### n8n Environment
- **Host**: Railway (primary-production-1d87.up.railway.app)
- **Test Runner Webhook**: `https://primary-production-1d87.up.railway.app/webhook/5877058c-19fd-4f26-add4-66b3526c4a96`

---

## 2. Current State Analysis

### 2.1 Schema Database

**Tabelle Legacy (da deprecare gradualmente):**
```
prompts (dati presenti, usato da n8n legacy)
├── promptversionid (PK, text)
├── category, prompttext, status

testruns (legacy, text IDs)
├── testrunid (PK, text)
└── promptversionid (FK text)
```

**Tabelle Nuove (version-centric, appena create):**
```
prompt_versions (15 rows, fonte principale going forward)
├── id (PK, UUID)
├── prompt_name, version, content, status
├── avg_score, avg_success_rate, total_test_runs
└── created_from (self-ref per lineage)

personas (aggiornata con UUID)
├── id (UUID) ← NUOVO
├── personaid (text, legacy)
├── name, personaprompt, category

test_runs (nuova, UUID-based)
├── id (PK, UUID)
├── test_run_code (unique)
├── prompt_version_id (FK → prompt_versions)
├── personas_tested (UUID[])
├── overall_score, success/failure/timeout_count
├── failure_patterns, strengths, weaknesses (JSONB)
└── status: running/completed/failed

battle_results (nuova)
├── id (PK, UUID)
├── test_run_id (FK → test_runs)
├── persona_id (FK → personas.id)
├── outcome, score, turns, transcript, evaluation_details
```

**View:**
- `version_performance_summary` - metriche aggregate per prompt_version

### 2.2 UI Components Esistenti (tutti con mock data)

| Component | Location | Stato |
|-----------|----------|-------|
| BattleArena | `components/agentic/battle-arena.tsx` | UI completa, simulated |
| PersonaGenerator | `components/agentic/persona-generator.tsx` | UI completa, templates |
| PersonaWorkshop | `components/version-centric/persona-workshop.tsx` | Approve/Reject flow |
| PromptVersionsHub | `components/version-centric/prompt-versions-hub.tsx` | Timeline versioni |
| Test Launcher | `app/test-launcher/page.tsx` | Lista hardcoded |
| Agentic Dashboard | `app/agentic/page.tsx` | Tabs + KPIs mock |

### 2.3 Workflow n8n Attuali

**Test RUNNER Battle (aggiornato con webhook):**
```
[Webhook Trigger] ← prompt_version_id (UUID)
    ↓
[Get Prompt by ID from prompt_versions]
    ↓
[Select ALL personas] ← DA MODIFICARE: filtrare per prompt
    ↓
[Loop] → [Test Battle Agent sub-workflow]
    ↓
[Trigger Evaluator] ← auto-trigger a fine test
```

**Evaluator (auto-triggered):**
```
[Trigger from Test Runner OR manual]
    ↓
[Get conversations WHERE evaluation IS NULL]
    ↓
[Loop] → [Evaluate with AI] → [Save scores to evaluationcriteria]
```

### 2.4 Gap Analysis

| What Exists | What's Missing |
|-------------|----------------|
| UI Components (mock data) | Real Supabase queries |
| Webhook on n8n (test runner) | prompt_personas junction table |
| test_runs table (UUID) | workflow_configs table for settings |
| battle_results table | Settings UI page |
| Evaluator workflow | Dashboard callback handling |
| prompt_versions table | Personas Generator workflow |
| - | Analyzer workflow |
| - | Optimizer workflow |

---

## 3. Target Architecture

### 3.1 Tabelle Deprecate (Legacy Read-Only)

| Tabella | Sostituita da | Motivo deprecazione |
|---------|---------------|---------------------|
| `turns` | `battle_results.transcript` | Duplicava `n8n_chat_histories` |
| `conversations` | `battle_results` | Struttura obsoleta |
| `evaluationcriteria` | `battle_results.evaluation_details` | Ora embedded JSONB |
| `testruns` | `test_runs` | Nuovo schema UUID |
| `prompts` | `prompt_versions` | Nuovo schema con metriche |

### 3.2 Full System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD (Next.js)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Test Launcher │  │   Personas   │  │Conversations │  │  Settings   │ │
│  │    Page       │  │  Workshop    │  │  Explorer    │  │    Page     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                  │        │
│         └─────────────────┴─────────────────┴──────────────────┘        │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     API Routes (Next.js)                          │  │
│  │  /api/n8n/trigger-test     → trigger test run                    │  │
│  │  /api/n8n/trigger-personas → trigger personas generation         │  │
│  │  /api/n8n/webhook          → receive callbacks from n8n          │  │
│  │  /api/settings             → CRUD workflow configs               │  │
│  │  /api/personas             → CRUD personas + associations        │  │
│  │  /api/battle-notes         → CRUD human notes on battles         │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE                                      │
│                                                                          │
│  ┌────────────────┐      ┌────────────────┐      ┌─────────────────┐   │
│  │ prompt_versions │◄────│ prompt_personas │────►│    personas     │   │
│  │  (15 rows)      │     │   (junction)    │     │   (UUID)        │   │
│  └───────┬─────────┘     └────────────────┘      └────────┬────────┘   │
│          │                                                 │            │
│          ▼                                                 ▼            │
│  ┌───────────────┐                               ┌─────────────────┐   │
│  │  test_runs    │──────────────────────────────►│ battle_results  │   │
│  │               │                               │  • transcript   │   │
│  │               │                               │  • eval_details │   │
│  └───────────────┘                               │  • human_notes  │   │
│                                                  └─────────────────┘   │
│  ┌────────────────────┐   ┌─────────────────┐                          │
│  │  workflow_configs  │   │ battle_notes    │ (note umane separate)   │
│  │   (settings)       │   └─────────────────┘                          │
│  └────────────────────┘                                                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  n8n_chat_histories (memoria n8n - fonte transcript)            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      N8N (Railway Hosted)                                │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  1. TEST RUNNER WORKFLOW                                           │ │
│  │     [Webhook] ← { prompt_version_id, mode: "single"|"full_cycle_with_review" } │ │
│  │         ↓                                                          │ │
│  │     [Get prompt from prompt_versions]                              │ │
│  │         ↓                                                          │ │
│  │     [Get personas via prompt_personas JOIN]                        │ │
│  │         ↓                                                          │ │
│  │     [Create test_run record]                                       │ │
│  │         ↓                                                          │ │
│  │     [Loop personas] → [Battle Agent] (usa n8n_chat_histories)      │ │
│  │         ↓                                                          │ │
│  │     [Copy transcript to battle_results]                            │ │
│  │         ↓                                                          │ │
│  │     [Trigger Evaluator]                                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  2. EVALUATOR WORKFLOW (auto-triggered)                            │ │
│  │     [Webhook] ← { test_run_id }  ⚠️ REQUIRED to avoid race cond.  │ │
│  │         ↓                                                          │ │
│  │     [Get battle_results WHERE test_run_id=:id AND eval IS NULL]   │ │
│  │         ↓                                                          │ │
│  │     [Loop] → [AI Evaluate transcript] → [Update battle_results]    │ │
│  │         ↓                                                          │ │
│  │     [Update test_run aggregates]                                   │ │
│  │         ↓                                                          │ │
│  │     IF mode="single" → STOP                                        │ │
│  │     IF mode="full_cycle_with_review" → [Trigger Analyzer]          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  3. ANALYZER WORKFLOW                                              │ │
│  │     [Get test_run + all battle_results]                            │ │
│  │     [Get human_notes from battle_notes]  ← NOTE UMANE              │ │
│  │         ↓                                                          │ │
│  │     [AI Analyze patterns, strengths, weaknesses]                   │ │
│  │         ↓                                                          │ │
│  │     [Update test_run.failure_patterns, strengths, weaknesses]      │ │
│  │         ↓                                                          │ │
│  │     [Trigger Optimizer]                                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  4. OPTIMIZER WORKFLOW                                             │ │
│  │     [Get prompt_version + analysis]                                │ │
│  │         ↓                                                          │ │
│  │     [AI suggest specific improvements]                             │ │
│  │         ↓                                                          │ │
│  │     [Create new prompt_version (status=draft)]                     │ │
│  │         ↓                                                          │ │
│  │     IF iteration < max_iterations → [Trigger Test Runner]          │ │
│  │     ELSE → STOP, await human review                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  5. PERSONAS GENERATOR WORKFLOW                                    │ │
│  │     [Webhook] ← { prompt_version_id, count, criteria }             │ │
│  │         ↓                                                          │ │
│  │     [AI Generate personas based on prompt context]                 │ │
│  │         ↓                                                          │ │
│  │     [Insert personas + prompt_personas]                            │ │
│  │         ↓                                                          │ │
│  │     [Trigger Personas Validator]                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  6. PERSONAS VALIDATOR WORKFLOW                                    │ │
│  │     [Get new persona]                                              │ │
│  │         ↓                                                          │ │
│  │     [Run test battle: persona vs sample prompt]                    │ │
│  │         ↓                                                          │ │
│  │     [AI Evaluate: does persona achieve its purpose?]               │ │
│  │         ↓                                                          │ │
│  │     IF valid → [Mark persona validated]                            │ │
│  │     IF invalid → [AI improve persona] → [Re-test]                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Data Flow: Transcript (Semplificato)

```
n8n Battle Agent
    │
    ▼ (memoria durante conversazione)
n8n_chat_histories.message (JSONB)
    │
    ▼ (a fine battle, copia formattata)
battle_results.transcript (JSONB)
    │
    ▼ (lettura da dashboard)
Conversations Explorer UI
```

**Nessuna duplicazione**: `n8n_chat_histories` è la fonte, `battle_results` contiene la copia strutturata finale.

### 3.4 Test Modes (v2.4 Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│  SINGLE TEST MODE                                                │
│  Test Runner → Evaluator → STOP                                 │
│  (per test manuali, debugging)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FULL CYCLE WITH REVIEW MODE (con max_iterations)               │
│  ⚠️ HUMAN REVIEW OBBLIGATORIO prima di ogni iterazione         │
│                                                                  │
│  ┌─────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐ │
│  │  Test   │───►│ Evaluator │───►│ Analyzer │───►│  HUMAN    │ │
│  │ Runner  │    │           │    │          │    │  REVIEW   │ │
│  └─────────┘    └───────────┘    └──────────┘    └─────┬─────┘ │
│       ▲                                                │        │
│       │                                          [APPROVE]      │
│       │                                                │        │
│       │    ┌───────────┐                               │        │
│       └────│ Optimizer │◄──────────────────────────────┘        │
│            └───────────┘                                        │
│                                                                  │
│  STOP when: iteration >= max_iterations OR human_stop/reject    │
└─────────────────────────────────────────────────────────────────┘
```

> **v2.4**: Rimosso `full_cycle` (auto loop). Solo `full_cycle_with_review` disponibile.

### 3.5 Human-in-the-Loop Integration

```
┌─────────────────────────────────────────────────────────────────┐
│  HUMAN NOTES FLOW                                                │
│                                                                  │
│  1. User legge transcript in Conversations Explorer             │
│  2. User aggiunge note (issue/suggestion/positive)              │
│  3. Note salvate in battle_notes                                │
│  4. Analyzer legge note quando analizza test_run                │
│  5. Optimizer considera note per suggerimenti                   │
│                                                                  │
│  battle_notes                                                    │
│  ├── battle_result_id                                           │
│  ├── note TEXT                                                  │
│  ├── category: issue | suggestion | positive | question         │
│  └── created_at                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PERSONAS FEEDBACK FLOW                                          │
│                                                                  │
│  1. User vede risultati persona in test                         │
│  2. User aggiunge feedback su persona (via UI)                  │
│  3. Feedback salvato in personas.feedback_notes (JSONB array)   │
│  4. Personas Validator considera feedback nel re-test           │
│  5. Persona migliorata iterativamente (max 3 tentativi)         │
│  6. Se ancora failed → elimina e ricrea (MVP: no 'needs_human_review') │
│                                                                  │
│  API: POST /api/personas/:id/feedback                           │
│  Body: { "note": "...", "from_battle_result_id": "uuid" }       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Full Cycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    "START FULL CYCLE" BUTTON                     │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: TEST RUNNER                                              │
│   • Riceve prompt_version_id                                     │
│   • Prende personas associate (via prompt_personas)              │
│   • Esegue battles per ogni persona                              │
│   • Salva risultati in battle_results                            │
│   Output: test_run con battle_results                            │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: EVALUATOR (auto-trigger)                                 │
│   • Trova conversations senza valutazione                        │
│   • Valuta con AI secondo criteri standard                       │
│   • Salva scores in evaluationcriteria                           │
│   Output: scores per ogni criterio                               │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: ANALYZER (manual o auto)                                 │
│   • Aggrega risultati test_run                                   │
│   • Identifica failure_patterns                                  │
│   • Estrae strengths e weaknesses                                │
│   Output: analysis report                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: OPTIMIZER (manual trigger con review)                    │
│   • Analizza prompt + failure patterns                           │
│   • Suggerisce modifiche specifiche                              │
│   • Crea DRAFT di nuova prompt_version                           │
│   Output: prompt_version draft con optimization_notes            │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: HUMAN REVIEW                                             │
│   • Dashboard mostra diff prompt                                 │
│   • User approva/modifica/rifiuta                                │
│   • Se approvato: status → 'testing'                             │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
               ┌───────────┴───────────┐
               │  LOOP: Torna a Step 1 │
               │  con nuova versione   │
               └───────────────────────┘
```

---

## 4. Database Schema Updates

### 4.1 workflow_configs (NEW)

Tabella per storare configurazioni webhook e stato workflows.

```sql
CREATE TABLE workflow_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type VARCHAR(50) UNIQUE NOT NULL,
  -- Values: 'test_runner', 'evaluator', 'personas_generator', 'analyzer', 'optimizer'

  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Configurazione specifica per tipo workflow
  config JSONB DEFAULT '{}',
  -- Es: { "max_turns": 30, "timeout_seconds": 300, "auto_trigger_next": true }

  -- Tracking
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  total_executions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config (con retry_policy - AUDIT FIX)
INSERT INTO workflow_configs (workflow_type, webhook_url, config) VALUES
('test_runner', 'https://primary-production-1d87.up.railway.app/webhook/5877058c-19fd-4f26-add4-66b3526c4a96',
 '{"max_turns": 35, "timeout_seconds": 300, "auto_trigger_evaluator": true, "retry_policy": {"max_attempts": 3, "backoff_type": "exponential", "base_delay_ms": 1000, "max_delay_ms": 30000, "retry_scope": "current_step"}}'),
('evaluator', '', '{"auto_trigger": true, "retry_policy": {"max_attempts": 3, "backoff_type": "exponential", "base_delay_ms": 1000, "max_delay_ms": 30000, "retry_scope": "current_step"}}'),
('personas_generator', '', '{"default_count": 5, "difficulty_mix": {"easy": 0.3, "medium": 0.4, "hard": 0.2, "extreme": 0.1}, "retry_policy": {"max_attempts": 2, "backoff_type": "fixed", "base_delay_ms": 5000}}'),
('analyzer', '', '{"retry_policy": {"max_attempts": 3, "backoff_type": "exponential", "base_delay_ms": 1000, "max_delay_ms": 30000, "retry_scope": "current_step"}, "iteration_delay_seconds": 60}'),
('optimizer', '', '{"require_human_approval": true, "retry_policy": {"max_attempts": 2, "backoff_type": "fixed", "base_delay_ms": 5000}, "iteration_delay_seconds": 60}');
```

**Retry Policy Schema**:
```typescript
interface RetryPolicy {
  max_attempts: number;          // Default: 3
  backoff_type: 'exponential' | 'fixed' | 'linear';
  base_delay_ms: number;         // Default: 1000
  max_delay_ms?: number;         // Per exponential, default: 30000
  retry_scope: 'current_step' | 'full_cycle';  // Cosa ripartire
}
```

### 4.2 prompt_personas (NEW - Simple Junction)

> **v2.4 SIMPLIFIED**: Rimosso override_config e version-specific binding.
> Se serve config diversa per una versione → crea una nuova persona.

```sql
CREATE TABLE prompt_personas (
  -- Chiave composita semplice
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  prompt_name VARCHAR(255) NOT NULL, -- Es: "qual-audit-sa"

  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,  -- Ordine nei test
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (persona_id, prompt_name)
);

-- Indexes per query
CREATE INDEX idx_prompt_personas_prompt_name ON prompt_personas(prompt_name);

-- RLS
ALTER TABLE prompt_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON prompt_personas FOR ALL USING (true);
```

### 4.3 Query Personas per Test Run

> **v2.4 SIMPLIFIED**: Query diretta senza UNION, override_config rimosso.

```sql
-- Get personas for a specific prompt
-- AUDIT FIX: Filtra solo personas validate (validation_status = 'validated')
SELECT
  p.id,
  p.personaid,
  p.name,
  p.personaprompt,
  p.category,
  p.difficulty,  -- Usa difficulty della persona direttamente
  pp.priority
FROM personas p
JOIN prompt_personas pp ON p.id = pp.persona_id
WHERE pp.prompt_name = :prompt_name
  AND pp.is_active = true
  AND p.validation_status = 'validated'  -- ⚠️ CRITICAL: solo validate!
ORDER BY pp.priority, p.category
LIMIT :limit OFFSET :offset;  -- Default: LIMIT 100 OFFSET 0
```

**⚠️ IMPORTANTE**: Se nessuna persona è associata o tutte sono `validation_status != 'validated'`, il test non avrà personas (comportamento corretto - warning in UI).

### 4.4 battle_notes (NEW)

Tabella per note umane sulle conversazioni, usate dall'Analyzer per ottimizzazioni.

```sql
CREATE TABLE battle_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_result_id UUID NOT NULL REFERENCES battle_results(id) ON DELETE CASCADE,

  note TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('issue', 'suggestion', 'positive', 'question')),

  -- Per futuro multi-user
  created_by VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_battle_notes_result ON battle_notes(battle_result_id);
CREATE INDEX idx_battle_notes_category ON battle_notes(category);

-- RLS
ALTER TABLE battle_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON battle_notes FOR ALL USING (true);
```

**Utilizzo**:
- User legge transcript in Conversations Explorer
- Aggiunge nota con categoria
- Analyzer workflow query queste note per contesto

### 4.5 Tool Mock Scenarios (HARDCODED - v2.3 Lean)

> ⚠️ **v2.3 LEAN**: Scenari hardcoded in `lib/tool-scenarios.ts` invece di tabella DB.
> Per versione enterprise con DB, vedi `ROADMAP-enterprise-features.md`.

**File**: `lib/tool-scenarios.ts`

```typescript
// lib/tool-scenarios.ts
export type ToolScenarioId = 'happy_path' | 'calendar_full' | 'booking_fails' | 'returning_customer';

export interface ToolMockResponse {
  success: boolean;
  response?: Record<string, unknown>;
  error?: string;
  message?: string;
}

export interface ToolScenario {
  id: ToolScenarioId;
  name: string;
  description: string;
  mocks: Record<string, ToolMockResponse>;
}

export const TOOL_SCENARIOS: Record<ToolScenarioId, ToolScenario> = {
  happy_path: {
    id: 'happy_path',
    name: 'Happy Path',
    description: 'Tutti i tool funzionano, slot disponibili',
    mocks: {
      check_calendar: { success: true, response: { available_slots: ['10:00', '14:00', '16:00'] } },
      book_appointment: { success: true, response: { confirmation_code: 'CONF-001', status: 'confirmed' } },
      get_customer_info: { success: true, response: { name: 'Mario Rossi', is_new: true } }
    }
  },
  calendar_full: {
    id: 'calendar_full',
    name: 'Calendar Full',
    description: 'Nessuno slot disponibile',
    mocks: {
      check_calendar: { success: true, response: { available_slots: [] } },
      book_appointment: { success: false, error: 'no_slots_available' },
      get_customer_info: { success: true, response: { name: 'Cliente Test', is_new: true } }
    }
  },
  booking_fails: {
    id: 'booking_fails',
    name: 'Booking Fails',
    description: 'Calendario ok ma booking fallisce',
    mocks: {
      check_calendar: { success: true, response: { available_slots: ['10:00', '14:00'] } },
      book_appointment: { success: false, error: 'system_error', message: 'Errore temporaneo, riprovare' },
      get_customer_info: { success: true, response: { name: 'Cliente Test', is_new: true } }
    }
  },
  returning_customer: {
    id: 'returning_customer',
    name: 'Returning Customer',
    description: 'Cliente con storico',
    mocks: {
      check_calendar: { success: true, response: { available_slots: ['10:00', '14:00', '16:00'] } },
      book_appointment: { success: true, response: { confirmation_code: 'CONF-002' } },
      get_customer_info: { success: true, response: { name: 'Giuseppe Verdi', is_new: false, last_visit: '2024-01-15', notes: 'Preferisce mattina' } }
    }
  }
};

export const DEFAULT_SCENARIO: ToolScenarioId = 'happy_path';

export function getScenario(id: ToolScenarioId): ToolScenario {
  return TOOL_SCENARIOS[id] || TOOL_SCENARIOS[DEFAULT_SCENARIO];
}

export function getScenarioOptions() {
  return Object.values(TOOL_SCENARIOS).map(s => ({
    value: s.id,
    label: s.name,
    description: s.description
  }));
}
```

**Uso in Frontend**:
```typescript
import { getScenarioOptions, TOOL_SCENARIOS } from '@/lib/tool-scenarios';

// Nel Test Launcher dropdown
const scenarios = getScenarioOptions();
// [{ value: 'happy_path', label: 'Happy Path', description: '...' }, ...]
```

**Uso in n8n**: Passa `tool_scenario_id` (string) nel webhook payload.
n8n Code Node fa switch su stringa per selezionare mock appropriati.

**Tool Mocks Override**:
Il frontend può ancora passare `tool_mocks_override` per sovrascrivere singoli tool:
```javascript
// n8n Test Runner - Merge logic
const baseScenario = SCENARIOS[tool_scenario_id] || SCENARIOS.happy_path;
let mocks = { ...baseScenario.mocks };

// Override singoli tool se specificato
if (tool_mocks_override) {
  for (const [tool, config] of Object.entries(tool_mocks_override)) {
    mocks[tool] = { ...(mocks[tool] || {}), ...config };
  }
}
```

### 4.6 test_runs Additions

Aggiunte alla tabella test_runs per supportare test modes e tool mocking.

```sql
-- Aggiungi colonne per test modes (v2.4: rimosso 'full_cycle')
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS mode VARCHAR(30) DEFAULT 'single'
  CHECK (mode IN ('single', 'full_cycle_with_review'));
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS max_iterations INTEGER DEFAULT 1;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS current_iteration INTEGER DEFAULT 1;

-- CHECK constraint: current_iteration non può superare max_iterations
ALTER TABLE test_runs ADD CONSTRAINT valid_iteration_count
  CHECK (current_iteration <= max_iterations AND current_iteration > 0);

-- stopped_reason con CHECK constraint per prevenire typos
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS stopped_reason VARCHAR(50);
ALTER TABLE test_runs ADD CONSTRAINT valid_stopped_reason
  CHECK (stopped_reason IN ('max_iterations_reached', 'human_stop', 'target_score_reached', 'error') OR stopped_reason IS NULL);

-- Riferimento a tool mock scenario (VARCHAR - scenari hardcoded, no FK)
-- v2.4: Rimosso FK a tool_mock_scenarios (tabella eliminata, scenari hardcoded)
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS tool_scenario_id VARCHAR(50);
ALTER TABLE test_runs ADD CONSTRAINT valid_tool_scenario
  CHECK (tool_scenario_id IN ('happy_path', 'calendar_full', 'booking_fails', 'partial_availability') OR tool_scenario_id IS NULL);

-- Heartbeat per stale run detection (ARCHITECT FIX)
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();

-- v2.4: RIMOSSO cycle_state - per single-user MVP, se fallisce si rilancia manualmente
-- Enterprise feature: vedi ROADMAP-enterprise-features.md per recovery automatico

-- Estendi test_config per includere override tool mocks inline
-- test_config JSONB può contenere:
/*
{
  "tool_mocks_override": {  -- Override dello scenario selezionato
    "check_calendar": {
      "success": true,
      "response": {"available_slots": ["09:00"]}  -- Solo un slot
    }
  },
  "target_score": 8.5,  -- Stop se raggiunto
  "notify_on_complete": true
}
*/
```

### 4.7 workflow_configs Update

Aggiungere personas_validator workflow type.

```sql
-- Aggiungi personas_validator
INSERT INTO workflow_configs (workflow_type, webhook_url, config) VALUES
('personas_validator', '', '{"auto_retest_on_fail": true, "max_improvement_attempts": 3}');
```

### 4.8 Tool Mocking Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  TEST LAUNCHER (Dashboard)                                       │
│                                                                  │
│  [Select Prompt Version]                                         │
│  [Select Test Mode: Single / Full Cycle with Review]            │
│  [Select Tool Scenario: happy_path ▼]  ← dropdown               │
│  [Max Iterations: 3] (se full_cycle_with_review)                │
│                                                                  │
│  [▶ START TEST]                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ POST /webhook/test-runner
┌─────────────────────────────────────────────────────────────────┐
│  WEBHOOK PAYLOAD                                                 │
│  {                                                               │
│    "prompt_version_id": "uuid",                                 │
│    "mode": "single",                                            │
│    "tool_scenario_id": "uuid",  // OR                           │
│    "tool_mocks_override": { ... }  // inline override           │
│  }                                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  n8n TEST RUNNER WORKFLOW                                        │
│                                                                  │
│  1. [Get tool_mock_scenarios by id]                             │
│  2. [Merge with override if present]                            │
│  3. [Pass mock_responses to Battle Agent]                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  n8n BATTLE AGENT (Sub-workflow)                                 │
│                                                                  │
│  AI Agent Node con Tools:                                        │
│  ├── check_calendar    → [Mock Tool Node]                       │
│  ├── book_appointment  → [Mock Tool Node]                       │
│  └── get_customer_info → [Mock Tool Node]                       │
│                                                                  │
│  Mock Tool Node:                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  const toolName = $input.item.json.tool;                │    │
│  │  const mocks = $('Get Mocks').item.json.mock_responses; │    │
│  │  return mocks[toolName]?.response || { error: 'unmocked' }; │ │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.9 personas Additions

Aggiunte alla tabella personas per validation e feedback.

> **v2.4 SIMPLIFIED**: Solo 2 stati di validazione: `pending` e `validated`.
> Se una persona fallisce validazione → eliminala e ricreala.

```sql
-- Stato validazione persona (v2.4: solo 2 stati)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50)
  DEFAULT 'pending'
  CHECK (validation_status IN ('pending', 'validated'));
-- NOTE: 'validating', 'failed', 'needs_human_review' rimossi in v2.4
-- Se fallisce → DELETE e ricrea. Più semplice per MVP single-user.

-- Note feedback umane sulla persona (JSONB array validation)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS feedback_notes JSONB DEFAULT '[]';
ALTER TABLE personas ADD CONSTRAINT valid_feedback_notes
  CHECK (jsonb_typeof(feedback_notes) = 'array');
/*
Formato:
[
  {
    "note": "Questa persona è troppo aggressiva",
    "from_test_run_id": "uuid",
    "from_battle_result_id": "uuid",
    "created_at": "2024-01-19T10:00:00Z"
  }
]
*/

-- v2.4: Rimosso feedback_updated_at timestamp (gestito in app code)

-- Prompt usato per validare la persona (con ON DELETE SET NULL)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS validation_prompt_id UUID;
ALTER TABLE personas ADD CONSTRAINT fk_validation_prompt
  FOREIGN KEY (validation_prompt_id) REFERENCES prompt_versions(id) ON DELETE SET NULL;

-- Indice per query personas non validate
CREATE INDEX IF NOT EXISTS idx_personas_validation_status ON personas(validation_status)
  WHERE validation_status != 'validated';

-- v2.4: Rimosso trigger update_feedback_timestamp (overkill per MVP)
-- La gestione feedback_notes è semplice: INSERT/UPDATE diretto
-- Se serve trigger futuro → vedi ROADMAP-enterprise-features.md
```

### 4.10 prompt_personas Validation

Aggiungere validazione applicativa per `prompt_name` consistency.

```sql
-- Function per validare che prompt_name esista in prompt_versions
CREATE OR REPLACE FUNCTION validate_prompt_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM prompt_versions WHERE prompt_name = NEW.prompt_name
  ) THEN
    RAISE EXCEPTION 'prompt_name "%" does not exist in prompt_versions', NEW.prompt_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on insert/update
CREATE TRIGGER trg_validate_prompt_name
  BEFORE INSERT OR UPDATE ON prompt_personas
  FOR EACH ROW
  EXECUTE FUNCTION validate_prompt_name();
```

### 4.11 Tool Mocking Session State

Per gestire sequenze di tool calls nella stessa battle (es. check_calendar → book_appointment).

```sql
-- Aggiungere a battle_results per tracciare stato tool durante battle
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS tool_session_state JSONB DEFAULT '{}';

-- JSONB validation constraint
ALTER TABLE battle_results ADD CONSTRAINT valid_tool_session_state
  CHECK (jsonb_typeof(tool_session_state) = 'object');

-- Estendere outcome per includere tool_error (AUDIT FIX)
ALTER TABLE battle_results DROP CONSTRAINT IF EXISTS battle_results_outcome_check;
ALTER TABLE battle_results ADD CONSTRAINT battle_results_outcome_check
  CHECK (outcome IN ('success', 'partial', 'failure', 'timeout', 'tool_error'));
/*
Formato:
{
  "selected_slot": "10:00",
  "customer_id": "123",
  "last_tool_called": "check_calendar",
  "tool_call_sequence": ["check_calendar", "book_appointment"]
}
*/
```

**Utilizzo nel Mock Tool Router (n8n)**:
```javascript
// Mock Tool Router con session state
const toolName = $input.item.json.tool_name;
const toolParams = $input.item.json.parameters;
const mocks = $('Get Mocks').item.json.mock_responses;
let sessionState = $('Battle Session').item.json.tool_session_state || {};

// Check if tool is mocked
if (!mocks[toolName]) {
  return {
    success: false,
    error: `Tool "${toolName}" not mocked - battle will be marked for review`,
    tool_session_state: sessionState
  };
}

const mockConfig = mocks[toolName];

// Update session state based on tool
if (toolName === 'check_calendar') {
  sessionState.available_slots = mockConfig.response.available_slots;
}
if (toolName === 'book_appointment') {
  sessionState.selected_slot = toolParams.slot || sessionState.available_slots?.[0];
  sessionState.booking_confirmed = mockConfig.success;
}

// Track call sequence
sessionState.tool_call_sequence = sessionState.tool_call_sequence || [];
sessionState.tool_call_sequence.push(toolName);
sessionState.last_tool_called = toolName;

// Handle dynamic values in response
let response = JSON.stringify(mockConfig.response);
response = response.replace('{{random}}', Math.random().toString(36).substr(2, 8));
response = response.replace('{{selected_slot}}', sessionState.selected_slot || 'N/A');
response = JSON.parse(response);

return {
  success: mockConfig.success,
  data: response,
  error: mockConfig.error || null,
  tool_session_state: sessionState
};
```

### 4.12 Test Modes Extended

Aggiungere modalità `full_cycle_with_review` per human-in-the-loop.

```sql
-- Estendere check constraint su test_runs.mode
ALTER TABLE test_runs DROP CONSTRAINT IF EXISTS test_runs_mode_check;
ALTER TABLE test_runs ADD CONSTRAINT test_runs_mode_check
  CHECK (mode IN ('single', 'full_cycle', 'full_cycle_with_review'));

-- Aggiungere colonne per review state
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS awaiting_review BOOLEAN DEFAULT false;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;
```

**Comportamento modalità**:

| Mode | Comportamento |
|------|---------------|
| `single` | Test → Evaluate → STOP |
| `full_cycle` | Test → Evaluate → Analyze → Optimize → Loop (auto) |
| `full_cycle_with_review` | Test → Evaluate → **PAUSE per review** → Analyze → Optimize → Loop |

**Flow full_cycle_with_review**:
```
1. Test Runner completa
2. Evaluator completa
3. test_runs.awaiting_review = true, status = 'awaiting_review'
4. Dashboard notifica user
5. User aggiunge battle_notes (opzionale)
6. User clicca "Continue Analysis"
7. awaiting_review = false, review_completed_at = NOW()
8. Trigger Analyzer
9. ... continua ciclo
```

### 4.13 API Endpoints

Lista completa degli endpoint necessari:

```typescript
// Settings
GET    /api/settings                    // List workflow_configs
PUT    /api/settings/:workflow_type     // Update webhook URL/config
POST   /api/settings/:workflow_type/test // Ping webhook

// Test Runs
POST   /api/test-runs                   // Create & trigger test run
GET    /api/test-runs                   // List test runs
GET    /api/test-runs/:id               // Get test run with battle_results
POST   /api/test-runs/:id/continue      // Continue after review pause
POST   /api/test-runs/:id/stop          // Stop full_cycle

// Personas
GET    /api/personas                    // List personas
POST   /api/personas                    // Create persona
PUT    /api/personas/:id                // Update persona
DELETE /api/personas/:id                // Delete persona
POST   /api/personas/:id/feedback       // Add feedback note
POST   /api/personas/generate           // Trigger personas generator

// Prompt Personas (junction) - v2.4: no override_config
GET    /api/prompt-personas/:prompt_name          // Get personas for prompt
POST   /api/prompt-personas                        // Associate persona to prompt
DELETE /api/prompt-personas/:persona_id/:prompt_name  // Remove association

// Battle Notes
GET    /api/battle-notes/:battle_result_id        // Get notes for battle
POST   /api/battle-notes                          // Add note
DELETE /api/battle-notes/:id                      // Delete note

// Tool Mock Scenarios - v2.4: RIMOSSO (scenari hardcoded in lib/tool-scenarios.ts)
// Usa import { TOOL_SCENARIOS } from '@/lib/tool-scenarios' nel frontend

// n8n Webhooks (receive callbacks)
POST   /api/n8n/webhook                           // Generic callback handler

// Error Handling - v2.4: Simplified (no auto-recovery)
GET    /api/test-runs/:id/errors                  // Get workflow errors
```

### 4.14 API Contracts (AUDIT FIX: Frontend richiede schemas)

**Request/Response schemas per gli endpoint principali:**

```typescript
// ============================================
// TEST RUNS
// ============================================

// POST /api/test-runs - Create & trigger test
interface CreateTestRunRequest {
  prompt_version_id: string;  // UUID, required
  mode: 'single' | 'full_cycle_with_review';  // v2.4: rimosso 'full_cycle'
  tool_scenario_id?: string;  // String ID (e.g., 'happy_path'), optional
  tool_mocks_override?: Record<string, ToolMockConfig>;  // Optional inline override
  max_iterations?: number;  // Default: 1 for single, 5 for full_cycle_with_review
}

interface CreateTestRunResponse {
  test_run_id: string;  // UUID
  test_run_code: string;  // e.g., "RUN-20260119-143052"
  status: 'pending';
  webhook_triggered: boolean;
  estimated_duration_seconds?: number;  // Based on personas count
  personas_count: number;
}

// GET /api/test-runs/:id
interface GetTestRunResponse {
  id: string;
  test_run_code: string;
  prompt_version_id: string;
  mode: 'single' | 'full_cycle_with_review';  // v2.4: rimosso 'full_cycle'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted' | 'awaiting_review';  // v2.4: aggiunto 'aborted'
  current_iteration: number;
  max_iterations: number;
  overall_score?: number;
  success_count: number;
  failure_count: number;
  timeout_count: number;
  // v2.4: cycle_state RIMOSSO (recovery manuale per MVP)
  last_heartbeat_at: string;  // ISO 8601
  started_at: string;
  completed_at?: string;
  stopped_reason?: 'max_iterations_reached' | 'human_stop' | 'target_score_reached' | 'error';  // v2.4: esplicitato
  battle_results: BattleResultSummary[];
}

interface BattleResultSummary {
  id: string;
  persona_id: string;
  persona_name: string;
  outcome: 'success' | 'partial' | 'failure' | 'timeout' | 'tool_error';
  score?: number;
  turns: number;
}

// ============================================
// N8N CALLBACK CONTRACT
// ============================================

// POST /api/n8n/webhook - Callback from n8n workflows
interface N8nCallbackPayload {
  workflow_type: 'test_runner' | 'evaluator' | 'analyzer' | 'optimizer' | 'personas_generator' | 'personas_validator';
  test_run_id: string;  // UUID
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress?: {
    current: number;  // e.g., 3
    total: number;    // e.g., 12
    current_persona?: string;
    current_turn?: number;
  };
  error?: {
    code: 'WEBHOOK_FAILED' | 'PERSONA_ERROR' | 'AI_ERROR' | 'TIMEOUT' | 'VALIDATION_ERROR' | 'UNKNOWN';
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  result?: {
    // Varies by workflow_type
    battles_completed?: number;
    average_score?: number;
    [key: string]: unknown;
  };
  timestamp: number;  // Unix timestamp for replay protection
  nonce: string;      // UUID for replay protection
}

// ============================================
// PERSONAS
// ============================================

// POST /api/personas/:id/feedback
interface AddPersonaFeedbackRequest {
  note: string;
  from_battle_result_id?: string;  // UUID, optional context
  category?: 'behavior' | 'difficulty' | 'realism' | 'other';
}

interface AddPersonaFeedbackResponse {
  success: boolean;
  feedback_count: number;
  validation_status: string;  // May change to 'needs_human_review'
}

// ============================================
// BATTLE NOTES
// ============================================

// POST /api/battle-notes
interface CreateBattleNoteRequest {
  battle_result_id: string;  // UUID, required
  note: string;
  category: 'issue' | 'suggestion' | 'positive' | 'question';
}

interface CreateBattleNoteResponse {
  id: string;  // UUID
  created_at: string;
}

// ============================================
// ERROR RESPONSES (standardized)
// ============================================

interface ApiErrorResponse {
  error: string;  // Human readable message
  code: string;   // Machine readable code
  details?: Record<string, unknown>;
  retry_after?: number;  // Seconds, for rate limiting
}

// Error codes
type ErrorCode =
  | 'INVALID_UUID'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'WEBHOOK_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NO_PERSONAS'
  | 'PERSONAS_NOT_VALIDATED'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';
```

### 4.15 Transcript JSONB Schema (AUDIT FIX)

Struttura documentata per `battle_results.transcript`:

```typescript
interface BattleTranscript {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;  // ISO 8601
    tool_calls?: Array<{
      tool_name: string;
      parameters: Record<string, unknown>;
      result: unknown;
      success: boolean;
    }>;
  }>;
  metadata: {
    total_turns: number;
    duration_seconds: number;
    completed: boolean;
    timeout: boolean;
    tool_calls_count: number;
  };
}
```

---

## 5. Features Breakdown

### Feature 1: Settings Page
**Priority**: P0

Pagina per configurare webhook URLs dei vari workflow.

**UI Components**:
- Lista workflow configurati
- Edit inline per webhook URL
- Toggle is_active
- Test button (ping webhook)
- Istruzioni per setup n8n

**Location**: `app/settings/page.tsx`

**Acceptance Criteria**:
- [ ] CRUD workflow_configs
- [ ] Test ping webhook
- [ ] Mostra last_triggered_at
- [ ] Istruzioni chiare per ogni workflow type

---

### Feature 2: prompt_personas + n8n Filter
**Priority**: P0

Creare junction table e modificare workflow n8n per filtrare personas.

**Tasks**:
1. Applicare migration prompt_personas
2. UI per associare personas a prompts
3. Modificare n8n query: SELECT con JOIN su prompt_personas
4. Testare filtro funzionante

**Acceptance Criteria**:
- [ ] Persona associata a prompt A non appare in test prompt B
- [ ] Override config applicato correttamente
- [ ] n8n usa nuova query

---

### Feature 3: Dashboard → n8n Integration (Real Data)
**Priority**: P1

Collegare UI esistenti a dati reali e webhook.

**Tasks**:
1. `PromptVersionsHub`: fetch da `prompt_versions`
2. `PersonaWorkshop`: fetch/save su `personas` + `prompt_personas`
3. `Test Launcher`: trigger webhook con prompt_version_id
4. API routes aggiornate per nuovo schema

**Acceptance Criteria**:
- [ ] Zero mock data nelle UI
- [ ] Click "Run Test" → n8n riceve webhook
- [ ] Risultati visibili in dashboard dopo test

---

### Feature 4: Polling/Callbacks per Status
**Priority**: P2

Dashboard mostra stato test run in tempo reale.

**Opzioni**:
1. **Polling** (raccomandato inizialmente): GET ogni 5 sec su test_runs.status
2. **Supabase Realtime**: subscription su test_runs
3. **Callback from n8n**: POST a /api/n8n/webhook con status updates

**Decisione**: Iniziare con polling, aggiungere callbacks se necessario.

**Acceptance Criteria**:
- [ ] Status visibile: pending → running → completed/failed
- [ ] Progress indicator durante esecuzione
- [ ] Auto-refresh risultati quando completed

---

### Feature 5: Personas Generator Workflow
**Priority**: P2

Workflow n8n per generare personas automaticamente.

**Webhook Input**:
```json
{
  "prompt_version_id": "uuid",
  "prompt_name": "qual-audit-sa",
  "count": 5,
  "criteria": {
    "difficulty_mix": { "easy": 0.3, "medium": 0.4, "hard": 0.2, "extreme": 0.1 },
    "categories": ["decision_maker", "skeptical", "busy"]
  }
}
```

**Workflow Steps**:
1. Get prompt content
2. AI generate personas based on context
3. Insert into personas table
4. Insert into prompt_personas with associations

**Acceptance Criteria**:
- [ ] Generate N personas
- [ ] Automatic association to prompt
- [ ] Dashboard refresh after generation

---

### Feature 6: Optimizer Workflow (Meta Super Optimization)
**Priority**: P3 (Future)

AI analizza test results e suggerisce miglioramenti al prompt.

**Flow**:
1. Raccoglie failure_patterns da test_runs recenti
2. Analizza prompt content
3. Genera suggested changes
4. Crea draft prompt_version con optimization_notes
5. Dashboard mostra diff per human review

**Acceptance Criteria**:
- [ ] Suggerimenti specifici e actionable
- [ ] Draft salvato ma non attivo
- [ ] UI per approve/reject/modify

---

## 6. Implementation Plan (v2.3 Lean)

> ⚠️ **v2.3 LEAN**: Piano semplificato. Enterprise features (Upstash, timing-safe HMAC, auto-loop) spostate in `ROADMAP-enterprise-features.md`.

### Phase 1: Foundation + Simple Security
**Priority**: P0 | **Blockers**: None

**Migrations**:
1. [ ] Migration: `workflow_configs` table + seed data
2. [ ] Migration: `prompt_personas` table + partial unique indexes
3. [ ] Migration: `battle_notes` table
4. [ ] Migration: `personas` additions (validation_status, feedback_notes)
5. [ ] Migration: `test_runs` additions (mode, max_iterations, status='aborted', llm_config, estimated_cost_usd)
6. [ ] Migration: `battle_results` additions (tool_session_state, outcome with 'tool_error')

**Code**:
7. [ ] Create `lib/tool-scenarios.ts` (hardcoded scenarios)
8. [ ] Create `lib/llm-config.ts` (LLM presets)
9. [ ] Create `lib/cost-estimation.ts` (cost calculator)
10. [ ] Create `lib/simple-rate-limit.ts` (in-memory)
11. [ ] Settings page UI (`app/settings/page.tsx`)
12. [ ] API: `/api/settings` CRUD con Zod validation
13. [ ] API: `/api/n8n/webhook` con simple secret validation

**Test**:
14. [ ] Test: settings configurabili e persistenti

### Phase 2: Personas Association
**Priority**: P0 | **Blockers**: Phase 1

1. [ ] UI per associare personas a prompt_name (in PersonaWorkshop)
2. [ ] API: `/api/prompt-personas` CRUD
3. [ ] n8n: query con JOIN prompt_personas + validation_status='validated'
4. [ ] Seed data: associazioni iniziali per prompts esistenti
5. [ ] Test: persona associata a prompt A non appare in test prompt B

### Phase 3: Tool Mocking (Hardcoded)
**Priority**: P1 | **Blockers**: Phase 1

> v2.3: Scenari hardcoded, NO database table.

1. [ ] UI dropdown tool scenarios in Test Launcher (from `lib/tool-scenarios.ts`)
2. [ ] n8n: Code Node per selezionare scenario da string ID
3. [ ] n8n: Mock Tool Router code node
4. [ ] n8n: Configurare AI Agent tools per usare mock router
5. [ ] Test: scenari happy_path, calendar_full, booking_fails

### Phase 4: Real Data Integration + Kill Switch
**Priority**: P1 | **Blockers**: Phase 2, 3

1. [ ] PromptVersionsHub → fetch da `prompt_versions`
2. [ ] PersonaWorkshop → fetch/save su `personas` + `prompt_personas`
3. [ ] Test Launcher → trigger webhook con LLM selection + cost estimate
4. [ ] API: `/api/test-runs` create & trigger (con debounce frontend)
5. [ ] **API: `/api/test-runs/:id/abort`** (Kill Switch)
6. [ ] n8n: Update webhook input schema
7. [ ] n8n: Add simple x-n8n-secret header validation
8. [ ] **n8n: Add "Check Abort" nodes** (vedi Sezione 9)
9. [ ] Test e2e: dashboard → n8n → callback → risultati visibili
10. [ ] **Test: Kill switch ferma test in corso**

### Phase 5: Monitoring & Human Notes
**Priority**: P1 | **Blockers**: Phase 4

1. [ ] Polling status test_runs (ogni 5 sec)
2. [ ] UI stato: pending → running → completed/failed/aborted/awaiting_review
3. [ ] **Cost estimate display** prima di run (vedi Sezione 10)
4. [ ] Results viewer con battle_results
5. [ ] Conversations Explorer redesign
6. [ ] UI per aggiungere battle_notes
7. [ ] API: `/api/battle-notes` CRUD
8. [ ] Error handling robusto

### Phase 6: Personas Generator & Validation
**Priority**: P2 | **Blockers**: Phase 5

1. [ ] n8n: Personas Generator workflow
2. [ ] n8n: Personas Validator workflow
3. [ ] UI trigger generation in PersonaWorkshop
4. [ ] UI validation status badge su personas
5. [ ] UI personas feedback form
6. [ ] API: `/api/personas/generate` trigger
7. [ ] API: `/api/personas/:id/feedback` add feedback

### Phase 7: Assisted Optimization (Human Review REQUIRED)
**Priority**: P3 | **Blockers**: Phase 6

> v2.3: Solo `full_cycle_with_review`. NO loop automatico.

1. [ ] n8n: Analyzer workflow (legge battle_notes)
2. [ ] n8n: Optimizer workflow (suggerisce, NON applica automaticamente)
3. [ ] UI: full_cycle_with_review flow (OBBLIGATORIO human approval)
4. [ ] UI: prompt diff viewer per human review
5. [ ] API: `/api/test-runs/:id/approve-changes` (human approves AI suggestions)
6. [ ] API: `/api/test-runs/:id/reject-changes` (human rejects, can edit manually)
7. [ ] API: `/api/test-runs/:id/continue` continue cycle after review
8. [ ] Test: full cycle con human approval a ogni iterazione

### Phase 8: Polish
**Priority**: P2 | **Blockers**: Phase 7

> v2.3: Rimosso Upstash, timing-safe, nonce storage (vedi `ROADMAP-enterprise-features.md`).

1. [ ] Error boundaries in UI
2. [ ] Loading/Error/Empty states everywhere
3. [ ] Accessibility basics (keyboard nav, focus states)
4. [ ] Mobile responsive check
5. [ ] Performance optimization (bundle size, lazy loading)
6. [ ] Cleanup job per draft orphans (optional)

---

## 7. Environment Variables

```env
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://dlozxirsmrbriuklgcxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...  # For server-side operations

# n8n (from workflow_configs table, but fallback env)
N8N_TEST_RUNNER_WEBHOOK=https://primary-production-1d87.up.railway.app/webhook/5877058c-19fd-4f26-add4-66b3526c4a96
N8N_SECRET=...  # Optional: for webhook auth

# App
NEXT_PUBLIC_APP_URL=...  # For callbacks
```

---

## 8. Security (v2.3 Lean - Simplified)

> ⚠️ **v2.3 LEAN**: Security semplificata per single-user MVP.
> Per versione enterprise (timing-safe HMAC, Upstash, nonce storage), vedi `ROADMAP-enterprise-features.md`.

### 8.1 Webhook Authentication (SIMPLE)

**Problema**: L'endpoint `/api/n8n/webhook` riceve callbacks da n8n.

**Soluzione v2.3**: Simple secret token comparison (sufficiente per tool interno).

**n8n side** (HTTP Request node):
```javascript
// Headers da aggiungere in n8n
{
  "x-n8n-secret": "{{ $env.N8N_SECRET }}"
}
```

**Dashboard side** (`/api/n8n/webhook/route.ts`):
```typescript
export async function POST(request: Request) {
  const secret = request.headers.get('x-n8n-secret');

  if (!process.env.N8N_SECRET) {
    console.warn('N8N_SECRET not configured - skipping validation');
  } else if (secret !== process.env.N8N_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process webhook...
  const body = await request.json();
  // ...
}
```

### 8.2 Rate Limiting (IN-MEMORY - v2.3 Lean)

> Per single-user: in-memory Map + frontend debounce è sufficiente.

**Frontend**: Debounce sul bottone "Run Test" (300ms)
```typescript
// components/test-launcher.tsx
import { useDebouncedCallback } from 'use-debounce';

const handleRunTest = useDebouncedCallback(async () => {
  await triggerTest(config);
}, 300);
```

**Backend**: Simple in-memory rate limit (opzionale)
```typescript
// lib/simple-rate-limit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Usage in API route
export async function POST(request: Request) {
  if (!checkRateLimit('trigger-test', 10, 60000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ... continue
}
```

### 8.3 Input Validation

Tutti gli endpoint devono validare:
- UUID format per `prompt_version_id`, `test_run_id`, etc.
- Enum values per `mode`, `outcome`, `status`
- JSONB structure per `tool_mocks_override`

### 8.4 Environment Variables Security

```env
# REQUIRED: Server-side only, NEVER expose to client
SUPABASE_SERVICE_KEY=...

# REQUIRED: For webhook authentication
N8N_SECRET=...

# Optional: Rate limiting
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**Runtime validation** (`lib/supabase-admin.ts`):
```typescript
// Prevent accidental client-side usage
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL: supabase-admin.ts imported in browser!');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required for admin operations');
}

// Create admin client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
```

---

## 9. Kill Switch (v2.3 NEW - Critical)

> ⚠️ **CRITICAL GAP FIX**: Identificato nell'audit - necessario per fermare test in loop o impallati.

### 9.1 Emergency Stop Button

**UI**: Bottone rosso visibile quando test è in `status='running'`

```typescript
// components/test-run-status.tsx
function TestRunStatus({ testRunId, status }: Props) {
  const [isAborting, setIsAborting] = useState(false);

  const handleAbort = async () => {
    if (!confirm('Sei sicuro di voler fermare questo test?')) return;

    setIsAborting(true);
    await fetch(`/api/test-runs/${testRunId}/abort`, { method: 'POST' });
    // Status will update via polling
  };

  return (
    <div>
      <StatusBadge status={status} />
      {status === 'running' && (
        <Button
          variant="destructive"
          onClick={handleAbort}
          disabled={isAborting}
        >
          {isAborting ? 'Stopping...' : 'STOP TEST'}
        </Button>
      )}
    </div>
  );
}
```

### 9.2 API Endpoint

**`POST /api/test-runs/:id/abort`**:
```typescript
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Update status to 'aborted'
  const { error } = await supabase
    .from('test_runs')
    .update({
      status: 'aborted',
      stopped_reason: 'human_stop',
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'running'); // Only abort running tests

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, message: 'Test aborted' });
}
```

### 9.3 n8n Check (MANUAL - Required in n8n)

Ogni workflow n8n deve controllare lo status PRIMA di ogni step:

```javascript
// n8n Code Node: Check Abort
const testRunId = $json.test_run_id;
const result = await $db.query(`
  SELECT status FROM test_runs WHERE id = $1
`, [testRunId]);

if (result.rows[0]?.status === 'aborted') {
  // Stop workflow gracefully
  return { abort: true, message: 'Test was aborted by user' };
}

return { abort: false };
```

**Posizionamento in n8n (v2.4 OPTIMIZED - solo 2 check)**:

> ⚠️ **v2.4**: Ridotto da 4+ a 2 check points per semplicità.
> Check 1: All'inizio del loop (prima di ogni iterazione)
> Check 2: Dopo la chiamata LLM (operazione più lunga, ~30s)

```
[Start] → [Loop Personas]
               ↓
     [Check Abort] → [Execute Battle (LLM call)] → [Check Abort] → [Save] → [Continue]
```

**Rationale**: Un check a inizio loop + uno dopo LLM call copre il 95% dei casi.
Chiamate LLM sono l'operazione più lunga (~30s), quindi il check post-LLM è critico.

---

## 10. LLM Configuration & Cost Estimation (v2.4 Simplified)

> **v2.4**: LLM selection mantenuto, cost estimation UI **DEFERRED** a Phase 8.
> Per MVP: selezione LLM funziona, costi calcolati a posteriori analizzando usage.

### 10.1 LLM Configuration

**Database**: Aggiungere a `workflow_configs` o creare `llm_configs`

```typescript
// lib/llm-config.ts
export interface LLMConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  costPer1kInputTokens: number;   // in USD
  costPer1kOutputTokens: number;  // in USD
  avgTokensPerTurn: number;       // stima media
}

export const LLM_PRESETS: Record<string, LLMConfig> = {
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    avgTokensPerTurn: 500
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    model: 'gpt-5-mini',
    costPer1kInputTokens: 0.0003,
    costPer1kOutputTokens: 0.0012,
    avgTokensPerTurn: 500
  },
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    avgTokensPerTurn: 600
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    model: 'gemini-2.5-pro',
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    avgTokensPerTurn: 550
  }
};

export const DEFAULT_BATTLE_LLM = 'gpt-4.1-mini';
export const DEFAULT_EVALUATOR_LLM = 'claude-sonnet-4';
```

### 10.2 Test Configuration UI

**Test Launcher Settings**:
```typescript
interface TestConfig {
  promptVersionId: string;
  mode: 'single' | 'full_cycle_with_review';
  maxIterations: number;
  toolScenario: ToolScenarioId;

  // LLM Selection (v2.3)
  battleAgentLlm: string;     // e.g., 'gpt-4.1-mini'
  personaLlm: string;         // e.g., 'gpt-4.1-mini'
  evaluatorLlm: string;       // e.g., 'claude-sonnet-4'
  analyzerLlm?: string;       // e.g., 'claude-sonnet-4' (full_cycle only)
}
```

### 10.3 Cost Estimation Formula

```typescript
// lib/cost-estimation.ts
import { LLM_PRESETS, LLMConfig } from './llm-config';

interface CostEstimate {
  totalUsd: number;
  breakdown: {
    battles: number;
    evaluations: number;
    analysis?: number;
    optimization?: number;
  };
  assumptions: string[];
}

export function estimateTestCost(config: {
  personaCount: number;
  avgTurnsPerBattle: number;  // default 8
  iterations: number;         // for full_cycle
  mode: 'single' | 'full_cycle_with_review';
  battleLlm: string;
  evaluatorLlm: string;
  analyzerLlm?: string;
}): CostEstimate {
  const battleConfig = LLM_PRESETS[config.battleLlm];
  const evalConfig = LLM_PRESETS[config.evaluatorLlm];
  const analyzerConfig = config.analyzerLlm ? LLM_PRESETS[config.analyzerLlm] : evalConfig;

  // Stima tokens per battle (agent + persona)
  // 2 messaggi per turn (user + assistant) x avgTokensPerTurn
  const tokensPerBattle = config.avgTurnsPerBattle * 2 * battleConfig.avgTokensPerTurn;

  // Costo battles
  const battleCostPerPersona = (tokensPerBattle / 1000) *
    (battleConfig.costPer1kInputTokens + battleConfig.costPer1kOutputTokens) / 2;
  const battlesCost = config.personaCount * battleCostPerPersona * config.iterations;

  // Costo evaluations (1 per battle)
  const tokensPerEval = 2000; // prompt + transcript + response
  const evalCostPerBattle = (tokensPerEval / 1000) *
    (evalConfig.costPer1kInputTokens + evalConfig.costPer1kOutputTokens) / 2;
  const evalCost = config.personaCount * evalCostPerBattle * config.iterations;

  // Costo analysis/optimization (solo full_cycle)
  let analysisCost = 0;
  if (config.mode === 'full_cycle_with_review') {
    const tokensPerAnalysis = 4000; // tutti i risultati + suggerimenti
    analysisCost = config.iterations *
      (tokensPerAnalysis / 1000) *
      (analyzerConfig.costPer1kInputTokens + analyzerConfig.costPer1kOutputTokens) / 2;
  }

  const total = battlesCost + evalCost + analysisCost;

  return {
    totalUsd: Math.round(total * 100) / 100, // 2 decimali
    breakdown: {
      battles: Math.round(battlesCost * 100) / 100,
      evaluations: Math.round(evalCost * 100) / 100,
      analysis: analysisCost > 0 ? Math.round(analysisCost * 100) / 100 : undefined
    },
    assumptions: [
      `${config.avgTurnsPerBattle} turns/battle`,
      `${battleConfig.avgTokensPerTurn} tokens/turn (battle)`,
      `${config.personaCount} personas x ${config.iterations} iteration(s)`
    ]
  };
}
```

### 10.4 UI Cost Warning (DEFERRED to Phase 8)

> **v2.4**: Cost estimation UI deferred. Per MVP, focus su LLM selection.
> La formula in 10.3 può essere usata per calcoli manuali o implementata in Phase 8.

**Per MVP**: Solo LLM selection dropdowns, senza real-time cost display.

```typescript
// Test Launcher - MVP version (no cost estimate)
function TestLauncherForm() {
  return (
    <form>
      {/* LLM Selection */}
      <Select value={battleLlm} onValueChange={setBattleLlm}>
        <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini (Recommended)</SelectItem>
        <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
      </Select>

      <Select value={evaluatorLlm} onValueChange={setEvaluatorLlm}>
        <SelectItem value="claude-sonnet-4">Claude Sonnet 4 (Recommended)</SelectItem>
        <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
      </Select>

      <Button type="submit">Run Test</Button>
    </form>
  );
}
```

### 10.5 LLM Config Storage

Salvare configurazione LLM usata in `test_runs`:

```sql
ALTER TABLE test_runs ADD COLUMN llm_config JSONB;
-- llm_config: { battleLlm: 'gpt-4.1-mini', evaluatorLlm: 'claude-sonnet-4', ... }
```

> **Phase 8**: Aggiungere `estimated_cost_usd` e real-time cost UI.

---

## 11. Success Metrics

- [ ] Lanciare test run in < 3 click
- [ ] Test run tracciabile start-to-finish in dashboard
- [ ] Zero intervento manuale in n8n per test standard
- [ ] Personas filtrate correttamente per prompt
- [ ] Settings configurabili senza deploy
- [ ] **Kill switch funzionante** (v2.3)
- [ ] ~~Cost estimate visibile prima di run~~ → **DEFERRED to Phase 8** (v2.4)
- [ ] Full cycle with review funzionante
- [ ] **LLM selection funzionante** (v2.4)

---

## 11a. n8n Implementation Notes (v2.4 NEW)

> ⚠️ **CRITICAL**: Questa sezione documenta l'effort nascosto per implementare n8n callbacks.

### 11a.1 Callback Implementation Effort

**Per OGNI workflow n8n**, devi aggiungere manualmente:

| Task | Tempo stimato | Note |
|------|---------------|------|
| HTTP Request node per callback | 10 min | A fine workflow |
| Header `x-n8n-secret` | 5 min | Per autenticazione |
| Payload N8nCallbackPayload | 10 min | Struttura corretta |
| Error handling con callback | 15 min | Per notificare fallimenti |
| **TOTALE per workflow** | **~40 min** | |

### 11a.2 HTTP Request Node Template

**Aggiungi questo alla fine di OGNI workflow n8n**:

```
Node Type: HTTP Request
Method: POST
URL: {{ $env.DASHBOARD_CALLBACK_URL }}/api/n8n/webhook

Headers:
- Content-Type: application/json
- x-n8n-secret: {{ $env.N8N_SECRET }}

Body (JSON):
{
  "workflow_type": "test_runner",  // Cambia per workflow
  "test_run_id": "{{ $json.test_run_id }}",
  "status": "completed",
  "result": {
    "battles_completed": {{ $json.battles.length }},
    "overall_score": {{ $json.average_score }}
  }
}
```

### 11a.3 Progress Callbacks (Optional but Recommended)

Per test lunghi, aggiungi callback progress dentro il Loop:

```
// Dopo ogni iterazione del loop
{
  "workflow_type": "test_runner",
  "test_run_id": "{{ $json.test_run_id }}",
  "status": "progress",
  "progress": {
    "current": {{ $itemIndex + 1 }},
    "total": {{ $items.length }},
    "current_persona": "{{ $json.persona_name }}"
  }
}
```

### 11a.4 Environment Variables Required in n8n

```
DASHBOARD_CALLBACK_URL=https://your-dashboard.vercel.app
N8N_SECRET=your-secret-from-env-local
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

---

## 11b. Open Questions (Resolved)

| Question | Answer |
|----------|--------|
| URL n8n? | Railway: primary-production-1d87.up.railway.app |
| Schema da usare? | prompt_versions (deprecare prompts gradualmente) |
| Personas relation? | Many-to-many via prompt_personas con override |
| Callbacks? | Iniziare con polling, poi valutare |
| Multi-workflow? | Si, settings page per configurare tutti |

---

## 10. UI Component Specifications (AUDIT FIX)

> Questa sezione documenta le specifiche UI mancanti identificate dall'audit frontend.

### 10.1 Settings Page (`app/settings/page.tsx`)

**Component Tree**:
```
SettingsPage
├── PageHeader
│   ├── Title: "Workflow Settings"
│   └── Description: "Configure n8n webhook URLs and workflow behavior"
├── WorkflowConfigList
│   └── WorkflowConfigCard (per ogni workflow_type)
│       ├── Header: workflow_type badge + is_active toggle
│       ├── WebhookUrlInput (with validation)
│       ├── ConfigEditor (JSON for advanced config)
│       ├── TestPingButton → shows success/error toast
│       └── LastTriggeredInfo
└── SetupWizard (se nessun workflow configurato)
    ├── Step 1: n8n connection test
    ├── Step 2: Configure test_runner webhook
    └── Step 3: Optional: Configure other workflows
```

**Form Validation** (Zod schema):
```typescript
const webhookConfigSchema = z.object({
  webhook_url: z.string().url('Must be a valid URL').startsWith('https://'),
  is_active: z.boolean(),
  config: z.record(z.unknown()).optional(),
});
```

**Test Ping Feedback**:
- Success: Green toast "Webhook responded successfully (200ms)"
- Error: Red toast "Webhook failed: Connection timeout"
- Loading: Spinner on button, disabled state

### 10.2 Test Launcher Additions (`app/test-launcher/page.tsx`)

**New Form Fields** (da aggiungere):
```tsx
<FormField name="mode">
  <Select>
    <SelectItem value="single">Single Test (no optimization)</SelectItem>
    <SelectItem value="full_cycle">Full Cycle (automatic optimization)</SelectItem>
    <SelectItem value="full_cycle_with_review">Full Cycle with Review</SelectItem>
  </Select>
</FormField>

<FormField name="tool_scenario_id">
  <Select placeholder="Select tool scenario...">
    {/* Query da tool_mock_scenarios */}
    <SelectItem value="happy_path">Happy Path - All tools work</SelectItem>
    <SelectItem value="calendar_full">Calendar Full - No slots</SelectItem>
    {/* ... altri scenari */}
  </Select>
</FormField>

{mode !== 'single' && (
  <FormField name="max_iterations">
    <Input type="number" min={1} max={10} defaultValue={3} />
    <FormDescription>Maximum optimization iterations</FormDescription>
  </FormField>
)}
```

### 10.3 Test Run Status Monitor

**Component**: `TestRunStatusMonitor` (nuovo component)

**Placement**: Modal o sidebar che appare dopo click "Start Test"

**States**:
```tsx
// Pending
<div className="flex items-center gap-2">
  <Spinner />
  <span>Waiting for n8n webhook response...</span>
</div>

// Running
<div className="space-y-2">
  <Progress value={(current / total) * 100} />
  <p>Testing persona {current}/{total}</p>
  <p className="text-sm text-muted-foreground">
    Turn {currentTurn} • Current score: {currentScore?.toFixed(1)}
  </p>
</div>

// Completed
<div className="space-y-2">
  <CheckCircle className="text-green-500" />
  <p>Test completed!</p>
  <div className="flex gap-2">
    <Badge>{successCount} passed</Badge>
    <Badge variant="destructive">{failureCount} failed</Badge>
  </div>
  <Button onClick={() => navigate(`/test-runs/${id}`)}>View Results</Button>
</div>

// Failed
<div className="space-y-2">
  <XCircle className="text-red-500" />
  <p>Test failed: {error.message}</p>
  {error.retryable && <Button onClick={onRetry}>Retry</Button>}
</div>
```

**Polling Hook**:
```typescript
// hooks/use-test-run-status.ts
export function useTestRunStatus(testRunId: string | null) {
  return useQuery({
    queryKey: ['test-run', testRunId],
    queryFn: () => fetchTestRun(testRunId!),
    enabled: !!testRunId,
    refetchInterval: (data) =>
      data?.status === 'running' || data?.status === 'pending'
        ? 5000  // Poll every 5 sec while running
        : false, // Stop polling when completed/failed
  });
}
```

### 10.4 Battle Notes UI

**Component**: `BattleNotesPanel` (aggiungere a conversation detail view)

```tsx
<BattleNotesPanel battleResultId={battleResultId}>
  {/* Lista note esistenti */}
  <BattleNotesList notes={notes} />

  {/* Form aggiunta nota */}
  <BattleNoteForm onSubmit={handleAddNote}>
    <Textarea placeholder="Add a note about this conversation..." />
    <Select name="category">
      <SelectItem value="issue">🐛 Issue</SelectItem>
      <SelectItem value="suggestion">💡 Suggestion</SelectItem>
      <SelectItem value="positive">✅ Positive</SelectItem>
      <SelectItem value="question">❓ Question</SelectItem>
    </Select>
    <Button type="submit">Add Note</Button>
  </BattleNoteForm>
</BattleNotesPanel>
```

### 10.5 Personas Feedback UI

**Aggiungere a PersonaWorkshop**:
```tsx
<PersonaFeedbackForm personaId={persona.id}>
  <Textarea placeholder="Feedback on this persona's behavior..." />
  <Select name="category">
    <SelectItem value="behavior">Behavior issue</SelectItem>
    <SelectItem value="difficulty">Difficulty calibration</SelectItem>
    <SelectItem value="realism">Realism concern</SelectItem>
    <SelectItem value="other">Other</SelectItem>
  </Select>
  <Button type="submit">Submit Feedback</Button>

  {/* Indicatore che feedback potrebbe trigger re-validation */}
  <p className="text-xs text-muted-foreground">
    ⚠️ Adding feedback may trigger persona re-validation
  </p>
</PersonaFeedbackForm>
```

### 10.6 Prompt Diff Viewer

**Component**: `PromptDiffViewer` (per full_cycle_with_review)

**Libreria consigliata**: `react-diff-viewer-continued`

```tsx
import ReactDiffViewer from 'react-diff-viewer-continued';

<PromptDiffViewer
  oldVersion={originalPrompt}
  newVersion={optimizedPrompt}
  splitView={true}
  useDarkTheme={isDarkMode}
  showDiffOnly={false}
/>

<div className="flex justify-end gap-2 mt-4">
  <Button variant="outline" onClick={onReject}>Reject Changes</Button>
  <Button variant="outline" onClick={onEdit}>Edit Before Approve</Button>
  <Button onClick={onApprove}>Approve & Continue</Button>
</div>
```

### 10.7 Loading/Error/Empty States Pattern

**Standard pattern per tutti i componenti**:
```tsx
function DataComponent({ data, isLoading, error }) {
  // Loading
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  // Error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading data</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <Button variant="outline" onClick={onRetry}>Retry</Button>
      </Alert>
    );
  }

  // Empty
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon />}
        title="No data yet"
        description="Start by creating your first item"
        action={<Button>Create</Button>}
      />
    );
  }

  // Data
  return <DataList data={data} />;
}
```

### 10.8 Validation Status Badges (v2.4 Simplified)

**Solo 2 stati da supportare in PersonaWorkshop**:
```tsx
// v2.4: Ridotto da 5 a 2 stati
const validationStatusBadges = {
  pending: <Badge variant="secondary">Pending Validation</Badge>,
  validated: <Badge variant="success">✓ Validated</Badge>,
};

// Test Run Status Badges (include 'aborted')
const testRunStatusBadges = {
  pending: <Badge variant="secondary">Pending</Badge>,
  running: <Badge variant="outline"><Spinner size="sm" /> Running...</Badge>,
  completed: <Badge variant="success">✓ Completed</Badge>,
  failed: <Badge variant="destructive">✗ Failed</Badge>,
  aborted: <Badge variant="warning">⚠️ Aborted</Badge>,  // v2.4 NEW
  awaiting_review: <Badge variant="outline">👁 Awaiting Review</Badge>,
};
```

---

## 11. Accessibility & Responsive Design (AUDIT FIX)

### 11.1 WCAG 2.1 AA Compliance Targets

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 1.1.1 Non-text Content | Alt text for images | ✅ Use `alt` prop on all `<Image>` |
| 1.4.3 Contrast | Min 4.5:1 for text | ✅ shadcn/ui handles this |
| 1.4.11 Non-text Contrast | Min 3:1 for UI | ✅ Check badge/button contrast |
| 2.1.1 Keyboard | All functionality via keyboard | ⚠️ Verify all interactive elements |
| 2.4.7 Focus Visible | Visible focus indicator | ✅ Tailwind ring-* classes |
| 4.1.2 Name/Role/Value | ARIA labels | ⚠️ Add to custom components |

### 11.2 Keyboard Navigation Map

| Action | Key | Component |
|--------|-----|-----------|
| Navigate tabs | Arrow keys | Tabs component |
| Select option | Enter | Select, RadioGroup |
| Close modal | Escape | Dialog, Sheet |
| Submit form | Enter | All forms |
| Next field | Tab | All forms |
| Previous field | Shift+Tab | All forms |

### 11.3 Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Tablet landscape / small desktop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large desktop */
```

**Component behavior**:
| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Settings cards | Stack vertical | 2 columns | 3 columns |
| Test Launcher form | Full width | 2 columns | 2 columns |
| Conversation list | Full width | Side panel | Side panel |
| Battle results | Cards stack | Table | Table |

### 11.4 Touch Targets

- Minimum touch target: **44x44px** (iOS) / **48x48px** (Material)
- Button padding: `px-4 py-2` minimum
- Icon buttons: use `size="lg"` variant

---

## 12. MANUAL FIXES REQUIRED (v2.3 Lean)

> ⚠️ **v2.3 LEAN**: Lista semplificata. Enterprise setup (Upstash, timing-safe) in `ROADMAP-enterprise-features.md`.

### 12.1 CRITICAL - Da fare PRIMA di iniziare implementazione

| # | Task | File/Location | Note |
|---|------|---------------|------|
| 1 | **Generare N8N_SECRET** | `.env.local` | `openssl rand -hex 32` |
| 2 | **Installare debounce** | `package.json` | `pnpm add use-debounce` |
| 3 | **Configurare N8N_SECRET in n8n** | n8n Environment | Stesso valore di `.env.local` |

### 12.2 HIGH - Da fare durante Phase corrispondente

| # | Task | Phase | Note |
|---|------|-------|------|
| 4 | Creare `lib/tool-scenarios.ts` | 1 | Scenari hardcoded (vedi Sezione 4.5) |
| 5 | Creare `lib/llm-config.ts` | 1 | LLM presets (vedi Sezione 10.1) |
| 6 | Creare `lib/cost-estimation.ts` | 1 | Cost calculator (vedi Sezione 10.3) |
| 7 | Creare `lib/simple-rate-limit.ts` | 1 | In-memory rate limit (vedi Sezione 8.2) |
| 8 | n8n: "Check Abort" nodes | 4 | Vedi Sezione 9.3 per implementazione |

### 12.3 MEDIUM - Miglioramenti consigliati

| # | Task | Note |
|---|------|------|
| 9 | Installare `react-diff-viewer-continued` | Per prompt diff viewer in Phase 7 |
| 10 | Configurare React Query DevTools | Per debugging data fetching |
| 11 | Aggiungere Error Boundary wrapper | Per catch errori React |

### 12.4 n8n Workflow Updates Required

I seguenti aggiornamenti devono essere fatti **manualmente in n8n UI**:

**Test Runner Workflow**:
1. [ ] Aggiungere HTTP Request header per autenticazione callback:
   ```javascript
   {
     "x-n8n-secret": "{{ $env.N8N_SECRET }}"
   }
   ```
2. [ ] Aggiornare query personas per filtrare `validation_status = 'validated'`
3. [ ] **Aggiungere "Check Abort" nodes** prima/dopo ogni step (vedi Sezione 9.3)
4. [ ] Accettare `tool_scenario_id` come stringa e fare switch nel Code Node

**Evaluator Workflow**:
1. [ ] Assicurarsi che riceva e filtri per `test_run_id`
2. [ ] Aggiungere header `x-n8n-secret` ai callback

**Tutti i Workflow**:
1. [ ] Aggiungere header `x-n8n-secret` a TUTTI i callback HTTP

### 12.5 Database Migrations to Create

File migrations da creare in `supabase/migrations/`:

```
002_workflow_configs.sql
003_prompt_personas.sql
004_battle_notes.sql
005_personas_additions.sql       (NO tool_mock_scenarios - hardcoded)
006_test_runs_additions.sql      (include llm_config, estimated_cost_usd)
007_battle_results_additions.sql
```

> **NOTA**: Gli SQL sono documentati nelle sezioni 4.x. `tool_mock_scenarios` NON serve (hardcoded).

### 12.6 Testing Checklist (MANUAL)

Prima di considerare ogni Phase completa:

**Phase 1 Security Tests**:
- [ ] Test: request senza x-n8n-secret → 401
- [ ] Test: request con secret errato → 401
- [ ] Test: debounce funziona su bottone "Run Test"

**Phase 2 Personas Tests**:
- [ ] Test: persona validated appare in test
- [ ] Test: persona pending NON appare in test
- [ ] Test: persona associata a prompt A non in test prompt B

**Phase 4 Kill Switch Tests**:
- [ ] Test: click "STOP" → status='aborted'
- [ ] Test: n8n legge status='aborted' e si ferma
- [ ] Test: dashboard mostra stato "Aborted"

**Phase 4 E2E Tests**:
- [ ] Test: dashboard → API → n8n webhook → callback → status update → results visible

**Phase 5 LLM Selection Tests** (v2.4: Cost UI deferred):
- [ ] Test: LLM selection dropdown funziona
- [ ] Test: LLM config salvato in test_runs.llm_config

---

## Changelog

- **v1.0 Draft** (2026-01-18): Prima stesura
- **v2.0** (2026-01-19):
  - Aggiunto Full Cycle architecture
  - Settings page per webhook configs
  - prompt_personas con override support
  - Aggiornato implementation plan
  - Risolte open questions
- **v2.1** (2026-01-19) - Architectural Audit Fixes:
  - **FIX CRITICO**: Race condition Evaluator - ora filtra per test_run_id
  - **FIX CRITICO**: Aggiunta sezione Security con webhook authentication (HMAC)
  - **FIX CRITICO**: Rimosso diagramma corrotto (righe duplicate)
  - Schema: Aggiunti campi personas (validation_status, feedback_notes, validation_prompt_id)
  - Schema: Aggiunto trigger validazione prompt_name su prompt_personas
  - Schema: Aggiunto tool_session_state per sequenze tool calls
  - Schema: Aggiunta modalità full_cycle_with_review con review state
  - Schema: Aggiunto cycle_state per recovery workflow failures
  - Implementation Plan: Riorganizzato in 8 fasi con dipendenze esplicite
  - Implementation Plan: Aggiunta Phase 3 Tool Mocking Setup
  - Implementation Plan: Aggiunta Phase 8 Security & Polish
  - API: Lista completa 20+ endpoint documentati
  - Human-in-the-Loop: Completato flow personas feedback
  - n8n Doc: Allineato webhook payload con nuovi campi
- **v2.2** (2026-01-19) - Complete Multi-Audit Fixes (Architect + Backend + Frontend):
  - **SECURITY**: Timing-safe HMAC comparison per prevenire timing attacks
  - **SECURITY**: Replay attack protection con timestamp + nonce validation
  - **SECURITY**: Rate limiting spostato a Phase 1b (era Phase 8)
  - **SECURITY**: Runtime validation per SUPABASE_SERVICE_KEY browser check
  - **SCHEMA**: CHECK constraint su test_runs.current_iteration e stopped_reason
  - **SCHEMA**: FK ON DELETE policies per tool_scenario_id e validation_prompt_id
  - **SCHEMA**: Partial unique indexes su prompt_personas (rimosso magic UUID)
  - **SCHEMA**: JSONB validation constraints su tutte le tabelle
  - **SCHEMA**: last_heartbeat_at per stale run detection
  - **SCHEMA**: feedback_updated_at + trigger per re-validation automatica
  - **SCHEMA**: outcome esteso con 'tool_error' per battle_results
  - **QUERY**: Personas filter aggiornato con validation_status='validated'
  - **QUERY**: Ottimizzata con UNION invece di OR per performance
  - **QUERY**: Aggiunto LIMIT/OFFSET per pagination
  - **API**: Aggiunta sezione 4.14 API Contracts con TypeScript interfaces
  - **API**: Callback contract N8nCallbackPayload completamente documentato
  - **API**: Error response format standardizzato
  - **API**: Endpoint retry/resume/errors per error handling
  - **API**: Transcript JSONB schema documentato (sezione 4.15)
  - **CONFIG**: retry_policy schema aggiunto a workflow_configs
  - **CONFIG**: iteration_delay_seconds per rate limiting full cycle
  - **CONFIG**: Tool mocks precedence logic documentata
  - **UI**: Aggiunta sezione 10 UI Component Specifications
  - **UI**: Settings Page component tree + form validation
  - **UI**: Test Launcher mode selection + tool scenario dropdown
  - **UI**: Test Run Status Monitor con polling hook
  - **UI**: Battle Notes UI panel
  - **UI**: Personas Feedback form
  - **UI**: Prompt Diff Viewer specification
  - **UI**: Loading/Error/Empty states pattern
  - **UI**: Validation status badges per tutti gli stati
  - **A11Y**: Aggiunta sezione 11 Accessibility & Responsive Design
  - **A11Y**: WCAG 2.1 AA compliance checklist
  - **A11Y**: Keyboard navigation map
  - **A11Y**: Responsive breakpoints + touch targets
  - **IMPL**: Phase 1b Core Security (nuova) prima di Phase 4
  - **IMPL**: Stale run detection in Phase 5
  - **IMPL**: Cleanup job draft orphans in Phase 8
  - **MANUAL**: Aggiunta sezione 12 MANUAL FIXES REQUIRED
  - **MANUAL**: Checklist dipendenze da installare
  - **MANUAL**: n8n workflow updates required
  - **MANUAL**: Database migrations list
  - **MANUAL**: Testing checklist per Phase
- **v2.3 Lean** (2026-01-19) - Semplificazione MVP Single-User:
  - **REMOVED**: Upstash rate limiting → in-memory Map + frontend debounce
  - **REMOVED**: Timing-safe HMAC → simple string comparison
  - **REMOVED**: Nonce replay protection → deferred to enterprise
  - **REMOVED**: tool_mock_scenarios DB table → hardcoded in `lib/tool-scenarios.ts`
  - **REMOVED**: Autonomous optimization loop → human review OBBLIGATORIO
  - **REMOVED**: Phase 1b (merged into Phase 1)
  - **ADDED**: Sezione 9 Kill Switch (Emergency Stop)
  - **ADDED**: Sezione 10 Cost Estimation con LLM configurabili
  - **ADDED**: LLM presets (GPT-4.1 mini, GPT-5 mini, Sonnet 4, Gemini 2.5 Pro)
  - **ADDED**: `lib/llm-config.ts`, `lib/cost-estimation.ts`, `lib/simple-rate-limit.ts`
  - **ADDED**: API `/api/test-runs/:id/abort` per Kill Switch
  - **ADDED**: n8n "Check Abort" nodes specification
  - **ADDED**: Test config con LLM selection (battleLlm, personaLlm, evaluatorLlm)
  - **ADDED**: Cost estimate UI warning prima di "Run Test"
  - **ADDED**: `ROADMAP-enterprise-features.md` per features enterprise deferrite
  - **SCHEMA**: Aggiunti `llm_config JSONB`, `estimated_cost_usd DECIMAL` a test_runs
  - **IMPL**: Piano semplificato da 8 fasi (senza Phase 1b)
  - **IMPL**: Phase 7 rinominata "Assisted Optimization" (human review required)
  - **MANUAL**: Lista semplificata (solo 3 task CRITICAL invece di 4)
  - **SAVINGS**: ~40% tempo sviluppo stimato
- **v2.4 Lean** (2026-01-19) - Ultra-semplificazione post-audit:
  - **FIX CRITICO**: Rimosso FK `tool_scenario_id` → VARCHAR con CHECK constraint
  - **FIX CRITICO**: Rimosso `full_cycle` mode → solo `single` | `full_cycle_with_review`
  - **FIX CRITICO**: Rimosso `/api/tool-scenarios` endpoints (scenari hardcoded)
  - **FIX CRITICO**: Aggiunto stato `aborted` a UI badges
  - **SCHEMA**: Semplificato `prompt_personas` (rimosso `override_config`)
  - **SCHEMA**: Ridotto `validation_status` da 5 a 2 stati ('pending', 'validated')
  - **SCHEMA**: Rimosso `cycle_state` JSONB (recovery manuale per MVP)
  - **SCHEMA**: Rimosso trigger `update_feedback_timestamp` (overkill)
  - **API**: Rimosso endpoint `/api/test-runs/:id/retry` (no auto-recovery)
  - **UI**: LLM selection mantenuto, Cost estimation UI deferred a Phase 8
  - **UI**: Semplificato validation status badges (solo 2 stati)
  - **N8N**: Ottimizzato Check Abort da 4+ a 2 punti
  - **DOCS**: Aggiunta sezione 11a n8n Implementation Notes (~40min/workflow)
  - **SAVINGS**: Ulteriore ~15% semplificazione rispetto a v2.3
