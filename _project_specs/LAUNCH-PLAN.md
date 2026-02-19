# Piano Lineare di Lancio — Test a New Prompt E2E

**Data**: 2026-02-17 (v3.0 — stato corretto post-fix)
**Validato su**: DB reale, n8n executions 33558/33569, UI funzionante

---

## Diagramma Flow

```
STEP 1          STEP 2            STEP 3            STEP 4
┌──────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ CREA     │──▶│ GENERA &     │─▶│ CREA         │─▶│ LANCIA       │
│ PROMPT   │   │ VALIDA       │  │ EVALUATOR    │  │ TEST RUN     │
│          │   │ PERSONAS     │  │ CONFIG       │  │              │
│ /prompts │   │ /personas    │  │ /evaluators  │  │ /test-launch │
│ ✅ READY │   │ ✅ READY     │  │ ✅ READY     │  │ ✅ READY     │
└──────────┘   └──────────────┘  └──────────────┘  └──────┬───────┘
                                                          │
                                                          ▼
STEP 8          STEP 7           STEP 6            STEP 5
┌──────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ OTTIMIZZA│◀──│ ANALIZZA     │◀─│ VALUTA CON   │◀─│ ESEGUI       │
│ PROMPT   │   │ RISULTATI    │  │ LLM JUDGE    │  │ BATTLES      │
│ Voice PB │   │              │  │              │  │              │
│ manuale  │   │ /test-runs/id│  │ n8n auto     │  │ n8n auto     │
│ ⚠️ MAN.  │   │ ✅ READY     │  │ ✅ VERIFIED  │  │ ✅ WORKING   │
└──────────┘   └──────────────┘  └──────────────┘  └──────────────┘
     │                                                     │
     └──── ITERATE (nuova versione) ──────────────────────►┘
```

---

## Stato Reale Verificato — 2026-02-17

### Cosa Funziona (TUTTO il core flow)

| Area | Stato | Verifica |
|------|-------|----------|
| Prompt CRUD (API + UI) | ✅ | PromptVersionsHub con dati reali |
| Personas Generation (n8n) | ✅ | Workflow `HltftwB9Bm8LNQsO` testato |
| Personas Validation (UI) | ✅ | Validate/Reject in PersonaWorkshop |
| Prompt-Personas (n8n auto-link) | ✅ | Generator crea junction entries |
| Evaluator Configs CRUD (API + UI) | ✅ | 7 routes, /evaluators page |
| Test Launcher (API + UI + n8n) | ✅ | Webhook trigger funzionante |
| Battle Agent (n8n) | ✅ | Conversazioni generate correttamente |
| **Evaluator (n8n)** | **✅** | **Exec 33558: 12/12 battles, 100% success** |
| **Migration 010 (FK fix)** | **✅** | **Exec 33569: 88ms, 0 errori** |
| **Dynamic System Prompt** | **✅** | **Criteri JSONB → Judge Agent** |
| **Parser Gemini Flash** | **✅** | **Robust: markdown, trailing commas, type coercion** |
| Evaluations list + detail UI | ✅ | /test-runs/[id] con tabella evaluations |
| Re-evaluate async | ✅ | Modal con polling 5s |
| Compare evaluations | ✅ | Side-by-side diff overlay |
| Dashboard view (battle_evaluations) | ✅ | Migration 011: preferisce promoted evaluations |
| Settings (webhook config) | ✅ | Test connectivity per workflow |

### Cosa Manca (NON bloccante per il flow)

| Gap | Impatto | Workaround | Stato |
|-----|---------|------------|-------|
| No UI per prompt_personas manuale | Basso | Usa n8n Generate (auto-link) | P3 |
| ~~Tool mocking Battle Agent~~ | — | Tools testati live | **DEFERRED** |
| Optimizer n8n non testato | Basso | Ottimizza manualmente con Playbook | P3 |
| ~~Check Abort #2~~ | — | Abort #1 funziona | **DEFERRED** |
| ~~x-n8n-secret su callbacks~~ | — | Single-user, dev mode ok | **DEFERRED** |
| Playwright tests (5 failing) | Nessuno | Non bloccano flow | P4 |
| Unit tests (0%) | Nessuno | Non bloccano flow | P4 |

---

## Step-by-Step Operativo

### STEP 1: Crea Prompt — ✅ PRONTO

**Dove**: `/prompts` → "Create New"

**Campi**:
- Prompt name (es. "booking-agent-v1")
- Version (es. "1.0")
- System prompt content
- Business type (opzionale)
- Optimization notes (opzionale)

**Integrazione Voice Agent Playbook — Template System Prompt**:

| Sezione | Contenuto | Tecnica Playbook |
|---------|-----------|------------------|
| **# Identity** | Nome, ruolo, backstory, tratti | Role Prompting (§2.2.1.3) |
| **# Task** | Routing + classificazione intent | Thread-of-Thought: "silently determine" |
| **# Guardrails** | Regole non negoziabili | Emotion Prompting: "CRITICAL: [rule]" |
| **# Tools** | Max 3-4 tools con fallback | Descrizioni precise di QUANDO usare |
| **# Tone** | Formalita, energia, registro | Style Prompting: "warm, professional" |
| **# Examples** | 2-3 conversazioni reali | Few-Shot con Similarity + Label Quality |
| **# Final Reminder** | 1-2 regole piu critiche ripetute | Prompt Repetition (reattivo) |

**Checklist pre-save**:
- [ ] Identity ha nome + backstory specifici
- [ ] Guardrails usano emotion prompting
- [ ] Max 1-2 regole ripetute alla fine
- [ ] Examples 2-3, dal settore specifico, italiano parlato
- [ ] Numeri in lettere ("millecinquecento")
- [ ] Nessun markdown nell'output
- [ ] Prompt in inglese con "Always respond in Italian"

---

### STEP 2: Genera & Valida Personas — ✅ PRONTO

**Dove**: `/personas`

**Percorso raccomandato (n8n)**:
1. Click "Generate" → inserisci count (5-10 consigliato)
2. n8n genera personas + auto-linka al prompt
3. Tab "Pending" → rivedi ogni persona
4. Click "Validate" per le buone, "Reject" per le cattive
5. Solo personas "validated" usate nei test

**Mix consigliato**: 30% easy, 40% medium, 20% hard, 10% extreme

---

### STEP 3: Crea Evaluator Config — ✅ PRONTO

**Dove**: `/evaluators` → "Create New"

**Campi**:
- Nome (es. "booking-criteria-v1")
- Versione
- Prompt version (seleziona dal dropdown)
- Criteri (array JSONB):
  ```
  [
    { "name": "intent_classification", "weight": 2, "description": "...", "scoring_guide": "..." },
    { "name": "booking_completion", "weight": 3, "description": "...", "scoring_guide": "..." },
    ...
  ]
  ```
- System prompt template per Judge Agent
- Success config: `{ "min_score": 7 }`

**Integrazione Playbook per Judge Agent prompt**:
- Usa **Few-Shot CoT** per il system prompt del Judge
- Includi esempi di valutazione (score 2, 5, 8, 10)
- Scoring guide con threshold chiari per ogni criterio

**Dopo**: Click "Promote" per renderlo il default.

---

### STEP 4: Lancia Test Run — ✅ PRONTO

**Dove**: `/test-launcher`

1. Seleziona prompt version dal dropdown
2. Mode: "single" (test rapido)
3. Click "Launch Test"
4. Monitor real-time mostra progresso

**Pre-condizioni** (verificate automaticamente):
- Prompt version esiste
- Almeno 1 persona validated e linked
- Webhook test_runner configurato in Settings

---

### STEP 5: Esegui Battles — ✅ AUTOMATICO

**n8n**: Battle Agent (`Z35cpvwXt7Xy4Mgi`)

- Loop per ogni persona validated
- Max 30 turni per conversazione
- Chat memory via Postgres
- Salva transcript JSONB + outcome + turns

**Status flow**: `pending` → `running` → `battles_completed`

---

### STEP 6: Valuta con LLM Judge — ✅ VERIFICATO

**n8n**: Evaluator (`202JEX5zm3VlrUT8`)

**Verificato**: Execution 33558 — 12/12 battles, 100% success, overall_score 6.73

**Flow**:
1. Fetch evaluator_config (1 JOIN diretto, migration 010)
2. Build dynamic system prompt da criteri JSONB
3. Judge Agent (Gemini 2.0 Flash via OpenRouter) valuta ogni battle
4. INSERT battle_evaluations (score, criteria_scores, outcome, summary)
5. UPDATE evaluation aggregates (overall_score, success/failure count)

**Status flow**: `battles_completed` → `evaluating` → `completed`

---

### STEP 7: Analizza Risultati — ✅ PRONTO

**Dove**: `/test-runs/[id]`

**Azioni disponibili**:
1. **Score complessivo** + success/failure/partial counts
2. **Tabella evaluations** — nome, versione, score, stato
3. **Re-evaluate** — seleziona evaluator diverso → async polling → nuova evaluation
4. **Compare** — seleziona 2 evaluations → diff overlay con delta per criterio
5. **Promote** — imposta evaluation come "ufficiale"

**Anche**:
- `/conversations` — explorer con filtri, transcript, evaluation detail
- `/` — dashboard KPI, heatmap, trend
- `/agentic` — health monitor per agente

---

### STEP 8: Ottimizza Prompt — ⚠️ MANUALE (con Voice Agent Playbook)

**Percorso manuale v1** (raccomandato):

1. **Analizza risultati** (Step 7) — identifica pattern di fallimento
2. **Classifica errori** con la tassonomia del Playbook:

| Sintomo nei battle logs | Categoria Playbook | Fix |
|-------------------------|-------------------|-----|
| Agent ignora regole specifiche | Guardrails deboli | Emotion Prompting + Prompt Repetition Lv.1 |
| Agent perde tono durante la call | Agent Drift | Ripeti Identity + Guardrails alla fine |
| Agent classifica male l'intent | Routing errato | Thread-of-Thought + RE2 (rephrase) |
| Agent inventa informazioni | Allucinazione | Few-Shot con dati reali + vincoli espliciti |
| Tool calls con parametri sbagliati | Tool Usage Error | Prompt Repetition su tool docs + migliori docstrings |
| Output troppo verboso/formattato | Format Error | "Respond in natural spoken Italian sentences only" |
| Agent non completa il booking | Missing Step | Few-Shot con esempio booking completo + emotion ("CRITICAL") |

3. **Applica Prompt Repetition** (escalation progressiva):

| Livello | Cosa ripetere | Quando |
|---------|--------------|--------|
| **0 — Base** | Nulla | Default per ogni nuovo agent |
| **1 — Singola regola** | La regola violata nel Final Reminder | 1 regola specifica ignorata |
| **2 — Sezione** | Intera sezione Guardrails alla fine | Piu regole violate |
| **3 — Doppio blocco** | Guardrails + Task alla fine | Agent fuori controllo |

4. **Self-Consistency per Evaluator** (opzionale, potente):
   - Nel workflow Evaluator, genera 3 valutazioni indipendenti (temp 0.3, 0.5, 0.7)
   - Prendi voto di maggioranza
   - Riduce varianza eval del 40-60%

5. **Crea nuova versione** in `/prompts` (torna a Step 1)
6. **Rilancia test** (Step 4) → confronta con versione precedente

---

## Checklist Pre-Lancio (per ogni nuovo prompt)

### Una tantum (setup)

- [ ] Settings: verifica webhook URLs per test_runner, evaluator, personas_generator
- [ ] Settings: test connectivity → risposta 200 per ogni webhook
- [ ] Almeno 1 evaluator_config promoted per il prompt

### Ciclo ripetibile

| # | Step | Dove | Tempo |
|---|------|------|-------|
| 1 | Crea prompt version (usa template Playbook) | `/prompts` | 10 min |
| 2 | Genera personas | `/personas` → Generate | 2 min |
| 3 | Valida personas | `/personas` → Validate | 3 min |
| 4 | Crea/seleziona evaluator config | `/evaluators` | 5 min |
| 5 | Promuovi evaluator | `/evaluators` → Promote | 1 min |
| 6 | Lancia test | `/test-launcher` | 2 min |
| 7 | Attendi completamento | Monitor | 5-15 min |
| 8 | Analizza risultati | `/test-runs/[id]` | 10 min |
| 9 | (Opz) Re-evaluate con criteri diversi | `/test-runs/[id]` | 5 min |
| 10 | (Opz) Compare evaluations | `/test-runs/[id]` | 5 min |
| 11 | Ottimizza con Playbook | Manuale → `/prompts` | 10 min |
| 12 | Ripeti da Step 6 | `/test-launcher` | — |

**Tempo primo ciclo**: ~50 min (inclusa creazione evaluator)
**Tempo cicli successivi**: ~25 min (riusa evaluator + personas)

---

## Decisioni Architetturali Consolidate

| # | Decisione | Stato |
|---|-----------|-------|
| D1 | PRD v2.4 Lean (single-user, simple auth) | ✅ Attivo |
| D5 | Criteri nel Prompt, non nella Persona | ✅ Implementato |
| D6 | N evaluations per test_run (A/B testing) | ✅ Implementato |
| D11 | Dynamic system prompt da evaluator_configs JSONB | ✅ Verificato (exec 33558) |
| D12 | evaluator_configs FK → prompt_versions(id) | ✅ Migration 010 |
| D13 | API response standardizzato | ✅ Implementato |
| N5 | Dashboard polling DB (no callback obbligatorio) | ✅ Attivo |

---

## Riferimenti

| Risorsa | Path |
|---------|------|
| **Voice Agent Prompting Playbook** | `~/vibe world/Prompts Gallery/Prompting techniques KB/Prompting Playbook — Sempre Attivo.md` |
| Master Playbook (generico) | `~/vibe world/Prompts Gallery/Prompting techniques KB/Master Playbook Definitivo.md` |
| Session State | `_project_specs/session/current-state.md` |
| Evaluator Spec | `_project_specs/specs/evaluator-multi-prompt.md` |
| n8n Fixes Log | `_project_specs/n8n/N8N-WORKFLOW-FIXES.md` |
| Excalidraw Diagram | `_project_specs/diagrams/e2e-prompt-testing-flow.excalidraw` |
| Schema Reference | `_project_specs/schema-reference.md` |
| Frontend Docs | `docs/frontend.md` |
| Backend Docs | `docs/backend.md` |
| n8n Docs | `docs/n8n.md` |

---

## Progress History

| Data | Cosa | Commit |
|------|------|--------|
| Feb 16 | E1-E4 completati, Migration 010, n8n Evaluator fixed | `a5a011f` |
| Feb 16 | Parser hardened per Gemini Flash | `1593492` |
| Feb 16 | API fixes (prompt_version_id FK) | `aae3312` |
| Feb 17 | Launch Plan v3 — stato corretto, Voice Playbook integrato | — |

---

*v3.0 — 2026-02-17. Corretto stato n8n (evaluator FUNZIONANTE), integrato Voice Agent Prompting Playbook.*
