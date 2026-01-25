# Agentic Testing Refactor v2.0

**Data:** 2026-01-24
**Status:** APPROVED
**Source:** Party Mode Brainstorming Session (Extended)
**Version:** 2.1 - Con Analyzer, Optimizer, UX decisions

---

## Executive Summary

Refactor completo della pagina `/agentic` da "demo UI con dati fake" a "Agent Health Monitor" con dati reali. Include integrazione LLM per analisi intelligente e workflow di ottimizzazione.

**Cambiamenti principali:**
- BattleArena → `/test-launcher`
- PersonaGenerator → `/personas`
- Analyzer = Evaluator esteso (non workflow separato)
- Optimizer = Nuovo workflow N8N (trigger manuale)
- UI con grafiche comprensibili e feedback guidato

---

## Architettura Decisioni

### 1. Separazione Concerns

| Pagina | Scopo | Focus |
|--------|-------|-------|
| `/test-launcher` | Esecuzione test | DO - Lanciare e monitorare test |
| `/agentic` | Analisi & Ottimizzazione | THINK - Analizzare e migliorare |
| `/personas` | Gestione personas | MANAGE - Creare e gestire personas |

### 2. Analyzer = Evaluator Esteso

**Decisione:** NON creare workflow separato. Estendere Evaluator con 3 nodi dopo il loop.

```
EVALUATOR WORKFLOW (esteso)
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  [Trigger] → [Get Battles] → [Loop: Evaluate Each]            │
│                                      │                         │
│                                      ▼                         │
│                               ┌─────────────┐                  │
│                               │   Done?     │                  │
│                               └──────┬──────┘                  │
│                                      │                         │
│                    ┌─────────────────┴─────────────────┐      │
│                    ▼                                   ▼      │
│              [Next Battle]                    [NUOVO: PG Aggregate]
│                                                       │       │
│                                                       ▼       │
│                                               [NUOVO: LLM Analyze]
│                                                       │       │
│                                                       ▼       │
│                                               [NUOVO: Save Report]
│                                                       │       │
│                                                       ▼       │
│                                               [Callback: Done] │
└────────────────────────────────────────────────────────────────┘
```

**Vantaggi:**
- Un solo workflow da mantenere
- Dati già in memoria (no re-fetch)
- Analisi sempre pronta quando user apre dashboard

### 3. LLM Analysis Output Format

```json
{
  "executive_summary": "L'agente gestisce bene utenti razionali ma fatica con quelli emotivamente carichi. Pattern principale: risposta difensiva alla frustrazione.",

  "insights": [
    {
      "title": "Risposta Difensiva alla Frustrazione",
      "description": "Quando l'utente esprime frustrazione, l'agente ripete le policy invece di riconoscere l'emozione.",
      "evidence": [
        "Battle #3, turn 4: User: 'Sono stufo!' → Agent: 'Come da policy...'",
        "Battle #7, turn 6: simile pattern"
      ],
      "impact": "high",
      "affected_personas": ["Angry Karen", "Frustrated Manager"],
      "recommendation": "Aggiungi istruzione: 'PRIMA riconosci emozione, POI spiega policy.'"
    }
  ],

  "persona_breakdown": {
    "struggling": [
      {"name": "Angry Karen", "avg_score": 4.2, "root_cause": "Mancanza empatia iniziale"}
    ],
    "excelling": [
      {"name": "Tech Expert", "avg_score": 9.1, "why": "Risposte tecnicamente accurate"}
    ]
  },

  "strengths": ["Technical accuracy", "Polite tone"],

  "prompt_suggestions": [
    {
      "id": "ps-1",
      "action": "ADD",
      "text": "Quando l'utente esprime emozione negativa, riconosci l'emozione prima di procedere.",
      "priority": "high"
    },
    {
      "id": "ps-2",
      "action": "MODIFY",
      "text": "Mantieni risposte sotto 100 parole per domande semplici.",
      "priority": "medium"
    }
  ]
}
```

### 4. Optimizer Workflow

**Trigger:** Manuale da UI (POST /api/n8n/trigger)

**Input:**
```json
{
  "workflow_type": "optimizer",
  "test_run_id": "uuid",
  "selected_suggestions": ["ps-1", "ps-2"],
  "human_feedback": "Inoltre, vorrei tono più informale..."
}
```

**Flow:**
```
[Get test_run + analysis_report]
    → [Get current prompt_version]
    → [LLM: Applica suggestions + feedback]
    → [Create DRAFT prompt_version]
    → [Callback: optimization_ready]
```

**Output:**
- Nuovo record in `prompt_versions` con:
  - `status: 'draft'`
  - `created_from: current_version_id`
  - `prompt_text: nuovo prompt ottimizzato`
  - `optimization_notes: JSON con changes`

### 5. Draft Approval Flow

> **IMPORTANTE:** I prompt generati dall'optimizer NON vengono applicati automaticamente.
> Ogni nuovo prompt richiede **ragionamento umano in chat** per ottimizzazione
> prima di essere approvato. L'optimizer genera una BOZZA da rifinire.

```
Optimizer genera draft
       │
       ▼
┌─────────────────────────────────────┐
│ UI mostra diff v2.3 vs v2.4 (draft) │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 💬 CHAT OPTIMIZATION (opzionale)    │
│ ─────────────────────────────────── │
│ User può discutere con AI:          │
│ "Questo passaggio non mi convince,  │
│  puoi riformularlo così...?"        │
│                                     │
│ AI risponde, itera, raffina         │
│ Draft viene aggiornato live         │
└────────────────┬────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
[Scarta]    [Modifica]    [Approva]
    │         inline          │
    ▼            │            ▼
 DELETE          │         status:
 draft           │         'active'
                 │            │
                 └────────────┘
                       │
                       ▼
                 [Lancia Test]
                 con nuova versione
```

**Flow dettagliato:**
1. Optimizer genera draft con suggestions applicate
2. User vede diff side-by-side
3. User può aprire chat per discutere/raffinare specifiche parti
4. Ogni modifica da chat aggiorna il draft in tempo reale
5. Solo quando soddisfatto, user approva
6. Draft diventa versione attiva, pronta per test

---

## Database Schema Changes

```sql
-- Aggiunta a test_runs per analysis report
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS
  analysis_report JSONB DEFAULT NULL;

ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS
  analyzed_at TIMESTAMPTZ DEFAULT NULL;
```

---

## UI/UX Decisions

### Visual Style

- **Grafiche:** Via di mezzo - comprensibili, bella impressione, non elaborate
- **Hover effects:** No - non overcomplicare
- **Colori:** Redesign con correlazione semantica (da definire in implementazione)

### Color Semantic (proposta)

| Semantic | Uso | Colore |
|----------|-----|--------|
| `success` | Score alto, outcome success | `emerald-500` |
| `warning` | Score medio, partial | `amber-500` |
| `danger` | Score basso, failure | `rose-500` |
| `info` | Neutral info | `sky-500` |
| `primary` | Actions, CTA | `violet-600` |

### Wireframe con Grafiche

```
┌──────────────────────────────────────────────────────────────────┐
│  🤖 Agent: [Sales Agent ▼]                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐    ┌─────────────────────────────┐       │
│   │                  │    │  TREND                      │       │
│   │      7.2         │    │  ┌─────────────────────┐    │       │
│   │    ━━━━━━━━      │    │  │    ╱╲                │    │       │
│   │   goal: 8.0      │    │  │   ╱  ╲    ╱╲        │    │       │
│   │                  │    │  │  ╱    ╲  ╱  ╲       │    │       │
│   │   ▼ 0.6 vs prev  │    │  │ ╱      ╲╱    ╲      │    │       │
│   └──────────────────┘    │  └─────────────────────┘    │       │
│                           │   6.1  6.8  7.2  6.9  7.2   │       │
│                           └─────────────────────────────┘       │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐       │
│   │  OUTCOMES                                           │       │
│   │  ██████████████████░░░░░░░░░  Success: 65%         │       │
│   │  █████░░░░░░░░░░░░░░░░░░░░░░  Partial: 20%         │       │
│   │  ███░░░░░░░░░░░░░░░░░░░░░░░░  Failure: 15%         │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                  │
│   ⚠️ "Agent struggles with emotionally charged users"            │
│                                                                  │
│   [See Details]                      [🚀 Optimize]               │
└──────────────────────────────────────────────────────────────────┘
```

### Expanded Details con Grafiche

```
┌──────────────────────────────────────────────────────────────────┐
│  📉 TOP ISSUES              │  👥 PERSONAS PERFORMANCE          │
│  ─────────────              │  ─────────────────────────────    │
│  1. Edge case handling      │  😠 Angry Karen    ████░░░░░░ 4.2 │
│  2. Risposte troppo lunghe  │  😕 Confused Bob   █████░░░░░ 5.1 │
│  3. Tool usage lento        │  😐 Average Joe    ███████░░░ 7.0 │
│                             │  🤓 Tech Expert    █████████░ 9.1 │
├─────────────────────────────┴───────────────────────────────────┤
│  💬 GUIDA L'OTTIMIZZAZIONE                                      │
│                                                                  │
│  L'AI ha suggerito:                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ☑️ Aggiungi empatia prima di policy                [high]  │ │
│  │ ☑️ Riduci verbosità su domande semplici           [medium] │ │
│  │ ☐ Migliora handling timeout                        [low]   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Aggiungi le tue note (opzionale):                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [View Full Report]                    [🚀 Genera Nuova Versione]│
└──────────────────────────────────────────────────────────────────┘
```

### Feedback Guidato

L'utente può:
1. Vedere suggerimenti AI con checkbox
2. Selezionare/deselezionare quali applicare
3. Aggiungere note personali
4. Lanciare ottimizzazione

---

## API Contracts

### GET /api/prompts/names (NUOVO)

```typescript
// Response
{ names: string[] }
```

### GET /api/test-runs (esistente, filtro aggiunto)

```typescript
// Request
GET /api/test-runs?prompt_name=Sales%20Agent&limit=5&order=desc

// Response
{ data: TestRun[], pagination: {...} }
```

### POST /api/n8n/trigger (NUOVO)

```typescript
// Request
{
  workflow_type: "optimizer",
  test_run_id: string,
  selected_suggestions: string[],
  human_feedback: string | null
}

// Response
{
  success: boolean,
  execution_id: string,
  message: "Optimization started"
}
```

### Webhook Callback (optimizer done)

```typescript
{
  workflow_type: "optimizer",
  status: "completed",
  result: {
    new_version_id: string,
    changes_summary: string
  }
}
```

---

## N8N Nodo PG: Aggregazione

```sql
SELECT
  json_build_object(
    'test_run_id', $1,
    'overall_stats', (
      SELECT json_build_object(
        'total', COUNT(*),
        'success', COUNT(*) FILTER (WHERE outcome = 'success'),
        'partial', COUNT(*) FILTER (WHERE outcome = 'partial'),
        'failure', COUNT(*) FILTER (WHERE outcome = 'failure'),
        'avg_score', ROUND(AVG(score)::numeric, 2)
      )
      FROM battle_results WHERE test_run_id = $1
    ),
    'failures_detail', (
      SELECT json_agg(json_build_object(
        'persona', p.name,
        'category', p.category,
        'score', br.score,
        'transcript_snippet', LEFT(br.transcript::text, 500)
      ))
      FROM battle_results br
      JOIN personas p ON br.persona_id = p.id
      WHERE br.test_run_id = $1 AND br.outcome IN ('failure', 'partial')
      LIMIT 5
    ),
    'human_notes', (
      SELECT json_agg(bn.note)
      FROM battle_notes bn
      JOIN battle_results br ON bn.battle_result_id = br.id
      WHERE br.test_run_id = $1
    )
  ) as analysis_context
```

---

## Implementazione Checklist

### Fase 1: Cleanup (30 min)

- [ ] Backup current `/agentic/page.tsx`
- [ ] Delete optimization-loop.tsx (mock)

### Fase 2: Database (15 min)

- [ ] Add `analysis_report` JSONB column to test_runs
- [ ] Add `analyzed_at` TIMESTAMPTZ column to test_runs

### Fase 3: API (1h)

- [ ] Create GET /api/prompts/names
- [ ] Add prompt_name filter to GET /api/test-runs
- [ ] Create POST /api/n8n/trigger

### Fase 4: Componenti (3h)

- [ ] Create AgentSelector
- [ ] Create HealthMonitor (with sparkline, outcome bars)
- [ ] Create AgentDetails (collapsible, personas bars)
- [ ] Create OptimizationPanel (checkbox suggestions + textarea)
- [ ] Create N8NStatusBar

### Fase 5: Page (1h)

- [ ] Rewrite /agentic/page.tsx with new components
- [ ] Wire up to real APIs

### Fase 6: Move Components (1h)

- [ ] Move BattleArena to test-launcher
- [ ] Move PersonaGenerator to /personas

### Fase 7: N8N (2h)

- [ ] Extend Evaluator with 3 nodes (aggregate, LLM, save)
- [ ] Create Optimizer workflow

### Fase 8: Testing (1h)

- [ ] Manual E2E test full flow

---

## Files

### DELETE
- `components/agentic/optimization-loop.tsx`

### MOVE
- `battle-arena.tsx` → test-launcher
- `persona-generator.tsx` → /personas

### CREATE
- `components/agentic/agent-selector.tsx`
- `components/agentic/health-monitor.tsx`
- `components/agentic/agent-details.tsx`
- `components/agentic/optimization-panel.tsx`
- `components/agentic/n8n-status-bar.tsx`
- `app/api/prompts/names/route.ts`
- `app/api/n8n/trigger/route.ts`

### REWRITE
- `app/agentic/page.tsx`

---

## Success Criteria

1. **No fake data**: Tutti i numeri vengono da DB
2. **Agent-centric**: Selezione agent come filtro primario
3. **Actionable**: Clear path da "vedi problema" a "ottimizza"
4. **AI-powered**: Analisi intelligente, non solo conteggi
5. **Guided**: Feedback con checkbox, non pagina bianca
6. **Visual**: Grafiche comprensibili, colori semantici

---

## Future: Personas Workflow

> **STATUS:** Da discutere in sessione separata

**Gap identificati:**

1. Journey: Nuovo prompt → Match personas esistenti → Validare → Gap analysis → Generate mancanti → Validate → Report coverage

2. Requisiti:
   - Da /prompts vedere quante personas associate
   - Button "Generate Personas" se mancano
   - Match automatico prima di generare
   - Validazione con regole stringenti
   - Modifica manuale possibile
   - Report coverage (cosa coprono, cosa no)

3. Workflow attuale Franz:
   - Prompt → Claude CSV → Google Sheets → Test → Iterate
   - Vuole: tutto in dashboard con controllo

4. Complessità:
   - Ciclo ottimizzazione prompt
   - Ciclo creazione personas
   - Ciclo match personas esistenti
   - Meno sezioni possibili
   - Link logici tra sezioni

**Richiede design session dedicata.**

---

## Notes

- Spec derivata da Party Mode brainstorming (extended)
- Approvata da Franz (product owner)
- Include decisioni UX Expert
- Personas workflow rimandato a sessione futura
