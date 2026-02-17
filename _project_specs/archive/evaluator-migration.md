# PRD: Evaluator Workflow Migration to NEW Schema

**Status**: Ready for Implementation
**Effort**: ~1-2 hours
**Workflow ID**: `202JEX5zm3VlrUT8`

---

## Executive Summary

Migrare il workflow "Battles Evaluator" dal vecchio schema (`conversations`, `turns`) al nuovo schema (`test_runs`, `battle_results`). Solo **4 nodi** da modificare.

---

## Schema Reference

### NEW Schema (TARGET)

```
test_runs
├── id (uuid PK)
├── test_run_code (varchar)
├── status (varchar): pending → running → battles_completed → evaluating → completed/failed
├── analysis_report (jsonb) ← LLM genera questo
├── analyzed_at (timestamptz)
├── overall_score, success_count, failure_count
└── ...

battle_results
├── id (uuid PK)
├── test_run_id (uuid FK → test_runs)
├── persona_id (uuid FK → personas)
├── outcome (varchar): success/partial/failure/timeout/tool_error
├── score (numeric 0-10)
├── turns (int)
├── transcript (jsonb) ← GIÀ PRESENTE! Array di {role, content}
├── evaluation_details (jsonb) ← Salvare criteria qui
└── tool_session_state (jsonb)

battle_notes
├── battle_result_id (uuid FK)
├── note (text)
└── category: issue/suggestion/positive/question
```

### OLD Schema (DEPRECATO - non usare)
- `old_conversations` (era `conversations`)
- `old_turns` (era `turns`)
- `old_evaluationcriteria` (era `evaluationcriteria`)

---

## Nodi da Modificare

### 1. Edit Fields ❌→✅

**Problema**: test_run_id hardcoded
**Posizione**: Dopo Start Evaluation (manual trigger)

**PRIMA**:
```json
{
  "test_run_id": "e088affd-82d7-45bf-931b-f88a51afa272"  // HARDCODED!
}
```

**DOPO**:
```json
{
  "test_run_id": ""  // Empty = process ALL pending
}
```

**Oppure**: Rimuovere Edit Fields e passare vuoto di default.

---

### 2. Get Pending Evaluations ❌→✅

**Problema**: Query OLD schema (`conversations`)
**Posizione**: Dopo Edit Fields

**PRIMA** (OLD schema - NON FUNZIONA):
```sql
SELECT c.conversationid, c.testrunid, c.personaid, c.outcome, c.totalturns,
       p.category as persona_category, p.description as persona_description
FROM conversations c
LEFT JOIN personas p ON c.personaid = p.personaid
WHERE c.evaluationscore IS NULL
AND c.outcome IN ('Success', 'Timeout', 'Error')
```

**DOPO** (NEW schema):
```sql
-- Trova test_runs pronti per evaluation
-- Se test_run_id fornito: solo quello
-- Se vuoto: tutti quelli con status = 'battles_completed'

SELECT
  tr.id as test_run_id,
  tr.test_run_code,
  tr.status,
  tr.prompt_version_id,
  pv.prompt_name,
  pv.version as prompt_version,
  COUNT(br.id) as battle_count,
  ROUND(AVG(br.score)::numeric, 2) as current_avg_score
FROM test_runs tr
JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
LEFT JOIN battle_results br ON br.test_run_id = tr.id
WHERE tr.status = 'battles_completed'
  AND (
    '{{ $json.test_run_id || "" }}' = ''
    OR tr.id::text = '{{ $json.test_run_id }}'
  )
GROUP BY tr.id, tr.test_run_code, tr.status, tr.prompt_version_id, pv.prompt_name, pv.version
ORDER BY tr.started_at DESC
LIMIT 50
```

---

### 3. Load Full Transcript ❌→✅

**Problema**: Query OLD schema (`turns`)
**Posizione**: Dopo Process Each Conversation (output 1 - item)

**PRIMA** (OLD schema - NON FUNZIONA):
```sql
SELECT turnnumber, speaker, utterance, intermediatesteps_json
FROM turns
WHERE conversationid = {{ $json.conversationid }}
ORDER BY turnnumber ASC
```

**DOPO** (NEW schema) - Rinominare in "Get Battle Details":
```sql
-- Il transcript è già in battle_results.transcript (JSONB)
-- Carica tutti i battle_results per questo test_run

SELECT
  br.id as battle_result_id,
  br.test_run_id,
  br.persona_id,
  p.name as persona_name,
  p.category as persona_category,
  p.description as persona_description,
  p.difficulty,
  br.outcome,
  br.score,
  br.turns,
  br.transcript,  -- JSONB array: [{role: "user"|"assistant", content: "..."}]
  br.evaluation_details,
  br.tool_session_state
FROM battle_results br
JOIN personas p ON br.persona_id = p.id
WHERE br.test_run_id = '{{ $json.test_run_id }}'::uuid
ORDER BY br.created_at ASC
```

---

### 4. Save Main Evaluation ❌→✅

**Problema**: Probabilmente salva in OLD schema
**Posizione**: Dopo Parse Evaluation

**PRIMA** (verifica - potrebbe essere OK o salvare in `conversations`):
```sql
-- Verificare cosa fa attualmente
```

**DOPO** (NEW schema) - Rinominare in "Update Battle Result":
```sql
-- Salva evaluation_details nel battle_result specifico

UPDATE battle_results
SET
  evaluation_details = $1::jsonb,
  score = $2::numeric
WHERE id = $3::uuid
RETURNING id, score, evaluation_details
```

**Parameters**:
- `$1` = `{{ JSON.stringify($json.evaluation_details) }}` - Criteria scores JSONB
- `$2` = `{{ $json.overall_score }}` - Score numerico 0-10
- `$3` = `{{ $json.battle_result_id }}` - UUID del battle_result

---

### 5. Insert Criteria Scores ❌→🗑️

**Azione**: ELIMINARE o DISABILITARE

**Motivo**: Non serve più tabella separata. I criteria sono salvati in `battle_results.evaluation_details` come JSONB:

```json
{
  "criteria": [
    {"name": "Goal Achievement", "score": 8, "notes": "..."},
    {"name": "Communication Quality", "score": 7, "notes": "..."},
    {"name": "Objection Handling", "score": 9, "notes": "..."}
  ],
  "summary": "Overall good performance...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."]
}
```

---

### 6. PG Aggregate ✅ (già OK)

Questo nodo è già corretto - query `battle_results` e `battle_notes`.

---

### 7. Save Report ✅ (già OK)

Questo nodo è già corretto:
```sql
UPDATE test_runs
SET status = 'completed',
    analysis_report = $1::jsonb,
    analyzed_at = $2,
    completed_at = NOW()
WHERE id = $3::uuid
```

---

### 8. Log error ✅ (già OK)

Questo nodo è già corretto:
```sql
UPDATE test_runs
SET status = 'failed',
    completed_at = NOW(),
    analysis_report = $1::jsonb,
    analyzed_at = NOW(),
    stopped_reason = 'evaluator_error'
WHERE id = $2::uuid
```

---

## Flusso Target

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRIGGER LAYER                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [External Trigger]              [Manual Trigger]                          │
│  (da Test Runner)                (da n8n UI)                               │
│        │                              │                                     │
│        ▼                              ▼                                     │
│  Extract Test Run Info          Edit Fields (vuoto)                        │
│        │                              │                                     │
│        ▼                              │                                     │
│  Set Status Evaluating ◄──────────────┘                                    │
│        │                                                                    │
│        ▼                                                                    │
│  Get Pending Evaluations (NEW query)                                       │
│        │                                                                    │
│        ▼                                                                    │
│  Process Each Test Run (splitInBatches)                                    │
│        │                                                                    │
└────────┼────────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────────────┐
         │ [Output 1: Each Item]                        │ [Output 0: Batch Done]
         ▼                                              ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────────┐
│ ITEM EVALUATION LAYER           │     │ AGGREGATE LAYER                     │
├─────────────────────────────────┤     ├─────────────────────────────────────┤
│                                 │     │                                     │
│  Get Battle Details (NEW)       │     │  PG Aggregate (già OK)              │
│        │                        │     │        │                            │
│        ▼                        │     │        ▼                            │
│  Analyze Conversation           │     │  LLM Analyzer                       │
│        │                        │     │        │                            │
│        ▼                        │     │        ▼                            │
│  Judge Agent (LLM)              │     │  Code Parser                        │
│        │                        │     │        │                            │
│        ▼                        │     │        ▼                            │
│  Parse Evaluation               │     │  If (valid?)                        │
│        │                        │     │     │      │                        │
│        ▼                        │     │     ▼      ▼                        │
│  Update Battle Result (NEW)     │     │  Save    Log error                  │
│        │                        │     │  Report  (già OK)                   │
│        │                        │     │  (già OK)                           │
│        ▼                        │     │                                     │
│  [Loop back to Process]         │     │                                     │
│                                 │     │                                     │
└─────────────────────────────────┘     └─────────────────────────────────────┘
```

---

## Checklist Implementazione

### Fase 1: Fix Query (30 min)

- [ ] **Edit Fields**: Rimuovere test_run_id hardcoded
- [ ] **Get Pending Evaluations**: Sostituire query con NEW schema
- [ ] **Load Full Transcript** → **Get Battle Details**: Sostituire query
- [ ] **Save Main Evaluation** → **Update Battle Result**: Verificare/fix query

### Fase 2: Cleanup (15 min)

- [ ] **Insert Criteria Scores**: Disabilitare o eliminare
- [ ] Verificare connessioni tra nodi
- [ ] Rinominare nodi per chiarezza

### Fase 3: Test (30 min)

- [ ] Test Manual Trigger con 1 test_run
- [ ] Verificare status transitions: `battles_completed` → `evaluating` → `completed`
- [ ] Verificare `battle_results.evaluation_details` popolato
- [ ] Verificare `test_runs.analysis_report` popolato
- [ ] Test External Trigger (simulare callback da Test Runner)

### Fase 4: Validation Queries

```sql
-- Verifica status transitions
SELECT id, test_run_code, status, analyzed_at,
       analysis_report IS NOT NULL as has_report
FROM test_runs
WHERE status IN ('evaluating', 'completed', 'failed')
ORDER BY started_at DESC
LIMIT 10;

-- Verifica evaluation_details popolati
SELECT br.id, p.name, br.outcome, br.score,
       br.evaluation_details IS NOT NULL as has_eval
FROM battle_results br
JOIN personas p ON br.persona_id = p.id
WHERE br.test_run_id = '<test_run_id>'
ORDER BY br.created_at;

-- Test runs pronti per evaluation
SELECT id, test_run_code, status,
       (SELECT COUNT(*) FROM battle_results WHERE test_run_id = test_runs.id) as battles
FROM test_runs
WHERE status = 'battles_completed';
```

---

## Note Architetturali

### Perché evaluation_details in JSONB?

1. **Flessibilità**: Criteria possono variare per prompt/test
2. **Performance**: No JOIN su tabella separata
3. **Atomicità**: Evaluation completa in un record
4. **Evoluzione**: Facile aggiungere campi senza migration

### Struttura evaluation_details suggerita

```json
{
  "evaluator_version": "1.0",
  "evaluated_at": "2026-01-29T15:30:00Z",
  "overall_score": 7.5,
  "criteria": [
    {
      "name": "Goal Achievement",
      "score": 8,
      "weight": 0.3,
      "notes": "Successfully booked appointment"
    },
    {
      "name": "Communication Quality",
      "score": 7,
      "weight": 0.25,
      "notes": "Clear but slightly verbose"
    },
    {
      "name": "Objection Handling",
      "score": 8,
      "weight": 0.25,
      "notes": "Handled price objection well"
    },
    {
      "name": "Efficiency",
      "score": 7,
      "weight": 0.2,
      "notes": "Took 12 turns, could be faster"
    }
  ],
  "summary": "Good overall performance with room for improvement in efficiency",
  "strengths": ["Clear communication", "Good objection handling"],
  "weaknesses": ["Verbose responses", "Slow to close"],
  "recommendations": ["Shorten responses", "Be more direct about next steps"]
}
```

---

## Acceptance Criteria

1. ✅ Manual trigger processa test_runs con status='battles_completed'
2. ✅ External trigger processa singolo test_run passato via webhook
3. ✅ Status transitions corrette: battles_completed → evaluating → completed/failed
4. ✅ battle_results.evaluation_details popolato per ogni battle
5. ✅ test_runs.analysis_report popolato con report aggregato
6. ✅ Nessun uso di OLD schema (conversations, turns, evaluationcriteria)
