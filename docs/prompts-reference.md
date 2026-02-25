# LLM Prompts Reference

> Extracted from live n8n workflow JSONs on 2026-02-25.

---

## 1. Judge Evaluator (battles-evaluator.json)

The Judge Evaluator uses a **dynamic system prompt** built at runtime from `evaluator_configs.system_prompt_template` stored in the database. The `Build Dynamic System Prompt` code node replaces two placeholders in the template:

- `CRITERIA_SECTION_HERE` — replaced with the formatted criteria list (core + domain, with weights and scoring guides)
- `SCORES_TEMPLATE_HERE` — replaced with a JSON object of `{ criteria_name: 0 }` for each criterion

### Node: "Judge Agent" (chainLlm v1.4)

#### System Message
```
={{ $json.dynamic_system_prompt }}
```
> **Source**: Built dynamically by the "Build Dynamic System Prompt" code node. The template is loaded from `evaluator_configs.system_prompt_template` in the database, then criteria sections and score templates are injected. The actual template text lives in the DB, not in the workflow JSON.

#### User Message Template
```
CONVERSAZIONE DA VALUTARE:

{{ JSON.stringify($json.transcript) }}

CONTESTO AGGIUNTIVO:
- Persona: {{ $json.persona_name }} - {{ $json.persona_category }}
- Persona Description: {{ $json.persona_description }}
- Outcome nel DB: {{ $json.outcome }}
- Turni totali: {{ $json.turns }}

Valuta la conversazione secondo i criteri specificati.
```

#### Model Config
- **Primary Model**: Google Gemini — `{{ $json.llm_config?.judge?.model || 'models/gemini-3-flash-preview' }}`
- **Provider (primary)**: Google Gemini API (credential: "Gemini Sempre Attivo")
- **Fallback Model**: OpenRouter — `{{ $json.llm_config?.judge?.fallback?.model || 'google/gemini-3-flash-preview' }}`
- **Provider (fallback)**: OpenRouter (credential: "OpenRouter Sempre Attivo", maxRetries: 2)
- **Temperature**: Not explicitly set (defaults)
- **Max Tokens**: Not explicitly set
- **Retry**: retryOnFail=true, maxTries=2, waitBetweenTries=5000ms
- **Output Parser**: Structured Output Parser with schema:
```json
{
  "overall_score": 7.5,
  "criteria_scores": { "criteria_name": 8 },
  "conversation_outcome": "success",
  "summary": "text",
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"]
}
```

### Dynamic Prompt Build Logic (Build Dynamic System Prompt node)

The code node performs these steps:
1. Reads `evaluator_configs.system_prompt_template` from DB
2. Reads `evaluator_configs.criteria` (core + domain arrays)
3. For each criterion, formats: `[CORE/DOMAIN] N. **CRITERIA_NAME** (weight: X)` + description + scoring guide
4. Replaces `CRITERIA_SECTION_HERE` placeholder with formatted criteria
5. Replaces `SCORES_TEMPLATE_HERE` placeholder with `{"criterion_name": 0, ...}`
6. Adds weighted scoring note if any weights differ from 1.0

---

## 2. Post-Loop Analyzer (battles-evaluator.json)

### Node: "LLM Analyzer" (chainLlm v1.4)

#### System Message
None explicitly set in the workflow. The LLM Analyzer uses only a user message.

#### User Message Template
```
# Test Run Data
{{ JSON.stringify($json.analysis_context, null, 2) }}
# Instructions
Analyze and return JSON with summary, overall_assessment, top_issues, strengths, criteria_analysis, suggestions.
```

> The `analysis_context` is a large aggregated JSON object built by the "PG Aggregate" SQL node containing:
> - `overall_stats`: total, success/partial/failure counts, avg/min/max scores
> - `criteria_breakdown`: average score per criterion
> - `conversations_detail`: per-persona score, outcome, turns, summary, strengths, weaknesses

#### Model Config
- **Model**: `{{ $('Build Dynamic System Prompt').first().json.llm_config?.analyzer?.model || 'anthropic/claude-sonnet-4.5' }}`
- **Provider**: OpenRouter (credential: "OpenRouter OLD")
- **Temperature**: Not explicitly set
- **Max Tokens**: Not explicitly set

#### Expected Output Schema
```json
{
  "summary": "string",
  "overall_assessment": "string",
  "top_issues": ["string"],
  "strengths": ["string"],
  "criteria_analysis": {},
  "suggestions": ["string"]
}
```

#### Conditional Execution
The analyzer only runs when `run_analyzer` flag is true (default). Controlled by the "Run Analyzer?" If node.

---

## 3. Judge Agent 1 — Legacy (battles-evaluator.json)

### Node: "Judge Agent 1" (agent v1.6)

This appears to be a legacy/alternate evaluation path, not on the main flow.

#### System Message
```
wow
```

#### User Message Template
```
CONVERSAZIONE DA VALUTARE:


CONTESTO AGGIUNTIVO:
- Persona: {{ $json.persona_name }} - {{ $json.persona_category }}
- Persona Description: {{ $json.persona_description }}
- Outcome nel DB: {{ $json.outcome }}
- Turni totali: {{ $json.turns }}

Valuta la conversazione secondo i criteri specificati.
```

> Note: This node's user message is missing the transcript injection (`{{ JSON.stringify($json.transcript) }}` is absent). This is likely a deprecated/test node.

#### Model Config
- **Model**: `google/gemini-3-flash-preview` (via Edit Fields1 set node)
- **Provider**: OpenRouter (credential: "OpenRouter OLD")
- **Temperature**: Not explicitly set

---

## 4. Prompt Optimizer (prompt-optimizer.json)

### Node: "LLM Optimize" (chainLlm v1.9)

#### System Message
None set.

#### User Message Template
```
Sei un esperto di prompt engineering. Ottimizza il prompt basandoti sui suggerimenti e feedback. Output il nuovo prompt COMPLETO, non solo le modifiche.

PROMPT ATTUALE:
{{ $('Get Context').item.json.prompt_text }}

ANALYSIS REPORT:
{{ JSON.stringify($('Get Context').item.json.analysis_report) }}

SUGGESTIONS SELEZIONATE:
{{ JSON.stringify($('Webhook Trigger').item.json.body.selected_suggestions) }}

FEEDBACK UMANO:
{{ $('Webhook Trigger').item.json.body.human_feedback || 'Nessuno' }}

Genera il nuovo prompt ottimizzato. Rispondi SOLO con il testo del nuovo prompt, niente altro.
```

#### Model Config
- **Model**: `anthropic/claude-sonnet-4.5`
- **Provider**: OpenRouter (credential: "OpenRouter OLD")
- **Temperature**: Not explicitly set
- **Max Tokens**: Not explicitly set

#### Notes
- This is a single-mode optimizer. There is no separate "surgical" vs "full rewrite" mode in the workflow; the LLM receives all context and produces a full rewrite.
- The output is saved as a draft `prompt_versions` row with status `'draft'` and version `'{original_version}-opt'`.

---

## 5. Persona Validator (personas-validator.json)

### Node: "LLM Validation" (chainLlm v1.4)

The validation prompt is constructed in the "Prepare LLM Input" Set node and passed as the user message.

#### System Message
None set on the chainLlm node.

#### User Message Template (built in "Prepare LLM Input" node)
```
You are an expert AI persona quality evaluator.

Evaluate the following AI testing persona on three criteria and return a JSON object.

## PERSONA TO EVALUATE
{{ JSON.stringify($json, null, 2) }}

## EVALUATION CRITERIA

1. **Naturalness** (1-10): Does the persona sound like a real, believable person rather than a caricature? Consider whether the name, background, communication style, and emotional patterns feel authentic and human.

2. **Coherence** (1-10): Are the demographics, behavior patterns, and goals internally consistent? Do the persona's traits, motivations, and characteristics align with each other logically?

3. **Testability** (1-10): Will this persona produce meaningful differentiation in AI agent behavior during testing? Does it have specific enough characteristics to stress-test different agent capabilities?

## INSTRUCTIONS
Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "naturalness": <integer 1-10>,
  "coherence": <integer 1-10>,
  "testability": <integer 1-10>,
  "reasoning": "<concise explanation of scores, max 3 sentences>"
}
```

> The `$json` object contains the full persona record from DB: `id, name, personaid, description, personaprompt, category, difficulty, psychological_profile, behaviors`.

#### Model Config
- **Model**: `models/gemini-2.5-flash-preview-04-17`
- **Provider**: Google Gemini API (credential: "Gemini Sempre Attivo")
- **Temperature**: Not explicitly set
- **Max Tokens**: Not explicitly set

#### Scoring Logic (Calculate Score node)
- `weighted_score = (naturalness + coherence + testability) / 3`
- Threshold default: 7.0 (configurable via webhook input)
- Result: `validated` if >= threshold, `rejected` if below
- Updates `personas.validation_status` and `personas.validation_score` in DB

---

## 6. Persona Generator (personas-generator-v2.json)

### Node: "AI Persona Generator" (agent v1.6)

#### System Message
```
Sei un esperto di design di test personas per agenti conversazionali italiani.

Il tuo compito è generare personas realistiche che simulino clienti italiani con personalità distintive.

Ogni persona DEVE avere:
1. Nome e cognome italiano realistico
2. Categoria di comportamento (dal parametro categories)
3. Livello di difficoltà (easy, medium, hard, extreme)
4. Un personaprompt dettagliato che descriva come la persona deve comportarsi
5. Un profilo psicologico breve
6. Comportamenti specifici (array di 3-5 comportamenti)
7. L'obiettivo del test (cosa deve verificare)

Formato output richiesto per ogni persona:
{
  "name": "Nome Cognome",
  "category": "categoria",
  "difficulty": "easy|medium|hard|extreme",
  "personaprompt": "Istruzioni dettagliate per simulare questa persona...",
  "psychological_profile": "Descrizione psicologica breve...",
  "behaviors": ["comportamento 1", "comportamento 2", "comportamento 3"],
  "test_objective": "Cosa deve verificare questo test"
}

Rispondi SOLO con un array JSON valido.
```

#### User Message Template
```
Genera {{ $json.count }} personas per testare questo agente AI.

=== PROMPT DELL'AGENTE ===
{{ $json.prompt_content }}
=== FINE PROMPT ===

REQUISITI:
- Personalità italiane autentiche (nomi italiani realistici, modi di fare tipici, espressioni colloquiali)
- Mix di difficoltà: {{ JSON.stringify($json.difficulty_mix) }}
- Categorie da coprire: {{ $json.categories.join(', ') }}
- Ogni persona deve avere un obiettivo chiaro nella conversazione
- Comportamenti specifici e testabili
- Le personas devono sfidare l'agente in modi realistici

OUTPUT JSON (array di oggetti):
```

#### Model Config
- **Primary Model**: `anthropic/claude-sonnet-4.5`
- **Provider**: OpenRouter (credential: "OpenRouter account")
- **Temperature**: Not explicitly set
- **Max Tokens**: Not explicitly set
- **Output Parser**: Structured Output Parser with schema:
```json
[
  {
    "name": "Mario Rossi",
    "category": "skeptical",
    "difficulty": "medium",
    "personaprompt": "Sei Mario Rossi, un imprenditore di 55 anni...",
    "psychological_profile": "Pragmatico e diffidente...",
    "behaviors": ["Chiede sempre prove concrete", "Interrompe spesso"],
    "test_objective": "Verificare gestione obiezioni"
  }
]
```
- **Output Parser Model**: OpenAI `gpt-4.1-mini` (credential: "OpenAi def")

#### Default Criteria (from Validate Input node)
```json
{
  "difficulty_mix": { "easy": 0.3, "medium": 0.4, "hard": 0.2, "extreme": 0.1 },
  "categories": ["decision_maker", "skeptical", "busy", "interested"]
}
```

---

## 7. Battle Agent — Dynamic (test-battle-agent-v1.json)

### Node: "AI Agent" (agent v2.2)

#### System Message
```
={{ $('When Executed by Another Workflow').item.json.agentPrompt }}
```
- **Source**: DB `prompt_versions.content`
- **Injected at runtime** via the `agentPrompt` parameter passed from the Test Runner workflow
- The Test Runner reads `prompt_versions.content` from the database and passes it as the `agentPrompt` input

#### User Message Template
```
Inizia salutando se non hai memoria o continua la conversazione.
Stai facendo una chiamata, porta avanti la conversazione con output solo conversazionali.
```

#### Model Config
- **Model**: `gpt-5-mini`
- **Provider**: OpenAI (credential: "OpenAi def")
- **Temperature**: Not explicitly set
- **Max Tokens**: Not explicitly set
- **Memory**: Postgres Chat Memory (session-based, contextWindowLength: 15)
- **Session Key**: `{{ $('Init Battle').item.json.session_id }}` (format: `{test_run_id}_{persona_id}`)
- **Retry**: retryOnFail=true, maxTries=2, onError=continueErrorOutput
- **Streaming**: enabled

#### End-of-Call Detection
The agent's output is checked for end-call signals:
- `end_call`
- `arrivederci`
- `buona giornata`

If detected, the battle ends with outcome `success` (agent side).

---

## 8. Persona Simulator — Dynamic (test-battle-agent-v1.json)

### Node: "AI Persona" (agent v2.2)

#### System Message
```
={{ $('When Executed by Another Workflow').item.json.personasPrompt }}
```
- **Source**: DB `personas.personaprompt`
- **Injected at runtime** via the `personasPrompt` parameter passed from the Test Runner workflow
- The Test Runner reads `personas.personaprompt` from the database (via `Get Validated Personas` query joining `personas` + `prompt_personas` + `prompts` + `prompt_versions`)

#### User Message Template
```
={{ $('AI Agent').item.json.output }}
```
> The persona receives the AI Agent's latest output as its input, creating the back-and-forth conversation loop.

#### Model Config
- **Model**: `gpt-4.1-mini`
- **Provider**: OpenAI (credential: "OpenAi def")
- **Temperature**: Not explicitly set
- **Max Tokens**: Not explicitly set
- **Memory**: Postgres Chat Memory (session-based, contextWindowLength: 15)
- **Session Key**: `{{ $('Init Battle').item.json.session_id }}`
- **Retry**: retryOnFail=true, maxTries=2, onError=continueErrorOutput
- **Streaming**: enabled

#### End-of-Call Detection (Persona side)
The persona's output is checked for:
- `CHIAMATA_TERMINATA_PERSONA`
- `devo andare`
- `la saluto`

If detected, the battle ends with outcome `success` (persona side).

---

## 9. Test Runner (test-runner-battle.json)

The Test Runner is an **orchestration workflow** with no LLM prompts of its own. It:

1. Receives `prompt_version_id` (+ optional `evaluator_config_id`, `max_turns`, `mode`) via webhook
2. Fetches the prompt content from `prompt_versions` table
3. Fetches validated personas from `personas` table (via `prompt_personas` join)
4. Creates a `test_runs` row with status `running`
5. Loops over each persona, calling the Battle Agent workflow (`Z35cpvwXt7Xy4Mgi`) with:
   - `agentPrompt` = prompt_versions.content
   - `personasPrompt` = personas.personaprompt
   - `personasid` = persona UUID
   - `TestRunID` = test_run UUID
   - `max_turns` = configurable (default 50)
6. After all battles complete, if `evaluator_config_id` is provided, creates an evaluation row and calls the Evaluator workflow (`202JEX5zm3VlrUT8`)

### LLM Config stored in test_runs
```json
{"battleLlm": "gpt-4.1-mini", "evaluatorLlm": "claude-sonnet-4"}
```

---

## Summary Table

| # | Prompt | Workflow | Node | Model | Provider |
|---|--------|----------|------|-------|----------|
| 1 | Judge Evaluator | battles-evaluator | Judge Agent | gemini-3-flash-preview (dynamic) | Google Gemini + OpenRouter fallback |
| 2 | Post-Loop Analyzer | battles-evaluator | LLM Analyzer | claude-sonnet-4.5 (dynamic) | OpenRouter |
| 3 | Judge Agent 1 (legacy) | battles-evaluator | Judge Agent 1 | gemini-3-flash-preview | OpenRouter |
| 4 | Prompt Optimizer | prompt-optimizer | LLM Optimize | claude-sonnet-4.5 | OpenRouter |
| 5 | Persona Validator | personas-validator | LLM Validation | gemini-2.5-flash-preview-04-17 | Google Gemini |
| 6 | Persona Generator | personas-generator-v2 | AI Persona Generator | claude-sonnet-4.5 | OpenRouter |
| 7 | Battle Agent | test-battle-agent-v1 | AI Agent | gpt-5-mini | OpenAI |
| 8 | Persona Simulator | test-battle-agent-v1 | AI Persona | gpt-4.1-mini | OpenAI |
| 9 | Test Runner | test-runner-battle | (none) | N/A — orchestration only | N/A |
