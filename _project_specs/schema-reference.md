# Database Schema Reference

*Claude: READ THIS before any database work.*
*Last updated: 2026-02-18 — generated from live Supabase schema*

**Database**: Supabase (PostgreSQL)
**Project ID**: dlozxirsmrbriuklgcxq

---

## Table Overview

### Active Tables (12)

| Table | Rows | Purpose |
|-------|------|---------|
| `prompts` | 0 | Prompt definitions (name, description) |
| `prompt_versions` | 0 | Versioned prompt content |
| `personas` | 0 | Simulated customer personas |
| `prompt_personas` | 0 | Persona ↔ Prompt junction |
| `test_runs` | 3 | Test execution records |
| `battle_results` | 32 | Conversation outcomes |
| `battle_notes` | 0 | Human annotations on battles |
| `battle_evaluations` | 32 | Per-battle LLM evaluation scores |
| `evaluations` | 16 | Evaluation runs (supports A/B) |
| `evaluator_configs` | 0 | Dynamic evaluation criteria per prompt |
| `workflow_configs` | 0 | n8n webhook settings |
| `n8n_chat_histories` | 4469 | n8n Postgres Chat Memory (auto-managed) |

### Legacy Tables (5) — prefixed `old_`

| Table | Purpose | Notes |
|-------|---------|-------|
| `old_prompts` | Original prompt definitions | Replaced by `prompts` + `prompt_versions` |
| `old_testruns` | Original test runs | Replaced by `test_runs` |
| `old_conversations` | Original conversations | Replaced by `battle_results` |
| `old_turns` | Individual turn storage | Replaced by `battle_results.transcript` JSONB |
| `old_evaluationcriteria` | Original evaluation scores | Replaced by `battle_evaluations` |

> Legacy tables have 0 rows and RLS enabled. Kept for reference only.

---

## Active Schema Details

### prompts
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| prompt_name | varchar | NO | — | Prompt name |
| description | text | YES | — | Description |
| tenant_id | uuid | YES | '00000000-...' | Reserved for multi-tenant |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |

**FK inbound**: prompt_personas.prompt_id → prompts.id

### prompt_versions
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| prompt_name | varchar | NO | — | Name |
| version | varchar | NO | — | Version string |
| content | text | NO | — | Full prompt content |
| prompt_id | uuid | YES | — | FK → prompts.id (optional) |
| created_from | uuid | YES | — | Self-ref (previous version) |
| optimization_notes | text | YES | — | Notes |
| business_type | varchar | YES | — | Business context |
| status | varchar | YES | 'draft' | draft, testing, production, archived |
| legacy_promptversionid | text | YES | — | Link to old_prompts |
| avg_success_rate | numeric | YES | — | Aggregate |
| avg_score | numeric | YES | — | Aggregate |
| avg_turns | numeric | YES | — | Aggregate |
| total_test_runs | integer | YES | 0 | Count |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |

**FK inbound**: test_runs.prompt_version_id, evaluator_configs.prompt_version_id

### personas
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| personaid | text | NO | — | **PK** (legacy business ID) |
| id | uuid | YES | gen_random_uuid() | UNIQUE — used by battle_results FK |
| name | varchar | YES | — | Display name |
| description | text | YES | — | Description |
| personaprompt | text | NO | — | Full persona prompt for LLM |
| psychological_profile | text | YES | — | Detailed profile |
| category | text | YES | — | Category grouping |
| difficulty | varchar | YES | 'medium' | easy, medium, hard, extreme |
| behaviors | jsonb | YES | '[]' | Array of behavior strings |
| created_for_prompt | text | YES | — | Original prompt name |
| created_by | varchar | YES | 'human' | ai, human, template |
| validated_by_human | boolean | YES | false | Human validation flag |
| validation_status | varchar | YES | 'pending' | pending, validated |
| validation_prompt_id | uuid | YES | — | Prompt used for validation |
| feedback_notes | jsonb | YES | '[]' | Array of feedback entries |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |
| datecreated | timestamptz | NO | now() | Legacy timestamp |

**FK inbound**: battle_results.persona_id → personas.id, prompt_personas.persona_id → personas.id

### prompt_personas
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| persona_id | uuid | NO | — | FK → personas.id ON DELETE CASCADE |
| prompt_id | uuid | NO | — | FK → prompts.id |
| is_active | boolean | YES | true | Whether active |
| priority | integer | YES | 0 | Ordering |
| created_at | timestamptz | YES | now() | — |

**Note**: No explicit PK defined in DB. Has composite logical key (persona_id, prompt_id).

### test_runs
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| test_run_code | varchar | NO | — | UNIQUE, e.g., "RUN-H9C" |
| prompt_version_id | uuid | NO | — | FK → prompt_versions.id |
| status | varchar | YES | 'running' | pending, running, battles_completed, evaluating, completed, failed, aborted |
| mode | varchar | YES | 'single' | single, full_cycle_with_review |
| personas_tested | uuid[] | YES | — | Array of persona IDs |
| test_config | jsonb | YES | — | Additional config |
| overall_score | numeric | YES | — | Aggregate score |
| success_count | integer | YES | 0 | — |
| failure_count | integer | YES | 0 | — |
| timeout_count | integer | YES | 0 | — |
| failure_patterns | jsonb | YES | — | {pattern, frequency, affected_personas} |
| strengths | jsonb | YES | — | What worked |
| weaknesses | jsonb | YES | — | What needs improvement |
| analysis_report | jsonb | YES | — | LLM-generated analysis report |
| analyzed_at | timestamptz | YES | — | When LLM analysis completed |
| max_iterations | integer | YES | 1 | — |
| current_iteration | integer | YES | 1 | — |
| tool_scenario_id | varchar | YES | — | Tool mock scenario (deferred) |
| llm_config | jsonb | YES | '{}' | LLM settings tracking |
| awaiting_review | boolean | YES | false | Review mode flag |
| review_requested_at | timestamptz | YES | — | — |
| review_completed_at | timestamptz | YES | — | — |
| stopped_reason | varchar | YES | — | Why test was stopped |
| last_heartbeat_at | timestamptz | YES | now() | Last activity |
| started_at | timestamptz | YES | now() | — |
| completed_at | timestamptz | YES | — | — |

**FK inbound**: battle_results.test_run_id, evaluations.test_run_id

### battle_results
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| test_run_id | uuid | NO | — | FK → test_runs.id |
| persona_id | uuid | NO | — | FK → personas.id |
| conversation_id | integer | YES | — | Legacy ID |
| outcome | varchar | YES | — | success, partial, failure, timeout |
| score | numeric | YES | — | 0-10 (deprecated — use battle_evaluations) |
| turns | integer | YES | — | Number of turns |
| duration_seconds | integer | YES | — | Duration |
| transcript | jsonb | YES | — | Full conversation JSONB |
| evaluation_details | jsonb | YES | — | Legacy eval (deprecated — use battle_evaluations) |
| tool_session_state | jsonb | YES | '{}' | Tool call state (deferred) |
| created_at | timestamptz | YES | now() | — |

**FK inbound**: battle_evaluations.battle_result_id, battle_notes.battle_result_id

### battle_notes
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| battle_result_id | uuid | NO | — | FK → battle_results.id |
| note | text | NO | — | Annotation text |
| category | varchar | YES | — | CHECK: issue, suggestion, positive, question |
| created_by | varchar | YES | — | Who created |
| created_at | timestamptz | YES | now() | — |

### evaluator_configs
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | varchar | NO | — | Config name |
| version | varchar | NO | — | Config version |
| description | text | YES | — | Description |
| prompt_version_id | uuid | NO | — | FK → prompt_versions.id |
| criteria | jsonb | NO | — | Array of {name, weight, description, scoring_guide} |
| system_prompt_template | text | NO | — | LLM system prompt for Judge Agent |
| success_config | jsonb | YES | '{"min_score": 7}' | Success threshold |
| is_promoted | boolean | YES | false | Active config flag |
| status | varchar | YES | 'draft' | draft, active, deprecated |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |

**FK inbound**: evaluations.evaluator_config_id

### evaluations
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| test_run_id | uuid | NO | — | FK → test_runs.id ON DELETE CASCADE |
| evaluator_config_id | uuid | NO | — | FK → evaluator_configs.id |
| status | varchar | YES | 'pending' | pending, running, completed, failed |
| is_promoted | boolean | YES | false | Promoted = official evaluation |
| overall_score | numeric | YES | — | Aggregate score |
| success_count | integer | YES | 0 | — |
| failure_count | integer | YES | 0 | — |
| partial_count | integer | YES | 0 | — |
| started_at | timestamptz | YES | — | — |
| completed_at | timestamptz | YES | — | — |
| error_message | text | YES | — | Error details |
| triggered_by | varchar | YES | — | auto, manual, api, migration |
| created_at | timestamptz | YES | now() | — |

**Constraints**: UNIQUE(test_run_id, evaluator_config_id)
**FK inbound**: battle_evaluations.evaluation_id

### battle_evaluations
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| evaluation_id | uuid | NO | — | FK → evaluations.id ON DELETE CASCADE |
| battle_result_id | uuid | NO | — | FK → battle_results.id ON DELETE CASCADE |
| score | numeric | YES | — | Overall score for this battle |
| criteria_scores | jsonb | YES | — | Per-criteria scores |
| outcome | varchar | YES | — | success, partial, failure, timeout, error |
| summary | text | YES | — | LLM evaluation summary |
| strengths | jsonb | YES | '[]' | Array of strengths |
| weaknesses | jsonb | YES | '[]' | Array of weaknesses |
| raw_response | jsonb | YES | — | Full LLM response for debugging |
| evaluated_at | timestamptz | YES | now() | — |
| evaluator_version | varchar | YES | — | Version used |

**Constraints**: UNIQUE(evaluation_id, battle_result_id)

### workflow_configs
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| workflow_type | varchar | NO | — | UNIQUE — test_runner, evaluator, etc. |
| webhook_url | text | NO | — | n8n webhook URL |
| is_active | boolean | YES | true | — |
| config | jsonb | YES | '{}' | Extra config (e.g., max_turns) |
| last_triggered_at | timestamptz | YES | — | — |
| last_success_at | timestamptz | YES | — | — |
| total_executions | integer | YES | 0 | — |
| created_at | timestamptz | YES | now() | — |
| updated_at | timestamptz | YES | now() | — |

### n8n_chat_histories
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | NO | auto-increment | PK |
| session_id | varchar | NO | — | Format: {test_run_id}_{persona_id} |
| message | jsonb | NO | — | Chat message (role + content) |

> Auto-managed by n8n Postgres Chat Memory nodes. Do not modify directly.

---

## Relationships

```
prompts 1:N prompt_personas (prompt_id)
prompts ... prompt_versions (via prompt_name, loosely coupled)

prompt_versions 1:N test_runs (prompt_version_id)
prompt_versions 1:N evaluator_configs (prompt_version_id)
prompt_versions 1:1 prompt_versions (created_from, self-ref)

personas 1:N prompt_personas (persona_id)
personas 1:N battle_results (persona_id via uuid)

test_runs 1:N battle_results (test_run_id)
test_runs 1:N evaluations (test_run_id)

battle_results 1:N battle_evaluations (battle_result_id)
battle_results 1:N battle_notes (battle_result_id)

evaluator_configs 1:N evaluations (evaluator_config_id)
evaluations 1:N battle_evaluations (evaluation_id)
```

---

## Indexes

### Core
- `idx_prompt_versions_name` ON prompt_versions(prompt_name)
- `idx_prompt_versions_status` ON prompt_versions(status)
- `idx_test_runs_version` ON test_runs(prompt_version_id)
- `idx_test_runs_status` ON test_runs(status)
- `idx_test_runs_analyzed_at` ON test_runs(analyzed_at)
- `idx_battle_results_test_run` ON battle_results(test_run_id)
- `idx_battle_results_persona` ON battle_results(persona_id)

### Junction
- `idx_prompt_personas_prompt_name` ON prompt_personas(prompt_name)
- `idx_prompt_personas_persona_id` ON prompt_personas(persona_id)

### Evaluator
- `idx_evaluator_promoted` ON evaluator_configs(prompt_version_id, is_promoted) WHERE is_promoted = true
- `idx_evaluation_promoted` ON evaluations(test_run_id, is_promoted) WHERE is_promoted = true
- `idx_evaluation_pending` ON evaluations(status) WHERE status = 'pending'
- `idx_battle_eval_evaluation` ON battle_evaluations(evaluation_id)
- `idx_evaluations_test_run_id` ON evaluations(test_run_id)
- `idx_evaluations_created_at` ON evaluations(created_at DESC)
- `idx_battle_evaluations_evaluated_at` ON battle_evaluations(evaluated_at DESC)

---

## RLS Policies

| Table | RLS | Notes |
|-------|-----|-------|
| prompts | OFF | — |
| prompt_versions | OFF | — |
| personas | ON | SELECT for anon, authenticated |
| prompt_personas | ON | SELECT for anon, authenticated |
| test_runs | OFF | — |
| battle_results | OFF | — |
| battle_notes | ON | — |
| evaluator_configs | OFF | — |
| evaluations | OFF | — |
| battle_evaluations | OFF | — |
| workflow_configs | ON | — |
| n8n_chat_histories | ON | — |
| old_* tables | ON | Legacy, all have RLS enabled |

---

## Migration History

| # | File | Purpose |
|---|------|---------|
| 001 | version_centric_schema.sql | Core tables, views, triggers |
| 002 | prd_v2_4_schema.sql | PRD v2.4 additions (workflow_configs, battle_notes, modes) |
| 003 | personas_performance_view.sql | Legacy dashboard view |
| 004 | analysis_report_columns.sql | analysis_report + analyzed_at on test_runs |
| 005 | fix_prompt_personas.sql | prompt_personas junction table |
| 006 | create_evaluations_schema.sql | evaluator_configs, evaluations, battle_evaluations |
| 007 | insert_legacy_evaluator.sql | Seed legacy sales-evaluator config |
| 008 | migrate_test_runs_to_evaluations.sql | Backfill evaluations from test_runs |
| 009 | migrate_battle_results_to_evaluations.sql | Backfill battle_evaluations from evaluation_details |
| 010 | fix_evaluator_fk_and_indexes.sql | Fix prompt_id → prompt_version_id, add indexes |
| 011 | (applied via n8n/dashboard) | Dashboard view prefers promoted evaluations |
