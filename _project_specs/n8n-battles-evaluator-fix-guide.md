# Battles Evaluator - Fix Guide

> **QA Report** | Data: 2026-01-25 | Workflow ID: `202JEX5zm3VlrUT8`

---

## Executive Summary

Il workflow Battles Evaluator ha **DUE flussi** separati:

| Flusso | Schema | Status |
|--------|--------|--------|
| Individual Evaluation (loop) | OLD (`conversations`, `turns`) | Deprecato |
| Aggregate Analysis | NEW (`battle_results`, `test_runs`) | **DA FIXARE** |

**Problema principale**: Il flusso Aggregate Analysis non aggiorna `status` su `test_runs`.

---

## Architettura Attuale

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUSSO 1: Individual Evaluation (DEPRECATO - USA SCHEMA OLD)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Start Evaluation ──► Get Pending ──► Loop ──► Judge ──► Save   │
│  (manual trigger)     (conversations)         (conversations)   │
│                                                                 │
│  Tabelle: conversations, turns, evaluationcriteria              │
│  Status: NON USARE - schema vecchio                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FLUSSO 2: Aggregate Analysis (ATTIVO - USA SCHEMA NEW)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  When Executed ──► Extract ──► PG Aggregate ──► LLM ──► Save    │
│  (by workflow)     Test Run    (battle_results)       Report    │
│                                                                 │
│  Tabelle: test_runs, battle_results                             │
│  Status: MANCA update status!                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Status State Machine (Target)

```
pending → running → battles_completed → evaluating → completed
                                                  ↘ failed
```

| Status | Chi lo setta | Dove |
|--------|--------------|------|
| `pending` | Dashboard/API | Creazione test_run |
| `running` | Test-RUNNER | Inizio battles |
| `battles_completed` | Test-RUNNER | Fine loop battles |
| `evaluating` | **Evaluator** | Inizio analisi |
| `completed` | **Evaluator** | Fine analisi |
| `failed` | Evaluator | Errore |

---

## Fix Necessari

### FIX 1: Aggiungere nodo "Set Status Evaluating"

**Posizione**: Subito dopo `Extract Test Run Info`, prima di `PG Aggregate`

**Tipo nodo**: Postgres (executeQuery)

**Query**:
```sql
UPDATE test_runs
SET status = 'evaluating',
    last_heartbeat_at = NOW()
WHERE id = $1::uuid
RETURNING id, status
```

**Query Replacement**:
```
={{ $('Extract Test Run Info').item.json.test_run_id }}
```

**Connessioni**:
- Input: `Extract Test Run Info` → `Set Status Evaluating`
- Output: `Set Status Evaluating` → `PG Aggregate`

---

### FIX 2: Modificare nodo "Save Report"

**Nodo attuale** (linea 540):
```sql
UPDATE test_runs
SET
  analysis_report = $1::jsonb,
  analyzed_at = $2
WHERE id = $3
RETURNING id, analyzed_at
```

**Query corretta**:
```sql
UPDATE test_runs
SET
  status = 'completed',
  completed_at = NOW(),
  analysis_report = $1::jsonb,
  analyzed_at = NOW()
WHERE id = $2::uuid
RETURNING id, status, completed_at
```

**Query Replacement** (nuova):
```
={{ JSON.stringify($json.analysis_report) }}, {{ $json.test_run_id }}
```

---

### FIX 3: Modificare nodo "Log error"

**Nodo attuale** (linea 597):
```sql
UPDATE test_runs
SET
  analysis_report = $1::jsonb,
  analyzed_at = $2
WHERE id = $3
```

**Query corretta**:
```sql
UPDATE test_runs
SET
  status = 'failed',
  completed_at = NOW(),
  analysis_report = $1::jsonb,
  analyzed_at = NOW(),
  stopped_reason = 'evaluator_error'
WHERE id = $2::uuid
RETURNING id, status
```

**Query Replacement** (nuova):
```
={{ JSON.stringify({ error: true, message: $json.error, details: $json.message || $json.raw || null }) }}, {{ $json.test_run_id }}
```

---

### FIX 4: Correggere riferimento test_run_id in PG Aggregate

**Già applicato!** Il riferimento è stato cambiato da:
```
$json.test_run_id
```
a:
```
$('Extract Test Run Info').item.json.test_run_id
```

---

## Implementazione Step-by-Step

### Step 1: Aggiungi nodo "Set Status Evaluating"

In n8n:
1. Apri Battles Evaluator
2. Click destro tra `Extract Test Run Info` e `PG Aggregate`
3. Add node → Postgres
4. Configura:
   - **Name**: `Set Status Evaluating`
   - **Operation**: Execute Query
   - **Query**:
     ```sql
     UPDATE test_runs
     SET status = 'evaluating', last_heartbeat_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, status
     ```
   - **Options → Query Replacement**:
     ```
     ={{ $('Extract Test Run Info').item.json.test_run_id }}
     ```
5. Collega: `Extract Test Run Info` → `Set Status Evaluating` → `PG Aggregate`

### Step 2: Modifica "Save Report"

1. Trova nodo `Save Report`
2. Cambia Query a:
   ```sql
   UPDATE test_runs
   SET
     status = 'completed',
     completed_at = NOW(),
     analysis_report = $1::jsonb,
     analyzed_at = NOW()
   WHERE id = $2::uuid
   RETURNING id, status, completed_at
   ```
3. Cambia Query Replacement a:
   ```
   ={{ JSON.stringify($json.analysis_report) }}, {{ $json.test_run_id }}
   ```

### Step 3: Modifica "Log error"

1. Trova nodo `Log error`
2. Cambia Query a:
   ```sql
   UPDATE test_runs
   SET
     status = 'failed',
     completed_at = NOW(),
     analysis_report = $1::jsonb,
     analyzed_at = NOW(),
     stopped_reason = 'evaluator_error'
   WHERE id = $2::uuid
   RETURNING id, status
   ```
3. Cambia Query Replacement a:
   ```
   ={{ JSON.stringify({ error: true, message: $json.error, details: $json.message || $json.raw || null }) }}, {{ $json.test_run_id }}
   ```

---

## Verifica Post-Fix

### Test 1: Trigger manuale

```bash
# In n8n UI:
# 1. Apri Battles Evaluator
# 2. Click "When Executed by Another Workflow"
# 3. Input: {"test_run_id": "e088affd-82d7-45bf-931b-f88a51afa272"}
# 4. Run
```

### Test 2: Verifica DB

```sql
-- Controlla status progression
SELECT id, status, completed_at, analyzed_at, analysis_report IS NOT NULL as has_report
FROM test_runs
WHERE id = 'e088affd-82d7-45bf-931b-f88a51afa272';

-- Expected result:
-- status = 'completed'
-- completed_at = NOT NULL
-- analyzed_at = NOT NULL
-- has_report = true
```

---

## Schema Reference (NEW)

### test_runs

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| test_run_code | varchar | Unique code |
| status | varchar | `pending/running/battles_completed/evaluating/completed/failed` |
| completed_at | timestamptz | Set quando completed/failed |
| analysis_report | jsonb | Report LLM |
| analyzed_at | timestamptz | Quando analizzato |
| last_heartbeat_at | timestamptz | Per monitoring |
| stopped_reason | varchar | Se failed |

### battle_results

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| test_run_id | uuid | FK → test_runs |
| persona_id | uuid | FK → personas |
| outcome | varchar | success/partial/failure |
| score | numeric | 0-10 |
| turns | int | Numero turni |
| transcript | jsonb | Conversazione completa |
| evaluation_details | jsonb | Dettagli valutazione |

---

## Checklist Finale

- [ ] Nodo "Set Status Evaluating" aggiunto
- [ ] Nodo "Save Report" modificato con status='completed'
- [ ] Nodo "Log error" modificato con status='failed'
- [ ] PG Aggregate usa riferimento corretto (già fatto)
- [ ] Test manuale eseguito
- [ ] Status transition verificata in DB
- [ ] Dashboard mostra status corretto
