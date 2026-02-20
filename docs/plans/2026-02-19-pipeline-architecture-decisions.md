---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Architettura pipeline evaluation/optimization multi-agent'
session_goals: 'Decisioni architetturali su webhook pattern, criteria taxonomy, analyzer invocation, optimization loop'
selected_approach: 'random-selection'
techniques_used: ['Morphological Analysis', 'Alien Anthropologist', 'Chaos Engineering']
ideas_generated: [38]
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** nic
**Date:** 2026-02-19

## Session Overview

**Topic:** Architettura pipeline evaluation/optimization multi-agent
**Goals:** Decisioni architetturali concrete su webhook pattern, criteria taxonomy, analyzer invocation, optimization loop

### Context

Pipeline attuale: Test Runner → Battle Agent → Evaluator (Judge Agent + LLM Analyzer) → Optimizer.
3 prompt LLM flaggati NEEDS_OPTIMIZATION. Sistema deve scalare da 1 prompt (qual-audit-sa) a N prompt con criteri diversi.

### Techniques Used

1. **Morphological Analysis** — Matrice parametrica di tutte le combinazioni architetturali
2. **Alien Anthropologist** — 5 assunzioni nascoste smascherate
3. **Chaos Engineering** — 7 scenari di failure con difese

---

## Technique 1: Morphological Analysis — Parameter Matrix

### 14 Architectural Parameters Identified

| # | Parameter | Decision | Rationale |
|---|-----------|----------|-----------|
| P1 | Trigger Evaluator | **Hybrid webhook** — Runner POST webhook, re-eval POST stesso endpoint | Un solo endpoint, due use case. Evaluator è caller-agnostic (vedi nota P1 sotto) |
| P2 | Criteria structure | **Core comuni + domain extension** | 6 core universali + 3-5 domain-specific per prompt type |
| P3 | Analyzer invocation | **Both: auto after eval + on-demand** | Massima flessibilità senza duplicazione |
| P4 | Eval↔Analyze coupling | **Same workflow, analyzer optional (flag)** | `run_analyzer: true/false` evita duplicazione |
| P5 | Optimization loop | **Parallel: multi-eval, then comparative analyze** | A/B testing degli evaluator |
| P6 | LLM Model Judge | **Expression in model field (intra-provider only)** | `={{ $json.llm_config.model }}` — rotazione INTRA-provider senza toccare n8n. Cross-provider richiede cambio credential (vedi nota P6) |
| P7 | Personas generation | **LLM genera + human valida** | Con webhook configurato + persona validator |
| P8 | Output validation | **Code node post-LLM (keep current)** | Più robusto del Structured Output Parser |
| P9 | Multi-agent scaling | **Hub centrale + plugin per dominio** | Workflow generici, config specifica nel DB |
| P10 | Temporal metrics | **Latency stats from chat history timestamps** | Pre-processing calcola latency per il Judge |
| P11 | Persona validation | **LLM evaluator per naturalezza/coerenza** | Valida persona PRIMA di usarla nei test (vedi nota P11: threshold + lifecycle) |
| P12 | Eval A/B testing | **Multiple evaluations per test_run** | Già supportato da schema evaluations |
| P13 | Optimizer mode | **Dual: surgical (1 change) + full (all changes)** | Surgical per capire cosa funziona |
| P14 | Parallel surgical | **N drafts con 1 fix, testati sequenzialmente, confronto parallelo** | Queue per execution, matrix per comparison |

### P6 Detail: LLM Model Configuration

**Default (next 80 days):** Google Gemini — $300 crediti da consumare
```json
{
  "llm_config": {
    "judge": { "model": "gemini-2.5-flash", "provider": "google", "fallback": "gemini-2.0-flash" },
    "analyzer": { "model": "gemini-2.5-flash", "provider": "google", "fallback": "gemini-2.0-flash" }
  }
}
```
**Architecture:** Expression `={{ $json.llm_config.model }}` nel campo model del nodo LLM.

**Rotation scope (IMPORTANT):**
- **Intra-provider** (gemini-2.5-flash → gemini-2.0-flash): Zero modifiche n8n. Solo cambio DB value.
- **Cross-provider** (gemini → claude → openai): Richiede cambio **credential** nel nodo n8n. Non è zero-touch. Opzioni future: (a) nodi LLM separati per provider con IF-router, (b) HTTP Request generico con API key da DB. Per ora scope = solo Google Gemini models.

**Fallback logic:**
- n8n Code node wraps LLM call in try/catch
- On primary model failure (429, 500, timeout >30s): retry with `llm_config.judge.fallback` model
- Max 2 retry attempts with 5s backoff
- If fallback also fails: mark battle_evaluation as `{ "model_error": true, "raw_error": "..." }`, exclude from aggregates

**Budget tracking:**
- `evaluations.tokens_used INTEGER` — record token count per evaluation (from LLM response headers)
- Dashboard "LLM Usage" card: cumulative tokens × estimated cost per model
- Alert threshold: configurable in workflow_configs (default: warn at 80% of $300 = $240 estimated spend)
- No auto-switch on budget exhaustion (manual decision), but dashboard shows remaining budget estimate

### P1 Detail: Hybrid Webhook — Caller Agnosticism

**Clarification:** `triggered_by` is a **metadata/audit field** stored in the `evaluations` row. The evaluator workflow NEVER branches on this value. It exists solely for:
- Dashboard display ("triggered by: auto/manual")
- Analytics (how many manual re-evals vs auto)
- Debugging (trace who initiated an evaluation)

The evaluator processes identically regardless of `triggered_by`. The field is written by the CALLER (runner or API), not read by the evaluator.

### P2 Detail: Criteria Taxonomy

```
CORE (sempre presenti, ogni agent type):
├── brevita_risposte        — Risposte concise, max 2-3 frasi
├── una_domanda_per_turno   — Non fare domande multiple
├── mantenimento_flusso     — Guida la conversazione verso l'obiettivo
├── tono_naturale           — Linguaggio naturale, non robotico
├── gestione_chiusura       — Chiude appropriatamente la conversazione
└── adattamento_persona     — Si adatta allo stile dell'interlocutore

EXTENSION: OUTBOUND SALES (qual-audit-sa)
├── apertura_cornice        — Framing iniziale efficace
├── discovery_socratica     — Domande strategiche per scoprire bisogni
├── pitch_proposta          — Presentazione value proposition
├── gestione_obiezioni      — Gestisce obiezioni con empatia
└── chiusura_appuntamento   — Porta a prenotazione concreta

EXTENSION: OUTBOUND COLD (solis-outbound-cold)
├── aggancio_iniziale       — Cattura attenzione nei primi 10 secondi
├── qualificazione_rapida   — Identifica fit in 2-3 domande
├── proposta_valore         — Comunica beneficio in modo concreto
└── next_step_chiaro        — Propone azione concreta

EXTENSION: INBOUND SUPPORT (futuro)
├── comprensione_problema   — Capisce il problema al primo tentativo
├── empatia_iniziale        — Riconosce frustrazione prima di risolvere
├── risoluzione_efficace    — Risolve senza escalation inutili
└── conferma_soddisfazione  — Verifica che il cliente sia soddisfatto
```

**DB format in evaluator_configs.criteria:**
```json
{
  "core": ["brevita_risposte", "una_domanda_per_turno", "mantenimento_flusso", "tono_naturale", "gestione_chiusura", "adattamento_persona"],
  "domain": ["apertura_cornice", "discovery_socratica", "pitch_proposta", "gestione_obiezioni", "chiusura_appuntamento"],
  "weights": { "discovery_socratica": 1.5, "gestione_obiezioni": 1.5, "brevita_risposte": 1.0 }
}
```

**Criteria resolution (how n8n builds the Judge prompt):**
1. Read `evaluator_configs.criteria` → get `{ core, domain, weights }`
2. Merge `core` + `domain` → full criteria name list
3. For each name, JOIN with `criteria_definitions` table to get `description` + `scoring_guide`
4. If a name has no match in `criteria_definitions` → evaluation FAILS with `"unknown_criteria": ["name"]` error, not silently ignored
5. Inject full objects `{ name, description, scoring_guide, weight }` into system prompt template
6. Criteria names are **opaque identifiers** to n8n workflow — the domain knowledge lives in `criteria_definitions.description` and `criteria_definitions.scoring_guide`, which are passed to the LLM. The workflow itself never interprets them.

**Weighted scoring formula:**
```
weighted_score = SUM(score_i * weight_i) / SUM(weight_i)

Where:
- score_i = individual criterion score (0-10)
- weight_i = weight from config (default 1.0 if not specified)
- All criteria (core + domain) participate in the weighted average

Example with 3 criteria:
  brevita_risposte:    score=8, weight=1.0 → 8.0
  discovery_socratica: score=7, weight=1.5 → 10.5
  gestione_obiezioni:  score=6, weight=1.5 → 9.0

  weighted_score = (8.0 + 10.5 + 9.0) / (1.0 + 1.5 + 1.5) = 27.5 / 4.0 = 6.875
```

This is a **weighted mean**, not a simple average. Unweighted criteria default to `weight: 1.0`.
```

---

## Technique 2: Alien Anthropologist — Hidden Assumptions

| # | Assumption Exposed | Risk | Decision |
|---|-------------------|------|----------|
| 1 | Post-hoc eval = real-time eval | Loses temporal info (latency, hesitation) | **Add latency metrics** — timestamps already in chat history, pre-processing extracts response time stats for Judge |
| 2 | Simulated personas ≈ real clients | Score depends on persona quality, not agent quality | **Add Persona Validator** — LLM evaluates naturalness & persona coherence BEFORE use in tests (see P11 Lifecycle below) |
| 3 | 9 criteria = right number | May be noise; could be more reliable with fewer | **Enable Eval A/B testing** — run same test_run with 5-criteria vs 9-criteria evaluator, compare consistency. Data-driven decision |
| 4 | Full prompt rewrite > surgical patch | Optimizer may lose working sections | **Dual mode optimizer** — `surgical` (git-modify style, 1 change) + `full` (rewrite all). Diff viewer already exists to validate changes |
| 5 | Multi-change per cycle is sufficient | Can't isolate which change helped | **Parallel surgical testing** — N drafts × 1 fix each, sequential execution, comparison matrix in dashboard |

### P11 Lifecycle: Persona Validator

**Validation criteria (LLM scores 1-10):**
- `naturalness` — Does the persona sound like a real person, not a caricature?
- `coherence` — Are demographics, behavior, and goals internally consistent?
- `testability` — Will this persona produce meaningful differentiation in agent behavior?

**Acceptance threshold:** weighted average >= 7.0 (configurable in workflow_configs)

**Lifecycle of a failed persona:**
1. Persona generated by LLM → `status: 'pending_validation'`
2. Validator LLM scores it → if score < threshold → `status: 'rejected'`, `rejection_reason: "..."` stored
3. Rejected personas are NOT deleted — they remain visible in dashboard with "Rejected" badge
4. User can: (a) manually approve override → `status: 'approved_override'`, (b) edit and resubmit → new validation, (c) permanently archive
5. Only personas with `status IN ('validated', 'approved_override')` are eligible for test runs
6. Test Runner query filters `WHERE persona.status IN ('validated', 'approved_override')`

---

## Technique 3: Chaos Engineering — Failure Scenarios & Defenses

### Scenario 1: Infinite Optimization Loop
**Attack:** Optimizer → test → worse score → analyzer suggests revert → optimizer again → loop
**Defense:**
- `max_optimization_rounds` per prompt_version (default: 3) in workflow_configs
- `optimization_round: N` tracked in each draft prompt_version
- **Circuit breaker**: if draft score is >1 point WORSE than original → auto-block + "regression detected" flag

### Scenario 2: Parallel Battles Crash n8n
**Attack:** Surgical mode: 5 drafts × 10 personas = 50 concurrent battles → n8n OOM
**Defense:**
- `max_concurrent_battles` in workflow_configs.config (default: 3)
- Staggering: 5-10 second delay between battles
- Sequential queue for surgical testing (parallel is in COMPARISON, not execution)
- Heartbeat monitor: battle unresponsive >60s → mark timeout, move on

### Scenario 3: Webhook Callback Never Arrives
**Attack:** Dashboard down during deploy, evaluator callback lost, test_run stuck "evaluating" forever
**Defense:**
- **Timeout watchdog**: n8n Schedule Trigger workflow (new, lightweight), runs every 10 minutes. Query: `SELECT id FROM evaluations WHERE status IN ('running','pending') AND started_at < NOW() - INTERVAL '30 minutes'` → sets `status='timeout'`, `error_message='Watchdog timeout after 30min'`. Implementation: separate n8n workflow (not cron, not DB trigger — n8n Schedule node for visibility).
- **Retry callback**: n8n HTTP Request node with retry config: `{ "maxRetries": 3, "retryInterval": 5000, "retryOnTimeout": true }`. Already supported natively by n8n HTTP Request node.
- **Dashboard polling fallback**: `useTestRunStatus(testRunId)` React hook, polls `GET /api/test-runs/:id/status` every 30s while `status IN ('running','evaluating')`. Stops polling when terminal state reached. Lives in `hooks/use-test-run-status.ts`. Reconciliation: if DB shows `evaluations.status='completed'` but test_run still shows 'evaluating', frontend triggers status recalculation via `POST /api/test-runs/:id/reconcile`.

### Scenario 4: Judge Produces Invalid JSON
**Attack:** Gemini returns markdown-wrapped JSON, missing fields, or comments in JSON
**Defense:**
- Current Parse Evaluation Code node try/catch IMPROVED: fallback saves `{ "parse_error": true, "raw_response": "..." }` instead of score=1
- Battle with parse_error EXCLUDED from aggregates
- UI shows "N battles failed to parse — review manually"
- Optional: retry with tighter prompt before fallback

### Scenario 5: Analyzer Hallucinates Evidence
**Attack:** Analyzer cites quotes that don't exist in transcripts → wrong suggestions → worse prompt
**Defense:**
- **Evidence verification** Code node AFTER analyzer — two-tier check:
  - **Tier 1 (exact):** Substring match of `evidence` field against transcripts. If found → `evidence_verified: 'exact'`
  - **Tier 2 (fuzzy):** If no exact match, check if evidence is a pattern summary (contains phrases like "pattern observed", "across N conversations", "generally tends to"). If yes → `evidence_verified: 'pattern'` (acceptable)
  - **Tier 3 (unverified):** Neither exact nor pattern → `evidence_verified: 'unverified'`
- Prompt improvement (CRITICAL): "You MUST use one of two formats: (a) EXACT QUOTE: copy-paste the exact phrase in quotation marks with turn number, or (b) PATTERN: write 'Pattern observed across N conversations: [description]'. NEVER paraphrase a specific quote."
- UI shows traffic light: green (exact), yellow (pattern), red (unverified)
- **Limitation acknowledged:** This catches fabricated quotes, NOT subtle paraphrases. Acceptable tradeoff — the prompt instruction is the primary defense, verification is the safety net.

### Scenario 6: Config Changes Mid-Evaluation
**Attack:** User edits evaluator_config while evaluation is running → inconsistent criteria
**Defense:**
- **Criteria snapshot**: evaluation record stores `criteria_snapshot JSONB` at start, uses snapshot not live config
- **Immutability**: active evaluator_configs are immutable; modifications create new version
- **Lock**: UI blocks edit if config is used by running evaluation

### Scenario 7: Surgical Comparison Decision Paralysis
**Attack:** 3 surgical fixes all improve score → which to keep? What if they conflict?
**Defense:**
- **Comparison matrix** in dashboard: fix × criteria delta table
- **Auto-merge detection**: if fixes modify different prompt sections → suggest merge
- **Conflict detection**: if fixes modify SAME section → flag conflict, user chooses
- **"Apply winning fixes" button**: select fixes, generate combined draft

**UI scope note (P3 tier — not immediate):** The comparison matrix and merge UI are significant dashboard features. They require: (a) a dedicated `/optimizer/compare` page, (b) diff viewer integration (already exists), (c) multi-select prompt version picker, (d) criteria delta calculation API endpoint. These are NOT trivial additions — they warrant their own implementation spec when P3 is prioritized. The defenses above describe the CONCEPT; implementation details belong in a future spec.

---

## Prioritization

### P0 — Must Have (enables everything else)
1. **Evaluator webhook endpoint** — single endpoint for runner + re-eval (P1)
2. **Criteria core+domain in evaluator_configs** — restructure criteria JSON format (P2)
3. **LLM model as expression** — switch to Gemini, enable rotation (P6)
4. **Criteria snapshot in evaluations** — immutability defense (Chaos #6)

### P1 — High Impact
5. **Analyzer as optional flag** — `run_analyzer: true/false` in evaluator trigger (P3/P4)
6. **Persona Validator** — LLM evaluates persona quality before use (P11)
7. **Parse error handling** — exclude failed parses from aggregates (Chaos #4)
8. **Callback retry + polling fallback** — resilience (Chaos #3)

### P2 — Differentiating Features
9. **Eval A/B testing** — multiple evaluations per test_run comparison (P12)
10. **Optimizer dual mode** — surgical vs full (P13)
11. **Latency metrics** — temporal analysis from chat history (P10)
12. **Quote verification** — post-analyzer evidence checking (Chaos #5)

### P3 — Advanced / Future
13. **Parallel surgical testing** — N drafts, sequential execution, comparison matrix (P14)
14. **Auto-merge detection** — combine non-conflicting surgical fixes (Chaos #7)
15. **Circuit breaker** — regression detection in optimization loop (Chaos #1)
16. **Concurrency cap** — max_concurrent_battles in config (Chaos #2)

---

## Guiding Principle

> **"Workflow generici, configurazione specifica."**
>
> I workflow n8n NON sanno nulla del dominio. Ricevono un config ID, leggono tutto dal DB, e lavorano. Tutto il dominio vive nel DB (evaluator_configs, personas, prompt_versions). I workflow sono pure engine.

**Boundary clarification:** The "domain agnostic" boundary works as follows:
- **n8n workflow nodes** (triggers, routers, loops, DB queries): ZERO domain knowledge. They process generic structures.
- **System prompt templates** (stored in `evaluator_configs.system_prompt_template`): CONTAIN domain knowledge. They reference criteria names, scoring guides, domain context. This is BY DESIGN — templates are data, not workflow logic.
- **Criteria names** (`brevita_risposte`, `discovery_socratica`): Are opaque strings to n8n. The workflow passes them to the LLM via the template. n8n never interprets, branches on, or validates them (validation happens in the API layer).
- **Adding a new domain** (e.g., inbound support): Requires ONLY new DB rows (criteria_definitions, evaluator_config, system_prompt_template). Zero n8n changes.

---

## Rollback Strategy

Every P0 change is additive (new columns, new tables). Rollback plan per task:

| Task | Rollback Action | Risk |
|------|----------------|------|
| T1: Hybrid Webhook | Revert n8n workflow to previous version (n8n has version history). API continues to work with old payload format. | Low — webhook is stateless |
| T2: Criteria Taxonomy | New `criteria_definitions` table can be dropped. `evaluator_configs.criteria` migration includes `DOWN` that reverts to flat array format. Keep old format in `criteria_legacy JSONB` column during transition (drop after 2 weeks). | Medium — data migration is the risk. Mitigation: backup before migration, test on staging first |
| T3: LLM Expression | Revert n8n node model field to hardcoded string. `llm_config` column is nullable, so old configs work without it. | Low — single field change |
| T4: Criteria Snapshot | `criteria_snapshot` column is nullable. n8n can fallback to reading from `evaluator_configs.criteria` if snapshot is NULL (backwards compatible query: `COALESCE(e.criteria_snapshot, ec.criteria)`). | Low — additive only |

**General rule:** All migrations must have a `DOWN` section. Test rollback on local Supabase before applying to production.

---

## Cross-Tier Dependency Map

Dependencies between P0/P1/P2/P3 items that affect execution ordering:

```
P0-T1 (Webhook) ──────────┐
                           ├──→ P1-#5 (Analyzer flag) — needs webhook payload to include run_analyzer
P0-T2 (Criteria taxonomy) ─┤
                           ├──→ P1-#5 (Analyzer flag) — analyzer reads criteria in new format
                           ├──→ P2-#9 (Eval A/B) — comparison needs consistent criteria format
                           └──→ P0-T4 (Snapshot) — snapshot must capture new format
P0-T3 (LLM expression) ───→ P0-T4 (Snapshot) — snapshot should also capture llm_config
P0-T4 (Snapshot) ─────────→ P2-#9 (Eval A/B) — comparison uses snapshots for criteria diff

P1-#6 (Persona Validator) — INDEPENDENT, no P0 dependency. Can start anytime.
P1-#7 (Parse error handling) — INDEPENDENT, only touches existing Code node in evaluator.
P1-#8 (Callback retry) — Partially overlaps P0-T1 (both touch evaluator webhook). Implement AFTER T1.

P2-#10 (Optimizer dual mode) — Requires P1-#5 (analyzer) to be working first.
P2-#12 (Quote verification) — Requires P1-#5 (analyzer flag) since it's a post-analyzer step.

P3-#13/14 (Surgical testing) — Requires P2-#10 (optimizer) + own UI spec (Chaos #7 note).
P3-#15 (Circuit breaker) — Requires P2-#10 (optimizer) to exist.
P3-#16 (Concurrency cap) — INDEPENDENT, pure workflow_configs change.
```

**Parallelizable:**
- P1-#6 (Persona Validator) can run in parallel with all P0 tasks
- P1-#7 (Parse error) can run in parallel with all P0 tasks
- P0-T3 and P0-T4 can run in parallel (after T2)

---

## Next Steps

1. Create implementation spec from this document
2. Sequence P0 items for immediate implementation
3. Test Gemini model expression in evaluator workflow
4. Restructure evaluator_configs.criteria to core+domain format
5. Add webhook endpoint to evaluator workflow
