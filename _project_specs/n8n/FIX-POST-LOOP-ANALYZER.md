# FIX: Post-Loop Analyzer Branch + Eval Loop Bugs

**Status**: IN PROGRESS
**Priorita**: HIGH - Il ramo post-loop e' completamente non funzionale + bug nel loop eval
**Workflow**: Battles Evaluator
**Test Run di riferimento**: `e1117e74-11b5-4576-875d-0123a3cad8c3` (buono), `26259dce-...` (reset per re-eval)

---

## Diagnosi Completa

### Flusso Attuale (ROTTO)
```
splitInBatches[done] → PG Aggregate → LLM Analyzer → Code Parser → If → Save Report / Log error
                       ^^^^^^^^^^^    ^^^^^^^^^^^^^
                       BUG #1-3       BUG #4-5
```

### Bug Identificati

| # | Bug | Severita | Dettaglio |
|---|-----|----------|-----------|
| 1 | **PG Aggregate query tabella sbagliata** | CRITICAL | Interroga `battle_results.score` che e' **sempre NULL**. I dati reali (score, criteria_scores, summary, strengths, weaknesses) sono in `battle_evaluations` |
| 2 | **12 items duplicati** | HIGH | Il done branch di splitInBatches emette N items (1 per conversazione processata). PG Aggregate riceve 12 items identici e produce 12 query identiche → LLM riceve 12x gli stessi dati |
| 3 | **NULL su array vuoti** | MEDIUM | `json_agg()` ritorna NULL quando non ci sono righe (es. nessun failure). Manca `COALESCE(..., '[]'::json)` |
| 4 | **Dati insufficienti per LLM** | CRITICAL | La query passa solo counts aggregati (total/success/failure). Mancano: criteria_scores breakdown, summaries, strengths/weaknesses per conversazione, performance per persona |
| 5 | **Prompt LLM solo failure-oriented** | HIGH | Il prompt dice "identify patterns in failures" ma se tutto e' success (come nel test run di riferimento) il LLM non ha nulla da analizzare. Manca analisi complessiva |
| 6 | **Parse Evaluation legge .output invece di .text** | CRITICAL | Passando da Agent a chainLlm, l'output e' in `$json.text` (stringa con code fences) non `$json.output` (oggetto). Il Parse va in fallback score=1 per TUTTE le conv. **FIXATO** |
| 7 | **Upsert battle_evaluations incompleto** | MEDIUM | `ON CONFLICT DO UPDATE` aggiorna solo score/criteria/outcome/summary ma NON strengths/weaknesses/raw_response/evaluator_version. Su ri-valutazioni i nuovi campi non vengono sovrascritti |

### Evidenza dai Dati Reali

**Output attuale PG Aggregate** (12 items identici):
```json
{
  "analysis_context": {
    "test_run_id": "e1117e74-...",
    "overall_stats": { "total": 12, "success": 12, "avg_score": null },
    "failures_detail": null,
    "human_notes": null
  }
}
```

**Dati REALI disponibili in `battle_evaluations`** (per lo stesso test_run):
```json
{
  "eval_score": 8.50,
  "eval_outcome": "successo",
  "criteria_scores": {
    "pitch_audit": 8, "ascolto_attivo": 9, "apertura_cornice": 8,
    "recap_strategico": 7, "gestione_obiezioni": 8, "italiano_autentico": 8,
    "adattamento_persona": 9, "discovery_socratica": 7, "chiusura_prenotazione": 10
  },
  "summary": "L'agente ha gestito la chiamata con grande professionalità...",
  "strengths": ["Adattamento alla Persona: capacità di interagire..."],
  "weaknesses": ["Recap Strategico: avrebbe potuto usare un riassunto più forte..."],
  "persona_name": "Luca Vago",
  "persona_category": "Comportamentali"
}
```

**Nota schema `criteria_scores`**: Esistono DUE formati nel DB:
- **Nuovo (object)**: `{"pitch_audit": 8, "ascolto_attivo": 9, ...}`
- **Vecchio (array)**: `[{"score": 9, "criteria_name": "italiano_autentico", "notes": "..."}]`

La query deve gestire entrambi.

---

## Piano di Fix (5 Step)

### STEP 0: Fix Parse Evaluation — COMPLETATO

**Bug**: Il nodo Parse Evaluation leggeva `$json.output` (formato Agent node) ma il Judge Agent ora e' un chainLlm che restituisce `$json.text` (stringa con markdown code fences). Tutte le eval andavano in fallback con score=1.

**Fix applicato**: Le prime righe del Parse Evaluation ora gestiscono entrambi i formati:
```javascript
let raw = $json.output || $json.text || '';
let evaluation = raw;
if (typeof raw === 'string') {
  const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  evaluation = JSON.parse(cleaned.substring(start, end + 1));
}
```

**Status**: DONE

---

### STEP 1: Fix Upsert Update Battle Result

**Bug**: L'`ON CONFLICT` aggiorna solo 5 campi su 10. Su ri-valutazioni, strengths/weaknesses/raw_response/evaluator_version restano vecchi.

**Azione**: Nel nodo "Update Battle Result", sostituire la clausola ON CONFLICT con:

```sql
INSERT INTO battle_evaluations (
  evaluation_id,
  battle_result_id,
  score,
  criteria_scores,
  outcome,
  summary,
  strengths,
  weaknesses,
  raw_response,
  evaluator_version
) VALUES (
  $1::uuid,
  $2::uuid,
  $3,
  $4::jsonb,
  $5,
  $6,
  $7::jsonb,
  $8::jsonb,
  $9::jsonb,
  $10
)
ON CONFLICT (evaluation_id, battle_result_id) DO UPDATE SET
  score = EXCLUDED.score,
  criteria_scores = EXCLUDED.criteria_scores,
  outcome = EXCLUDED.outcome,
  summary = EXCLUDED.summary,
  strengths = EXCLUDED.strengths,
  weaknesses = EXCLUDED.weaknesses,
  raw_response = EXCLUDED.raw_response,
  evaluator_version = EXCLUDED.evaluator_version,
  evaluated_at = now()
RETURNING id, evaluation_id
```

**Nota**: I parametri queryReplacement restano identici, cambia solo la query SQL.

---

### STEP 2: Riscrittura PG Aggregate SQL

**Azione**: Sostituire la query con una che interroga `battle_evaluations` + `battle_results` + `personas`.

**Nuova query SQL**:
```sql
WITH eval_data AS (
  SELECT
    be.score,
    be.outcome,
    be.criteria_scores,
    be.summary,
    be.strengths,
    be.weaknesses,
    br.turns,
    br.outcome as original_outcome,
    p.name as persona_name,
    p.category as persona_category
  FROM battle_evaluations be
  JOIN battle_results br ON be.battle_result_id = br.id
  JOIN personas p ON br.persona_id = p.id
  WHERE br.test_run_id = $1::uuid
),
-- Stats aggregate
stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE outcome IN ('success', 'successo')) as success_count,
    COUNT(*) FILTER (WHERE outcome IN ('partial', 'successo_parziale')) as partial_count,
    COUNT(*) FILTER (WHERE outcome IN ('failure', 'fallimento')) as failure_count,
    ROUND(AVG(score)::numeric, 2) as avg_score,
    ROUND(MIN(score)::numeric, 2) as min_score,
    ROUND(MAX(score)::numeric, 2) as max_score
  FROM eval_data
),
-- Per-persona breakdown
persona_perf AS (
  SELECT json_agg(json_build_object(
    'persona', persona_name,
    'category', persona_category,
    'score', score,
    'outcome', outcome,
    'turns', turns,
    'summary', summary,
    'strengths', strengths,
    'weaknesses', weaknesses
  ) ORDER BY score ASC) as personas
  FROM eval_data
),
-- Criteria averages (handles JSONB object format)
criteria_avg AS (
  SELECT json_object_agg(
    key,
    ROUND(avg_val::numeric, 2)
  ) as criteria_breakdown
  FROM (
    SELECT
      kv.key,
      AVG(kv.value::text::numeric) as avg_val
    FROM eval_data,
    LATERAL jsonb_each(
      CASE jsonb_typeof(criteria_scores)
        WHEN 'object' THEN criteria_scores
        WHEN 'array' THEN (
          SELECT jsonb_object_agg(elem->>'criteria_name', elem->'score')
          FROM jsonb_array_elements(criteria_scores) elem
        )
        ELSE '{}'::jsonb
      END
    ) AS kv(key, value)
    WHERE criteria_scores IS NOT NULL
    GROUP BY kv.key
  ) sub
)
SELECT json_build_object(
  'test_run_id', $1::uuid,
  'overall_stats', (SELECT row_to_json(stats) FROM stats),
  'criteria_breakdown', (SELECT criteria_breakdown FROM criteria_avg),
  'conversations_detail', (SELECT personas FROM persona_perf),
  'weakest_areas', (
    SELECT json_agg(json_build_object('criteria', key, 'avg_score', ROUND(avg_val::numeric, 2)))
    FROM (
      SELECT kv.key, AVG(kv.value::text::numeric) as avg_val
      FROM eval_data,
      LATERAL jsonb_each(
        CASE jsonb_typeof(criteria_scores)
          WHEN 'object' THEN criteria_scores
          WHEN 'array' THEN (
            SELECT jsonb_object_agg(elem->>'criteria_name', elem->'score')
            FROM jsonb_array_elements(criteria_scores) elem
          )
          ELSE '{}'::jsonb
        END
      ) AS kv(key, value)
      WHERE criteria_scores IS NOT NULL
      GROUP BY kv.key
      ORDER BY avg_val ASC
      LIMIT 3
    ) bottom
  ),
  'strongest_areas', (
    SELECT json_agg(json_build_object('criteria', key, 'avg_score', ROUND(avg_val::numeric, 2)))
    FROM (
      SELECT kv.key, AVG(kv.value::text::numeric) as avg_val
      FROM eval_data,
      LATERAL jsonb_each(
        CASE jsonb_typeof(criteria_scores)
          WHEN 'object' THEN criteria_scores
          WHEN 'array' THEN (
            SELECT jsonb_object_agg(elem->>'criteria_name', elem->'score')
            FROM jsonb_array_elements(criteria_scores) elem
          )
          ELSE '{}'::jsonb
        END
      ) AS kv(key, value)
      WHERE criteria_scores IS NOT NULL
      GROUP BY kv.key
      ORDER BY avg_val DESC
      LIMIT 3
    ) top
  ),
  'human_notes', COALESCE(
    (SELECT json_agg(bn.note)
     FROM battle_notes bn
     JOIN battle_results br ON bn.battle_result_id = br.id
     WHERE br.test_run_id = $1::uuid),
    '[]'::json
  )
) as analysis_context
```

**Parametri PG node**: `queryReplacement` = `={{ $json.test_run_id }}`

---

### STEP 3: Nodo Dedup (opzionale, gia' implementato)

**Nota**: Il nodo Code "Dedup to Single Item" e' stato aggiunto tra splitInBatches[done] e PG Aggregate per evitare N query identiche. Non e' strettamente necessario (la query e' idempotente) ma riduce il carico su PG.

**Status**: DONE (gia' implementato dall'utente)

---

### STEP 4: Riscrittura LLM Analyzer (Playbook-Driven)

**Tecniche Playbook applicate**:
- **Contesto 2.1 (Few-Shot ICL)**: Esempio concreto di output atteso con dati reali
- **Contesto 2.2 (Production Stack)**: Role Prompting + regole in markdown strutturato
- **Contesto 5 (ErrorAtlas)**: Tassonomia diagnostica per classificare i pattern
- **Contesto 1.1 (Prompt Repetition Vanilla 2x)**: Blocco CRITICO ripetuto integralmente a fine prompt (non parafrasato)

**Lingua**: Istruzioni in **inglese** (max LLM performance), formato **markdown**. Solo il campo `text` nelle suggestions e' in italiano (e' testo da incollare nel prompt dell'agente vocale).

#### System Message (nuovo):

```markdown
# Role

You are a **Senior Voice Agent Performance Analyst** specialized in Italian B2B AI voice agents for consultative sales.

# Task

Analyze batch test results (battle tests) for an Italian voice agent. Identify recurring patterns, strengths, systemic weaknesses, and generate **concrete, actionable suggestions** to improve the agent's system prompt.

# Critical Rules

1. Every issue **MUST** include direct evidence from the data (quote from conversation summary or weaknesses)
2. Every suggestion **MUST** contain ready-to-paste **Italian text** for the agent's system prompt
3. If the agent performs well (avg_score > 7.5, no failures), focus on **optimization**: analyze the weakest criteria and suggest how to bring them up to the level of the strongest
4. If there are failures, use the **ErrorAtlas taxonomy** below to classify the error type
5. Output **valid JSON only**. No markdown fences. No text outside the JSON object.

# Error Taxonomy (ErrorAtlas)

Use these categories for `error_type` classification:

- **agent_drift**: Agent loses persona, restarts script, enters infinite loops, forgets prior context
- **missing_skill**: Agent lacks a specific conversational technique (e.g., cannot handle evasive leads, no objection rebuttal)
- **format_error**: Agent produces wrong output format, breaks conversation structure
- **persona_mismatch**: Agent fails to adapt tone/strategy to the specific persona type
- **other**: Does not fit above categories

# Severity Scale

| Level | Criteria |
|-------|----------|
| critical | Agent fails primary objective (no booking, loses client, infinite loop) |
| high | Recurring pattern degrading quality on >30% of conversations |
| medium | Specific criteria scoring < 6 on average |
| low | Fine-tuning opportunity (criteria scoring 6-7) |

# Output Constraints

- Max **5 items** per array
- `suggestions[].text` field must be **Italian**, copy-paste ready for the voice agent prompt
- `evidence` must be an **actual quote** from the conversation data, never invented
- If data shows no clear issues, state so in summary and return empty arrays
```

#### User Message (nuovo):

```markdown
# Test Run Data

{{ JSON.stringify($json.analysis_context, null, 2) }}

# Instructions

Analyze the data above and return this exact JSON structure:

{
  "summary": "2-3 sentences: overall performance, main pattern identified, top priority action",
  "overall_assessment": "excellent|good|needs_improvement|poor",
  "top_issues": [
    {
      "title": "Short pattern name",
      "severity": "critical|high|medium|low",
      "criteria_affected": ["criteria names with low scores"],
      "description": "What is happening and why it is a problem",
      "evidence": "Direct quote from conversation summary/weaknesses in the data",
      "affected_personas": ["Persona names"],
      "error_type": "agent_drift|missing_skill|format_error|persona_mismatch|other"
    }
  ],
  "strengths": [
    {
      "title": "Short strength name",
      "criteria_affected": ["criteria names with high scores"],
      "evidence": "Direct quote from conversation summary/strengths in the data",
      "consistency": "How many conversations show this pattern (e.g. '8 out of 12')"
    }
  ],
  "criteria_analysis": {
    "strongest": "Criteria name with highest avg score",
    "weakest": "Criteria name with lowest avg score",
    "pattern": "Cross-criteria pattern description"
  },
  "suggestions": [
    {
      "id": "sug-1",
      "label": "Short description for UI checkbox",
      "priority": "high|medium|low",
      "action": "ADD|MODIFY|REMOVE",
      "section": "identity|task|guardrails|tone|examples|discovery|closing",
      "text": "Exact ITALIAN text to insert/modify in the agent's system prompt",
      "addresses": ["issue title this fixes"],
      "expected_impact": "Which criteria improves and by how much (estimate)"
    }
  ]
}

# Calibration Example

Below is a complete output example to calibrate your format and depth:

{
  "summary": "Good overall performance (avg 7.2) but with systematic weakness in discovery_socratica and recap_strategico. The agent tends to skip the qualification phase with uncooperative personas. Priority: reinforce the discovery module with specific techniques.",
  "overall_assessment": "needs_improvement",
  "top_issues": [
    {
      "title": "Shallow discovery with evasive personas",
      "severity": "high",
      "criteria_affected": ["discovery_socratica", "recap_strategico"],
      "description": "Agent does not dig deeper when the client gives vague answers, jumping directly to the pitch without qualifying the need",
      "evidence": "From Elena Esploratrice summary: 'Le domande della discovery sono state vaghe e non hanno scavato a fondo, seguendo uno script rigido'",
      "affected_personas": ["Elena Esploratrice", "Marco Indaffarato"],
      "error_type": "missing_skill"
    }
  ],
  "strengths": [
    {
      "title": "Excellent persona adaptation",
      "criteria_affected": ["adattamento_persona", "ascolto_attivo"],
      "evidence": "From Luca Vago summary: 'capacita di interagire con un profilo non analitico senza forzare, ascoltando e guidando dolcemente alla soluzione'",
      "consistency": "8 out of 12 conversations"
    }
  ],
  "criteria_analysis": {
    "strongest": "adattamento_persona (avg 8.5)",
    "weakest": "recap_strategico (avg 3.2)",
    "pattern": "The agent excels at empathy but lacks methodical sales structure"
  },
  "suggestions": [
    {
      "id": "sug-1",
      "label": "Add discovery technique for evasive clients",
      "priority": "high",
      "action": "ADD",
      "section": "discovery",
      "text": "REGOLA DISCOVERY: Se il cliente risponde in modo vago o evasivo per 2 turni consecutivi, usa una di queste tecniche: 1) Domanda con scenario concreto: 'Le faccio un esempio pratico: se domani un suo cliente importante...' 2) Domanda con dato numerico: 'Mediamente le aziende del suo settore perdono il 15% dei clienti per...' 3) Domanda diretta empatica: 'Capisco che puo sembrare una domanda generica, ma mi aiuta a...'",
      "addresses": ["Shallow discovery with evasive personas"],
      "expected_impact": "discovery_socratica +2, recap_strategico +1.5"
    }
  ]
}

---

# [OCCURRENCE 2 — FULL PROMPT REPETITION]

Repeating the critical rules for bidirectional attention coverage.

## Critical Rules

1. Every issue **MUST** include direct evidence from the data (quote from conversation summary or weaknesses)
2. Every suggestion **MUST** contain ready-to-paste **Italian text** for the agent's system prompt
3. If the agent performs well (avg_score > 7.5, no failures), focus on **optimization**: analyze the weakest criteria and suggest how to bring them up to the level of the strongest
4. If there are failures, use the **ErrorAtlas taxonomy** to classify the error type
5. Output **valid JSON only**. No markdown fences. No text outside the JSON object.

## Output Constraints

- Max **5 items** per array
- `suggestions[].text` field must be **Italian**, copy-paste ready
- `evidence` must be an **actual quote** from the data, never invented
- If data shows no clear issues, state so in summary and return empty arrays

Now analyze the test run data and return your JSON response.
```

---

### STEP 5: Update Code Parser

**Azione**: Aggiornare il Code Parser per gestire i nuovi campi dell'output.

```javascript
const raw = $input.first().json.text || $input.first().json.content || $input.first().json.message?.content || '';

let cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

const start = cleaned.indexOf('{');
const end = cleaned.lastIndexOf('}');

// Prendi test_run_id dal nodo PG Aggregate
const testRunId = $node["PG Aggregate"].json.analysis_context?.test_run_id;

if (start === -1 || end === -1) {
  return [{
    json: {
      success: false,
      error: 'NO_JSON_FOUND',
      raw: raw.substring(0, 500),
      test_run_id: testRunId
    }
  }];
}

try {
  const parsed = JSON.parse(cleaned.substring(start, end + 1));

  const required = ['summary', 'top_issues', 'suggestions', 'overall_assessment'];
  const missing = required.filter(f => !(f in parsed));

  if (missing.length > 0) {
    return [{
      json: {
        success: false,
        error: 'MISSING_FIELDS',
        missing,
        partial: parsed,
        test_run_id: testRunId
      }
    }];
  }

  // Normalize arrays
  parsed.top_issues = Array.isArray(parsed.top_issues) ? parsed.top_issues : [];
  parsed.suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  parsed.strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];

  return [{
    json: {
      success: true,
      analysis_report: parsed,
      analyzed_at: new Date().toISOString(),
      issues_count: parsed.top_issues.length,
      suggestions_count: parsed.suggestions.length,
      overall_assessment: parsed.overall_assessment,
      test_run_id: testRunId
    }
  }];

} catch (e) {
  return [{
    json: {
      success: false,
      error: 'PARSE_ERROR',
      message: e.message,
      attempted: cleaned.substring(start, Math.min(start + 300, end + 1)),
      test_run_id: testRunId
    }
  }];
}
```

---

## Flusso Finale Post-Fix

### Loop Eval (output 1):
```
splitInBatches[current item]
    ↓
Judge Agent (chainLlm) → returns $json.text (stringa)
    ↓
Parse Evaluation ← STEP 0 FIXATO (gestisce .output e .text + code fences)
    ↓
Update Battle Result ← STEP 1 (upsert completo, tutti i campi)
    ↓
Update Evaluation Complete → loop back
```

### Done Branch (output 0):
```
splitInBatches[done]
    ↓
Dedup to Single Item (Code) ← STEP 3 (opzionale, gia' implementato)
    ↓
PG Aggregate (query battle_evaluations + battle_results + personas) ← STEP 2
    ↓
LLM Analyzer (Playbook-driven prompt con Few-Shot + ErrorAtlas) ← STEP 4
    ↓
Code Parser (gestisce nuovo schema output) ← STEP 5
    ↓
If (success?)
    ├── true → Save Report (test_runs.analysis_report)
    └── false → Log error
```

## Mapping Playbook → Fix

| Tecnica Playbook | Dove Applicata | Perche' |
|------------------|----------------|---------|
| **2.1 Few-Shot ICL** | LLM Analyzer user message | Esempio concreto di output calibra formato e profondita' attesa |
| **2.2 Production Stack** | LLM Analyzer system message | Role Prompting + regole ripetute inizio/fine per attenzione bidirezionale |
| **1.1 Prompt Repetition** | LLM Analyzer system message | "REGOLE FONDAMENTALI" ripetute a fine prompt per rinforzo |
| **5 ErrorAtlas** | LLM Analyzer system message | Tassonomia `error_type` per classificazione diagnostica strutturata |
| **3.2 RAG-style** | PG Aggregate | I dati reali (evidence) vengono iniettati nel prompt come contesto fattuale |

## Rischi e Mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Query SQL complessa puo' essere lenta | La CTE eval_data fa un singolo scan; indices su test_run_id gia' presenti |
| criteria_scores ha 2 formati (object vs array) | CASE jsonb_typeof() gestisce entrambi |
| LLM output non conforme | Code Parser ha gia' fallback; aggiunto `overall_assessment` ai required fields |
| Token budget LLM per 12+ conversazioni | I summary sono ~100 parole ciascuno, totale ~1500 tokens input: OK per grok-4.1-fast |

## Checklist Implementazione

| Step | Descrizione | Status |
|------|-------------|--------|
| 0 | Fix Parse Evaluation (.output → .text + code fences) | DONE |
| 1 | Fix Upsert Update Battle Result (tutti i campi in ON CONFLICT) | TODO |
| 2 | Riscrittura PG Aggregate SQL (query battle_evaluations) | DONE (query validata su DB) |
| 3 | Nodo Dedup to Single Item | DONE |
| 4 | Riscrittura LLM Analyzer prompt (Playbook-driven) | TODO |
| 5 | Update Code Parser (nuovo schema output) | TODO |

## Test Plan

1. ~~Eseguire la query SQL di STEP 2 manualmente su Supabase~~ DONE (avg_score 6.73, criteria breakdown OK)
2. Applicare STEP 1 (upsert fix) al nodo Update Battle Result
3. Applicare STEP 4 (nuovo prompt) al nodo LLM Analyzer
4. Applicare STEP 5 (code parser update)
5. Ri-lanciare evaluator su test_run `26259dce-...` (10 eval resettate)
6. Verificare che battle_evaluations abbia score reali e campi completi
7. Verificare che analysis_report in test_runs sia popolato con il nuovo formato
8. Verificare nel dashboard che il report sia visualizzabile
