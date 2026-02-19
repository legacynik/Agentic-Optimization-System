# n8n Workflow Modifications Required

Documento con tutte le modifiche da applicare ai workflow n8n per integrare il sistema v2.

> ⚠️ **v2.4 LEAN**: Ultra-semplificato per MVP single-user.
> Per versione enterprise (HMAC, nonce, Upstash), vedi `ROADMAP-enterprise-features.md` nel PRD.
>
> **Changelog v2.4:**
> - Rimosso mode `full_cycle` (solo `single` | `full_cycle_with_review`)
> - tool_scenario_id ora VARCHAR (non UUID)
> - Check Abort ottimizzato a 2 punti (inizio loop + dopo LLM)
> - Semplificata query personas (no override_config)
> - validation_status ridotto a 2 stati ('pending', 'validated')

---

## 0. SECURITY - Autenticazione Callbacks (v2.3 SIMPLE)

**Priorità**: P0
**Da fare**: Phase 1 del PRD

Tutti i callbacks dal workflow n8n verso la dashboard DEVONO includere il secret header.

### 0.1 Header Richiesto per ogni HTTP Request (callback)

> **v2.3 LEAN**: Semplificato da HMAC a simple secret header.

```javascript
// HTTP Request Node → Headers
{
  "x-n8n-secret": "{{ $env.N8N_SECRET }}"
}
```

Oppure se usi Code Node prima dell'HTTP Request:
```javascript
// Code Node: Add Auth Header
return {
  ...$json,
  _headers: {
    'x-n8n-secret': $env.N8N_SECRET,
    'Content-Type': 'application/json'
  }
};
```

### 0.2 Configurazione Environment Variable

In n8n, configurare:
```
N8N_SECRET=<stesso valore di .env.local della dashboard>
```

Genera con: `openssl rand -hex 32`

### 0.3 Applicare a TUTTI i Workflow

| Workflow | Dove aggiungere | Note |
|----------|-----------------|------|
| Test Runner | Ogni HTTP callback | Header `x-n8n-secret` |
| Evaluator | Ogni HTTP callback | Header `x-n8n-secret` |
| Analyzer | Ogni HTTP callback | Header `x-n8n-secret` |
| Optimizer | Ogni HTTP callback | Header `x-n8n-secret` |
| Personas Generator | Ogni HTTP callback | Header `x-n8n-secret` |

**Status**: [ ] Da implementare

---

## 0b. KILL SWITCH - Check Abort (v2.3 NEW - CRITICAL)

**Priorità**: P0
**Da fare**: Phase 4 del PRD

Ogni workflow deve controllare se il test è stato "abortato" dall'utente PRIMA di ogni step.

### 0b.1 Check Abort Node

Aggiungere questo Code Node PRIMA e DOPO ogni operazione significativa:

```javascript
// Code Node: Check Abort
const testRunId = $json.test_run_id || $('Webhook').item.json.test_run_id;

// Query status from DB
const result = await $helpers.supabase
  .from('test_runs')
  .select('status')
  .eq('id', testRunId)
  .single();

if (result.data?.status === 'aborted') {
  // Return abort signal - workflow should stop gracefully
  return {
    abort: true,
    message: 'Test was aborted by user',
    test_run_id: testRunId
  };
}

// Continue normally
return {
  abort: false,
  ...$json
};
```

### 0b.2 Posizionamento nel Workflow (v2.4 OPTIMIZED - solo 2 check)

> **v2.4**: Ridotto da 4+ a 2 check points per semplicità.

```
[Webhook] → [Get Personas] → [Loop]
                               ↓
                     [Check Abort #1] ← (PRIMA di LLM call)
                               ↓
                      [Battle Agent]
                               ↓
                     [Check Abort #2] ← (DOPO LLM call)
                               ↓
                      [Save Result]
                               ↓
                     [Continue Loop]
```

**Rationale**:
- Check #1: Intercetta abort prima dell'operazione costosa
- Check #2: Intercetta abort dopo LLM call (~30s), evita save inutile
- 2 check coprono 95% degli scenari, bilancio tra reattività e semplicità

### 0b.3 Abort Handler

Dopo il Check Abort node, aggiungere un IF node:
```
IF {{ $json.abort === true }}:
  → [Send Abort Callback] → [Stop Workflow]
ELSE:
  → [Continue Normal Flow]
```

**Status**: [ ] Da implementare

---

## 1. Test RUNNER Battle - Modifiche

**Workflow ID**: XmpBhcUxsRpxAYPN
**Webhook attuale**: `5877058c-19fd-4f26-add4-66b3526c4a96`
**Priorità**: P0

### 1.1 Webhook Input Schema (v2.4 UPDATED)

Il webhook deve accettare questo payload completo:

```json
{
  "prompt_version_id": "uuid-del-prompt",
  "mode": "single",                          // "single" | "full_cycle_with_review" (v2.4: rimosso "full_cycle")
  "max_iterations": 3,                       // solo per full_cycle_with_review
  "tool_scenario_id": "happy_path",          // v2.4: VARCHAR string ID (non UUID!)
  "tool_mocks_override": {                   // opzionale, override inline
    "check_calendar": {
      "success": true,
      "response": { "available_slots": ["09:00"] }
    }
  },
  "callback_url": "https://dashboard.url/api/n8n/webhook"  // opzionale
}
```

**Validazione richiesta**:
- `prompt_version_id`: REQUIRED, UUID format
- `mode`: REQUIRED, enum check (`single` | `full_cycle_with_review`)
- `max_iterations`: DEFAULT 1 se non fornito
- `tool_scenario_id`: OPTIONAL VARCHAR, valori: 'happy_path' | 'calendar_full' | 'booking_fails' | 'partial_availability'

**Status**: [ ] Da implementare

---

### 1.2 Get Prompt - Cambiare Tabella

**Attuale**: Legge da `prompts` con `promptversionid` (text)
**Target**: Leggere da `prompt_versions` con `id` (UUID)

**Query attuale** (da sostituire):
```sql
SELECT * FROM prompts
WHERE promptversionid = 'qual-audit-new-v3.0'  -- HARDCODED!
```

**Query nuova**:
```sql
SELECT
  id,
  prompt_name,
  version,
  content,
  status
FROM prompt_versions
WHERE id = {{ $json.prompt_version_id }}::uuid
```

**Status**: [ ] Da implementare

---

### 1.3 Get Personas - Filtrare per Prompt (v2.4 SIMPLIFIED)

**Attuale**: `SELECT * FROM personas` (prende TUTTE)
**Target**: JOIN con `prompt_personas` per filtrare + **validation_status check**

> ⚠️ **AUDIT FIX CRITICO**: Filtro `validation_status = 'validated'` obbligatorio.
> **v2.4**: Query semplificata - rimosso override_config e version-specific binding.

**Query nuova** (v2.4 semplificata):
```sql
SELECT
  p.id,
  p.personaid,
  p.name,
  p.personaprompt,
  p.category,
  p.difficulty,
  pp.priority
FROM personas p
JOIN prompt_personas pp ON p.id = pp.persona_id
WHERE pp.prompt_name = {{ $json.prompt_name }}
  AND pp.is_active = true
  AND p.validation_status = 'validated'  -- ⚠️ CRITICAL: Solo personas validate
ORDER BY pp.priority, p.category
```

**Note**:
- Serve prima estrarre `prompt_name` dal record di `prompt_versions`
- Se `prompt_personas` è vuota per quel prompt, il test non avrà personas (comportamento corretto)
- `validation_status = 'validated'` esclude personas non validate
- v2.4: Solo 2 stati ('pending', 'validated') - se fallisce → elimina e ricrea

**Status**: [ ] Da implementare

---

### 1.4 Create test_run - Usare Nuova Tabella (v2.4 UPDATED)

**Attuale**: Insert in `testruns` (legacy, text IDs)
**Target**: Insert in `test_runs` (nuova, UUID)

> **v2.4**: Rimosso `cycle_state` (recovery manuale per MVP).

**Insert nuova**:
```sql
INSERT INTO test_runs (
  test_run_code,
  prompt_version_id,
  personas_tested,
  mode,
  max_iterations,
  current_iteration,
  tool_scenario_id,
  test_config,
  llm_config,
  status
) VALUES (
  {{ 'RUN-' + $now.format('YYYYMMDD-HHmmss') }},
  {{ $json.prompt_version_id }}::uuid,
  ARRAY[{{ /* array di persona UUIDs */ }}]::uuid[],
  {{ $json.mode || 'single' }},
  {{ $json.max_iterations || 1 }},
  1,
  {{ $json.tool_scenario_id ? "'" + $json.tool_scenario_id + "'" : 'NULL' }},  -- v2.4: VARCHAR not UUID
  {{ $json.tool_mocks_override ? JSON.stringify({tool_mocks_override: $json.tool_mocks_override}) : '{}' }}::jsonb,
  {{ JSON.stringify({battleLlm: $json.battleLlm || 'gpt-4.1-mini', evaluatorLlm: $json.evaluatorLlm || 'claude-sonnet-4'}) }}::jsonb,
  'running'
)
RETURNING id, test_run_code
```

**Status**: [ ] Da implementare

---

### 1.5 Save Battle Results - Usare Nuova Tabella

**Attuale**: Probabilmente scrive su `conversations` (legacy)
**Target**: Scrivere su `battle_results`

**Insert per ogni battle completata**:
```sql
INSERT INTO battle_results (
  test_run_id,
  persona_id,
  outcome,
  score,
  turns,
  transcript,
  evaluation_details
) VALUES (
  {{ $json.test_run_id }}::uuid,
  {{ $json.persona_id }}::uuid,
  {{ $json.outcome }},
  {{ $json.score }},
  {{ $json.turns }},
  {{ $json.transcript }}::jsonb,
  {{ $json.evaluation }}::jsonb
)
```

**Status**: [ ] Da implementare

---

### 1.6 Update test_run Status a Fine

Quando tutte le battles sono complete:

```sql
UPDATE test_runs
SET
  status = 'completed',
  completed_at = NOW(),
  overall_score = (SELECT AVG(score) FROM battle_results WHERE test_run_id = {{ $json.test_run_id }}::uuid),
  success_count = (SELECT COUNT(*) FROM battle_results WHERE test_run_id = {{ $json.test_run_id }}::uuid AND outcome = 'success'),
  failure_count = (SELECT COUNT(*) FROM battle_results WHERE test_run_id = {{ $json.test_run_id }}::uuid AND outcome IN ('failure', 'tool_error'))
WHERE id = {{ $json.test_run_id }}::uuid
```

> **AUDIT FIX**: `failure_count` ora include anche `tool_error` outcome.

**Status**: [ ] Da implementare

---

### 1.7 Heartbeat Update - Stale Run Detection (AUDIT FIX - NEW)

**Priorità**: P1
**Da fare**: Durante Phase 5 del PRD

Per permettere alla dashboard di rilevare test run "stalli" (stale), aggiornare periodicamente `last_heartbeat_at`.

**Quando aggiornare**:
- Prima di ogni battle
- Dopo ogni battle completata
- Durante loop lunghi

**Query heartbeat**:
```sql
UPDATE test_runs
SET last_heartbeat_at = NOW()
WHERE id = {{ $json.test_run_id }}::uuid
```

**Implementazione suggerita**:
```
[Loop Personas]
    ↓
[Update Heartbeat] ← Aggiungere PRIMA di ogni battle
    ↓
[Execute Battle]
    ↓
[Update Heartbeat] ← Aggiungere DOPO ogni battle
    ↓
[Save Results]
```

**Code Node alternativo** (se si preferisce un approccio centralizzato):
```javascript
// Code Node: Update Heartbeat
// Chiamare questo node periodicamente nel workflow

const testRunId = $('Webhook').item.json.test_run_id || $json.test_run_id;

// Questo verrà eseguito come side effect
await $db.query(`
  UPDATE test_runs
  SET last_heartbeat_at = NOW()
  WHERE id = $1::uuid
`, [testRunId]);

return $input.item;
```

**Status**: [ ] Da implementare

---

### 1.8 Battle Results - Extended Outcome (AUDIT FIX)

> **AUDIT FIX**: Aggiunto `tool_error` come possibile outcome per distinguere fallimenti dovuti a errori tool mock.

**Outcome validi**:
- `success` - Battle completata con successo
- `partial` - Parzialmente riuscita
- `failure` - Fallita (comportamento agente)
- `timeout` - Timeout
- `tool_error` - **NEW**: Errore nei tool mock

**Quando usare `tool_error`**:
```javascript
// Nel Mock Tool Router
if (!mocks[toolName]) {
  // Salva battle result con outcome = 'tool_error'
  return {
    outcome: 'tool_error',
    error: `Tool "${toolName}" not configured in mock scenario`
  };
}
```

**Status**: [ ] Da implementare

---

## 2. Evaluator Workflow - Modifiche (AUDIT FIX)

**Priorità**: P1

### 2.1 Query Unevaluated (AUDIT FIX - CRITICAL)

> ⚠️ **AUDIT FIX CRITICO**: La query DEVE filtrare per `test_run_id` per evitare race condition quando più test run sono in esecuzione contemporaneamente.

**Target**: Trovare battle_results senza valutazione completa **per uno specifico test_run**

**Query VECCHIA** (❌ NON USARE):
```sql
-- ❌ PROBLEMA: Può valutare battle di altri test run!
SELECT br.*, p.personaprompt
FROM battle_results br
JOIN personas p ON br.persona_id = p.id
WHERE br.evaluation_details IS NULL
   OR br.evaluation_details = '{}'::jsonb
ORDER BY br.created_at
LIMIT 10
```

**Query NUOVA** (✅ CORRETTA):
```sql
SELECT
  br.id,
  br.test_run_id,
  br.persona_id,
  br.outcome,
  br.score,
  br.turns,
  br.transcript,
  br.evaluation_details,
  p.personaprompt,
  p.name as persona_name,
  p.category as persona_category
FROM battle_results br
JOIN personas p ON br.persona_id = p.id
WHERE br.test_run_id = {{ $json.test_run_id }}::uuid  -- ⚠️ CRITICAL: Filtro per test_run
  AND (br.evaluation_details IS NULL OR br.evaluation_details = '{}'::jsonb)
ORDER BY br.created_at
LIMIT 10
```

**Workflow Input richiesto**:
```json
{
  "test_run_id": "uuid-del-test-run"  // REQUIRED
}
```

**Status**: [ ] Da implementare

---

### 2.2 Save Evaluation

Dopo che AI valuta, salvare in `battle_results.evaluation_details`:

```sql
UPDATE battle_results
SET
  evaluation_details = {{ $json.evaluation }}::jsonb,
  score = {{ $json.overall_score }},
  outcome = {{ $json.outcome }}
WHERE id = {{ $json.battle_result_id }}::uuid
```

**Anche salvare criteri dettagliati in `evaluationcriteria` (se si usa ancora):
```sql
INSERT INTO evaluationcriteria (conversationid, criterianame, criteriascore, criterianotes)
SELECT
  {{ $json.conversation_id }},
  key,
  (value->>'score')::integer,
  value->>'notes'
FROM jsonb_each({{ $json.criteria_scores }}::jsonb)
```

**Status**: [ ] Da implementare

---

## 3. Personas Generator Workflow - NUOVO

**Priorità**: P2

### 3.1 Webhook Schema

```json
{
  "prompt_version_id": "uuid",
  "prompt_name": "qual-audit-sa",
  "count": 5,
  "criteria": {
    "difficulty_mix": { "easy": 0.3, "medium": 0.4, "hard": 0.2, "extreme": 0.1 },
    "categories": ["decision_maker", "skeptical", "busy", "interested"]
  }
}
```

### 3.2 Flow

```
[Webhook Trigger]
    ↓
[Get Prompt] → SELECT content FROM prompt_versions WHERE id = :id
    ↓
[AI Node] → Generate personas based on:
    - Prompt content (cosa fa l'agente)
    - Business context
    - Testing criteria
    - Italian authentic personalities
    ↓
[Loop Generated Personas]
    ↓
[Insert Persona]
    INSERT INTO personas (name, personaprompt, category, ...)
    RETURNING id
    ↓
[Insert Association]
    INSERT INTO prompt_personas (persona_id, prompt_name, priority)
    VALUES (:new_persona_id, :prompt_name, :index)
```

### 3.3 AI Prompt Template

```
Sei un esperto di design di test personas per agenti conversazionali.

Genera {{ count }} personas per testare questo agente:

=== PROMPT DELL'AGENTE ===
{{ prompt_content }}
=== FINE PROMPT ===

REQUISITI:
- Personalità italiane autentiche (nomi, modi di fare, espressioni)
- Mix di difficoltà: {{ difficulty_mix }}
- Categorie da coprire: {{ categories }}
- Ogni persona deve avere un obiettivo chiaro nella conversazione
- Comportamenti specifici e testabili

OUTPUT JSON:
[
  {
    "name": "Nome Cognome",
    "category": "categoria",
    "difficulty": "easy|medium|hard|extreme",
    "personaprompt": "Istruzioni complete per simulare questa persona...",
    "psychological_profile": "Descrizione psicologica...",
    "behaviors": ["comportamento 1", "comportamento 2"],
    "test_objective": "Cosa deve verificare questo test"
  }
]
```

**Status**: [ ] Da creare

---

## 4. Tool Mocking per Battle Agent

**Priorità**: P1

### 4.1 Concetto

Durante i test, l'agent potrebbe dover chiamare tool (calendario, booking, CRM).
Invece di usare tool reali, usiamo mock che ritornano risposte configurabili.

### 4.2 Webhook Input Esteso

```json
{
  "prompt_version_id": "uuid",
  "mode": "single",
  "tool_scenario_id": "uuid-dello-scenario",
  "tool_mocks_override": {
    "check_calendar": {
      "success": true,
      "response": { "available_slots": ["09:00"] }
    }
  }
}
```

### 4.3 Get Tool Mock Scenario

```sql
-- Prima del loop personas
SELECT mock_responses
FROM tool_mock_scenarios
WHERE id = {{ $json.tool_scenario_id }}::uuid
```

Se `tool_scenario_id` è NULL, usa scenario con `is_default = true`.

### 4.4 Merge con Override

```javascript
// Code Node: Merge Mocks
const baseMocks = $('Get Scenario').item.json.mock_responses || {};
const overrides = $('Webhook').item.json.tool_mocks_override || {};

// Deep merge: override sovrascrive base
const finalMocks = { ...baseMocks };
for (const [tool, config] of Object.entries(overrides)) {
  finalMocks[tool] = { ...baseMocks[tool], ...config };
}

return { mock_responses: finalMocks };
```

### 4.5 Mock Tool Node (nel Battle Agent)

Ogni tool dell'AI Agent deve puntare a un nodo che fa mock:

```javascript
// Mock Tool Router - Code Node
const toolName = $input.item.json.tool_name;
const toolParams = $input.item.json.parameters;
const mocks = $('Get Mocks').item.json.mock_responses;

// Check if tool is mocked
if (!mocks[toolName]) {
  return {
    success: false,
    error: `Tool "${toolName}" not mocked for this test scenario`
  };
}

const mockConfig = mocks[toolName];

// Handle dynamic values
let response = JSON.stringify(mockConfig.response);
response = response.replace('{{random}}', Math.random().toString(36).substr(2, 8));
response = response.replace('{{selected_slot}}', toolParams.slot || 'N/A');
response = JSON.parse(response);

return {
  success: mockConfig.success,
  data: response,
  error: mockConfig.error || null
};
```

### 4.6 Configurazione AI Agent Node

Nel nodo AI Agent, i tools devono essere configurati per chiamare il Mock Tool Router:

```
AI Agent Node
├── Tool: check_calendar
│   └── Execute: Call "Mock Tool Router" with { tool_name: "check_calendar", parameters: {...} }
├── Tool: book_appointment
│   └── Execute: Call "Mock Tool Router" with { tool_name: "book_appointment", parameters: {...} }
└── Tool: get_customer_info
    └── Execute: Call "Mock Tool Router" with { tool_name: "get_customer_info", parameters: {...} }
```

### 4.7 Scenari Predefiniti

| Scenario | Descrizione | Uso |
|----------|-------------|-----|
| `happy_path` | Tutto funziona | Test base |
| `calendar_full` | Nessuno slot | Test gestione "non disponibile" |
| `booking_fails` | Errore sistema | Test error handling |
| `returning_customer` | Cliente con storico | Test personalizzazione |

**Status**: [ ] Da implementare

---

## 4b. Manual Test Trigger Configuration (v2.4 NEW)

**Priorità**: P1
**Da fare**: Per permettere test manuali direttamente da n8n

### 4b.1 Problema

Il trigger manuale attuale non gestisce:
- mode (single/full_cycle_with_review)
- tool_scenario_id (per mock)
- max_iterations

### 4b.2 Soluzione: Nodo "Manual Test Config"

Aggiungere un Code Node tra Manual Trigger e il flow principale:

```javascript
// ═══════════════════════════════════════════════════════════════
// CONFIGURAZIONE TEST MANUALE - Modifica questi valori prima di eseguire
// ═══════════════════════════════════════════════════════════════

const config = {
  // OBBLIGATORIO: UUID del prompt da testare
  prompt_version_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",

  // OPZIONALE: Modalità test
  // - "single": Un solo ciclo di test (default)
  // - "full_cycle_with_review": Ciclo completo con review umana
  mode: "single",

  // OPZIONALE: Numero massimo iterazioni (solo per full_cycle_with_review)
  max_iterations: 1,

  // OPZIONALE: Scenario di mock per i tool
  // - "happy_path": Calendario disponibile, booking OK
  // - "calendar_full": Nessuno slot disponibile
  // - "booking_fails": Errore durante prenotazione
  // - "partial_availability": Solo alcuni slot liberi
  // - null: Nessun mock (usa tool reali)
  tool_scenario_id: "happy_path"
};

// ═══════════════════════════════════════════════════════════════
// NON MODIFICARE SOTTO QUESTA LINEA
// ═══════════════════════════════════════════════════════════════

// Valida UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(config.prompt_version_id)) {
  throw new Error('prompt_version_id non valido. Inserisci un UUID valido.');
}

return { json: config };
```

### 4b.3 Flow Aggiornato

```
[Manual Trigger] → [Manual Test Config] ─┐
                                         ├→ [Validate Input] → [resto flow...]
[Webhook] ───────────────────────────────┘
```

### 4b.4 Connessioni

1. Rimuovere connessione: Manual Trigger → Get Prompt Testing (vecchia)
2. Aggiungere: Manual Trigger → Manual Test Config
3. Aggiungere: Manual Test Config → Validate Input
4. Mantenere: Webhook → Validate Input

**Status**: [ ] Da implementare

---

## 5. Checklist Modifiche (v2.3 Lean)

> ⚠️ **v2.3 LEAN**: Checklist semplificata. NO HMAC, NO Upstash.

### Fase 0 - Security Setup (SIMPLE)
- [ ] Generare N8N_SECRET: `openssl rand -hex 32`
- [ ] Configurare N8N_SECRET in n8n environment variables
- [ ] Aggiungere header `x-n8n-secret` a TUTTI i callbacks HTTP

### Fase 1 - Test Runner Base
- [ ] Webhook accetta prompt_version_id, mode, tool_scenario_id (STRING, non UUID!)
- [ ] Query prompt_versions invece di prompts
- [ ] Estrarre prompt_name per query personas
- [ ] Query personas con JOIN prompt_personas + **validation_status='validated'**
- [ ] Insert in test_runs (nuova tabella) con mode e llm_config
- [ ] Insert in battle_results (con outcome esteso per 'tool_error')
- [ ] Update test_run status a fine (failure_count include tool_error)
- [ ] **Aggiungere "Check Abort" nodes** (v2.3 - Kill Switch)
- [ ] Aggiungere header `x-n8n-secret` ai callbacks

### Fase 2 - Tool Mocking (HARDCODED)
- [ ] Code Node con switch su tool_scenario_id (stringa: 'happy_path', 'calendar_full', etc.)
- [ ] Scenari hardcoded nel Code Node (non da DB!)
- [ ] Merge con override se presente
- [ ] Creare Mock Tool Router code node
- [ ] Gestire tool_error outcome quando tool non configurato
- [ ] Testare scenari: happy_path, calendar_full, booking_fails

### Fase 3 - Evaluator
- [ ] **Query battle_results CON FILTRO test_run_id** (CRITICAL)
- [ ] Update battle_results.evaluation_details
- [ ] Check mode: se "single" → STOP, se "full_cycle_with_review" → trigger Analyzer
- [ ] Aggiungere header `x-n8n-secret` ai callbacks
- [ ] **Aggiungere "Check Abort" nodes** (v2.3)

### Fase 4 - Personas Generator
- [ ] Creare nuovo workflow
- [ ] Webhook setup
- [ ] AI generation node
- [ ] Insert personas con validation_status='pending'
- [ ] Insert associations in prompt_personas
- [ ] Trigger Personas Validator
- [ ] Aggiungere header `x-n8n-secret` ai callbacks

### Fase 5 - Personas Validator
- [ ] Creare nuovo workflow
- [ ] Test battle con persona vs sample prompt
- [ ] AI evaluate se persona raggiunge scopo
- [ ] Se valida → UPDATE validation_status='validated'
- [ ] Se invalida → AI improve → re-test (max 3 tentativi)
- [ ] Aggiungere header `x-n8n-secret` ai callbacks

### Fase 6 - Analyzer + Optimizer (HUMAN REVIEW REQUIRED)
- [ ] Analyzer: legge test_run + battle_results + battle_notes
- [ ] Analyzer: identifica patterns, strengths, weaknesses
- [ ] Optimizer: suggerisce modifiche prompt (NON applica automaticamente!)
- [ ] Optimizer: crea draft prompt_version e ASPETTA human approval
- [ ] **NO loop automatico** - attende callback da dashboard dopo human review
- [ ] Aggiungere header `x-n8n-secret` ai callbacks
- [ ] **Aggiungere "Check Abort" nodes** (v2.3)

---

## Note per Implementazione

### Connessione Postgres
Usa le stesse credenziali Supabase:
- Host: `db.dlozxirsmrbriuklgcxq.supabase.co`
- Database: `postgres`
- Porta: `5432`

### Testing
1. Prima testa query manualmente in Supabase SQL Editor
2. Poi implementa in n8n
3. Testa con Postman prima di collegare dashboard

### Backup
Prima di modificare workflow:
1. Esporta JSON del workflow attuale
2. Salva in `_project_specs/n8n/workflows/` con versione
3. Es: `test-runner-v1-backup.json`
