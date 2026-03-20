---
phase: 7
name: "Retell Auto Research Integration"
status: pending
created: 2026-03-20
last_updated: 2026-03-20
last_tested: null
tested_by: null
pending_items: 28
blockers: [retell-api-key]
---

# Phase 7: Retell Auto Research Integration

> Integrazione Retell AI + paradigma Auto Research (Karpathy) per self-improving voice agents con dashboard white-label per clienti.

## Overview

Costruire un servizio FastAPI che implementa il loop Auto Research su dati reali di chiamate Retell:
pull chiamate → valutazione automatica → metriche giornaliere → report Slack → suggerimenti ottimizzazione → human review → push prompt aggiornato a Retell.

Il servizio condivide il DB Supabase con il dashboard Next.js esistente, che viene esteso con una sezione white-label per clienti.

## Architettura

```
┌──────────────────────────────────────────────────────┐
│            Next.js Dashboard (UI esistente)            │
│                                                        │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │  Synthetic    │  │  Production   │  │  Client    │ │
│  │  Testing      │  │  Monitoring   │  │  White     │ │
│  │  (n8n)        │  │  (Retell)     │  │  Label     │ │
│  └──────┬───────┘  └──────┬────────┘  └─────┬──────┘ │
└─────────┼─────────────────┼──────────────────┼────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌──────────────────────────────────────────────────────┐
│               Supabase (DB condiviso)                 │
│  Tabelle esistenti + retell_agents, daily_metrics,    │
│  flagged_calls, clients, retell_call_results          │
└───────────────────────┬──────────────────────────────┘
                        │
             ┌──────────▼──────────────┐
             │   FastAPI Service (NEW)  │
             │                          │
             │  • /sync     — pull calls│
             │  • /evaluate — judge     │
             │  • /report   — Slack     │
             │  • /optimize — push      │
             │  • cron      — daily     │
             └──────────────────────────┘
```

---

## Track A: FastAPI Service + Retell Data Ingestion

### Must Have

- [ ] REQ-A.1: FastAPI project setup — clean architecture (domain/services, infrastructure/repositories, api/routers)
- [ ] REQ-A.2: Retell API client — `retell-python-sdk` wrapper che fa list/get calls con filtri
- [ ] REQ-A.3: `POST /api/sync` — pull ultime 24h di chiamate per un agent_id
  ```python
  # Retell SDK call
  calls = client.call.list(
    filter_criteria={
      "agent_id": [agent_id],
      "start_timestamp_begin": yesterday_ts,
      "start_timestamp_end": now_ts,
    },
    sort_order="descending",
    limit=200,
  )
  # Per ogni call: client.call.retrieve(call_id) per transcript completo
  ```
- [ ] REQ-A.4: Mapping Retell call → `retell_call_results` table
  ```
  retell_call_results:
    id uuid PK
    retell_call_id text UNIQUE
    retell_agent_id text
    client_id uuid FK → clients
    call_type text                    -- phone_call, web_call
    direction text                    -- inbound, outbound
    from_number text
    to_number text
    call_status text                  -- completed, transferred, voicemail
    disconnection_reason text         -- user_hangup, agent_hangup, timeout
    transcript jsonb                  -- transcript_object from Retell
    transcript_with_tool_calls jsonb  -- includes tool call results
    call_analysis jsonb               -- Retell's built-in analysis
    metadata jsonb                    -- dynamic variables, customer info
    start_timestamp bigint
    end_timestamp bigint
    duration_ms integer
    recording_url text
    -- Evaluation fields (filled by our evaluator)
    evaluation_score numeric
    evaluation_outcome text           -- success, partial, failure
    evaluation_details jsonb          -- criteria scores
    flagged boolean DEFAULT false
    flag_reason text
    created_at timestamptz DEFAULT now()
  ```
- [ ] REQ-A.5: Auto-create `test_run` per batch giornaliero
  - code: `AUTO-{agent_name}-{YYYY-MM-DD}`
  - status: `running` → `completed` dopo evaluation
  - Collega a prompt_version corrispondente dell'agente
- [ ] REQ-A.6: Supabase async client per reads/writes
- [ ] REQ-A.7: Config via environment variables
  ```
  RETELL_API_KEY=xxx
  SUPABASE_URL=xxx
  SUPABASE_SERVICE_KEY=xxx  # service role for backend
  SLACK_WEBHOOK_URL=xxx
  SYNC_CRON_SCHEDULE=0 0 * * *  # midnight daily
  ```

### Nice to Have

- [ ] OPT-A.1: Retell webhook handler (`call_ended`, `call_analyzed`) per sync real-time
- [ ] OPT-A.2: Pagination per sync > 200 calls/day

---

## Track B: Auto Evaluation Loop

### Must Have

- [ ] REQ-B.1: `POST /api/evaluate` — valuta batch di chiamate Retell
  - Input: `test_run_id` o `date` + `agent_id`
  - Riusa la stessa logica dell'evaluator n8n in Python:
    1. Carica evaluator_config (criteri, system prompt template)
    2. Build dynamic system prompt con criteri
    3. Judge ogni chiamata (Gemini 3 Flash primary, OpenRouter fallback)
    4. Salva scores in `retell_call_results.evaluation_*`
    5. Aggrega in evaluation record
- [ ] REQ-B.2: LLM service abstraction (multi-provider)
  ```python
  class LLMService:
    async def judge(self, transcript, criteria, system_prompt) -> EvalResult
    async def analyze(self, aggregated_data) -> AnalysisReport
    async def suggest(self, report, current_prompt) -> list[Suggestion]
  ```
  - Providers: OpenAI, Anthropic (Claude), Google (Gemini) via config
- [ ] REQ-B.3: Post-loop analyzer (Claude Sonnet) — genera analysis_report
  - Stessi campi: summary, top_issues, strengths, criteria_analysis, suggestions
  - Salva in test_runs.analysis_report
- [ ] REQ-B.4: Flag chiamate problematiche automaticamente
  ```python
  FLAG_RULES = [
    ("human_request", r"parl.*con.*persona|operatore|umano"),
    ("tool_failure", lambda c: any(tc["status"]=="error" for tc in c.tool_calls)),
    ("negative_sentiment", lambda c: c.call_analysis.get("user_sentiment") == "Negative"),
    ("short_call", lambda c: c.duration_ms < 15000),
    ("timeout", lambda c: c.disconnection_reason == "timeout"),
  ]
  ```
- [ ] REQ-B.5: Daily metrics calculation + store
  ```
  daily_metrics:
    id uuid PK
    retell_agent_id text
    client_id uuid FK
    date date UNIQUE(retell_agent_id, date)
    total_calls integer
    avg_duration_ms integer
    booking_rate numeric          -- calls where booking tool succeeded / total
    fallback_rate numeric         -- calls transferred to human / total
    tool_failure_rate numeric     -- tool calls failed / total tool calls
    avg_sentiment_score numeric   -- from Retell call_analysis
    avg_evaluation_score numeric  -- from our evaluator
    success_count integer
    failure_count integer
    flagged_count integer
    created_at timestamptz DEFAULT now()
  ```

### Nice to Have

- [ ] OPT-B.1: Criteri di valutazione specifici per Retell (beyond synthetic)
- [ ] OPT-B.2: Evidence verification (T12) su chiamate reali

---

## Track C: Reporting + Optimization

### Must Have

- [ ] REQ-C.1: Slack daily report via webhook
  ```
  📊 *Daily Report — {agent_name} — {date}*

  *Metriche:*
  • Chiamate: {total} | Booking rate: {rate}%
  • Fallback rate: {rate}% | Tool failures: {count}
  • Avg score: {score}/10 | Sentiment: {emoji}

  *Trend (vs ieri):*
  • Booking: {delta}% {arrow} | Score: {delta} {arrow}

  🚩 *Chiamate flaggate: {count}*
  • {reason}: {call_link} ({excerpt})

  💡 *Suggerimenti AI:*
  1. {suggestion_1}
  2. {suggestion_2}
  ```
- [ ] REQ-C.2: `POST /api/optimize` — genera prompt ottimizzato
  - Input: test_run_id, selected_suggestions[], human_feedback
  - Riusa optimizer logic: Claude Sonnet genera nuovo prompt
  - Salva draft in prompt_versions (status: 'draft')
- [ ] REQ-C.3: `POST /api/push-to-retell` — applica prompt a Retell agent
  ```python
  # Update Retell agent prompt
  client.agent.update(
    agent_id=agent_id,
    response_engine={
      "type": "retell-llm",
      "llm_id": llm_id,
    }
  )
  # Or update LLM directly
  client.llm.update(
    llm_id=llm_id,
    general_prompt=new_prompt,
  )
  ```
  - Salva snapshot pre-change
  - Registra in optimization_history
- [ ] REQ-C.4: Regression detection — dopo 48h dal push, confronta metriche
  - Se booking_rate scende > threshold → alert Slack + auto-flag
  - Opzionale: auto-revert al prompt precedente

### Nice to Have

- [ ] OPT-C.1: Email report alternativo a Slack
- [ ] OPT-C.2: Auto-revert con rollback Retell agent prompt

---

## Track D: DB Schema + Multi-tenant

### Must Have

- [ ] REQ-D.1: Migration `016_retell_integration.sql`
  ```sql
  -- Clienti
  CREATE TABLE clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar NOT NULL,
    slug varchar UNIQUE NOT NULL,
    branding jsonb DEFAULT '{}',  -- logo_url, primary_color, company_name
    contact_email text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
  );

  -- Agenti Retell mappati a clienti
  CREATE TABLE retell_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    retell_agent_id text UNIQUE NOT NULL,
    retell_llm_id text,
    client_id uuid REFERENCES clients(id),
    agent_name varchar NOT NULL,
    prompt_version_id uuid REFERENCES prompt_versions(id),
    retell_config jsonb DEFAULT '{}',  -- voice, language, etc.
    is_active boolean DEFAULT true,
    last_synced_at timestamptz,
    created_at timestamptz DEFAULT now()
  );

  -- Risultati chiamate Retell
  CREATE TABLE retell_call_results ( ... );  -- vedi REQ-A.4

  -- Metriche giornaliere
  CREATE TABLE daily_metrics ( ... );  -- vedi REQ-B.5

  -- Indici
  CREATE INDEX idx_retell_calls_agent ON retell_call_results(retell_agent_id);
  CREATE INDEX idx_retell_calls_date ON retell_call_results(start_timestamp);
  CREATE INDEX idx_retell_calls_flagged ON retell_call_results(flagged) WHERE flagged = true;
  CREATE INDEX idx_daily_metrics_agent_date ON daily_metrics(retell_agent_id, date);
  CREATE INDEX idx_retell_agents_client ON retell_agents(client_id);
  ```
- [ ] REQ-D.2: Supabase RLS per multi-tenant (client vede solo i suoi agenti/chiamate)
- [ ] REQ-D.3: Seed data per primo cliente + agente test

---

## Track E: White-Label Client Dashboard

### Must Have

- [ ] REQ-E.1: Route `/clients/[slug]` — dashboard client con branding
- [ ] REQ-E.2: Metrics overview — KPI cards (calls, booking rate, score, trend)
- [ ] REQ-E.3: Score trend chart — daily_metrics over time (7d, 30d, 90d)
- [ ] REQ-E.4: Recent calls table — con outcome, duration, score, play recording
- [ ] REQ-E.5: Flagged calls section — problemi con excerpt + recording link
- [ ] REQ-E.6: Auth semplice — token-based o Supabase auth con RLS

### Nice to Have

- [ ] OPT-E.1: Custom domain per cliente
- [ ] OPT-E.2: Export metriche CSV/PDF
- [ ] OPT-E.3: Transcript viewer per singola chiamata

---

## Cron Job: Daily Auto Research Loop

```python
# Eseguito ogni notte a mezzanotte (o configurabile)
async def daily_auto_research_loop():
    agents = await repo.get_active_retell_agents()

    for agent in agents:
        # 1. SYNC — Pull ultime 24h
        calls = await retell_service.sync_calls(agent.retell_agent_id, hours=24)

        # 2. TEST RUN — Crea record batch
        test_run = await test_run_service.create_auto(agent, calls)

        # 3. EVALUATE — Judge ogni chiamata
        await evaluation_service.evaluate_batch(test_run.id)

        # 4. ANALYZE — Report aggregato
        report = await evaluation_service.analyze(test_run.id)

        # 5. METRICS — Calcola e salva
        metrics = await metrics_service.compute_daily(agent, calls, report)

        # 6. FLAG — Identifica problemi
        flagged = await flagging_service.flag_calls(calls)

        # 7. REPORT — Slack digest
        await slack_service.send_daily_report(agent, metrics, flagged, report)

        # 8. SUGGEST — Genera suggerimenti
        await optimization_service.generate_suggestions(test_run.id, report)
```

---

## Implementation Reference

| Component | File Path | Status |
|-----------|-----------|--------|
| FastAPI main | `services/auto-research/app/main.py` | ⏳ |
| Retell client | `services/auto-research/infrastructure/retell/client.py` | ⏳ |
| LLM service | `services/auto-research/domain/services/llm_service.py` | ⏳ |
| Evaluation service | `services/auto-research/domain/services/evaluation_service.py` | ⏳ |
| Slack reporter | `services/auto-research/infrastructure/slack/reporter.py` | ⏳ |
| Migration 016 | `supabase/migrations/016_retell_integration.sql` | ⏳ |
| Client dashboard | `app/clients/[slug]/page.tsx` | ⏳ |
| Client metrics API | `app/api/clients/[slug]/metrics/route.ts` | ⏳ |

## Acceptance Criteria

```gherkin
GIVEN un agente Retell attivo con chiamate nelle ultime 24h
WHEN il cron giornaliero esegue
THEN le chiamate sono sincronizzate, valutate, metriche calcolate, e report Slack inviato

GIVEN un report con suggerimenti approvati dall'umano
WHEN l'utente clicca "Push to Retell"
THEN il prompt dell'agente Retell viene aggiornato e un record optimization_history creato

GIVEN un cliente con slug "nova-dental"
WHEN accede a /clients/nova-dental
THEN vede dashboard branded con metriche dei suoi agenti
```

### Criteria Checklist
- [ ] AC-7.1: Sync 24h di chiamate Retell → DB in < 60s per 200 calls
- [ ] AC-7.2: Evaluation batch completa in < 5min per 100 calls
- [ ] AC-7.3: Slack report arriva entro 10min dal cron
- [ ] AC-7.4: Push to Retell aggiorna il prompt dell'agente correttamente
- [ ] AC-7.5: Client dashboard carica metriche in < 2s
- [ ] AC-7.6: Regression detection trigger entro 48h se score cala
- [ ] AC-7.7: RLS impedisce a client A di vedere dati di client B

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Retell API key | Required | ⏳ Da configurare |
| Slack webhook URL | Required | ⏳ Da configurare |
| Supabase service role key | Required | ⏳ Da configurare |
| Fix 3 bug dashboard (E2E flow) | Recommended | ⏳ Pending |
| Evaluator criteria (esistenti) | Reusable | ✅ 15 criteri in DB |
| Optimizer logic (esistente) | Reusable | ✅ Circuit breaker + regression |

## Effort Estimate

| Track | Cosa | Settimane |
|-------|------|-----------|
| A | FastAPI + Retell sync | 1 |
| B | Auto evaluation loop | 1 |
| C | Slack + optimization + push | 1 |
| D | DB schema + multi-tenant | 0.5 |
| E | White-label client dashboard | 2 |
| — | Testing + debug + polish | 1 |
| **TOTALE** | | **~6 settimane** |

## Tech Stack (FastAPI Service)

```
Python 3.12+
├── fastapi + uvicorn          — API framework
├── retell-ai (retell-python-sdk) — Retell API client
├── supabase-py                — DB async client
├── openai                     — GPT models
├── anthropic                  — Claude models
├── google-generativeai        — Gemini models
├── httpx                      — HTTP client (OpenRouter, webhooks)
├── apscheduler                — Cron scheduler
├── pydantic-settings          — Config management
├── structlog                  — Structured logging
└── pytest + pytest-asyncio    — Testing
```

## Notes

- Il servizio FastAPI è **standalone** — deploy separato (Railway, Fly.io, o Docker)
- Condivide lo **stesso DB Supabase** del dashboard Next.js
- La logica di valutazione è una **riscrittura in Python** dell'evaluator n8n (non dipende da n8n)
- Se in futuro si migra tutto n8n → Python, questo servizio diventa la base
- Il paradigma Auto Research di Karpathy si mappa 1:1:
  - `pair` = Retell API sync
  - `programm` = evaluator criteria + optimizer config
  - `train` = daily loop con human-in-the-loop

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-03-20 | Created spec from audit + Auto Research analysis | claude |

---

*Token count target: <5,000 (spec estesa per progetto multi-track)*
