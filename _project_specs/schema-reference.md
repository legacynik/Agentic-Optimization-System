# Database Schema Reference

*Claude: READ THIS before any database work.*

**Database**: Supabase (PostgreSQL)
**Project ID**: dlozxirsmrbriuklgcxq

---

## Schema Overview

This project has **two schema versions**:

1. **Legacy Schema** (`scripts/01-create-personas-performance-view.sql`) - Original simple schema
2. **Version-Centric Schema** (`supabase/migrations/001_version_centric_schema.sql`) - New expanded schema

---

## Legacy Schema (Original Dashboard)

### test_runs
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| testrunid | text | NO | - | Business identifier |
| agentversion | text | YES | - | Agent version tested |
| promptversionid | text | YES | - | Prompt version ID |
| test_date | timestamp | YES | NOW() | When test ran |

### personas
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| personaid | text | NO | - | Business identifier, UNIQUE |
| persona_description | text | NO | - | Description |

### conversations
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| conversationid | text | NO | - | Business identifier, UNIQUE |
| testrunid | text | NO | - | FK → test_runs.testrunid |
| personaid | text | NO | - | FK → personas.personaid |
| transcript | text | YES | - | Full conversation text |
| outcome | text | YES | - | CHECK: 'success', 'partial', 'failure' |
| score | numeric(3,1) | YES | - | 0-10 scale |
| summary | text | YES | - | Conversation summary |
| human_notes | text | YES | - | Manual annotations |
| turns | integer | YES | - | Number of turns |
| created_at | timestamp | YES | NOW() | Creation time |

### evaluation_criteria
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| conversationid | text | NO | - | FK → conversations.conversationid |
| criteria_name | text | NO | - | e.g., 'Accuracy', 'Helpfulness', 'Clarity' |
| score | numeric(3,1) | YES | - | 0-10 scale |

---

## Version-Centric Schema (New)

### prompt_versions
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| prompt_name | varchar(255) | NO | - | Name of the prompt |
| version | varchar(50) | NO | - | Version string |
| content | text | NO | - | Full prompt content |
| created_from | uuid | YES | - | FK → prompt_versions.id (self-ref) |
| optimization_notes | text | YES | - | Notes about optimizations |
| business_type | varchar(100) | YES | - | Business context |
| status | varchar(50) | YES | 'draft' | 'draft', 'testing', 'production', 'archived' |
| avg_success_rate | decimal(5,2) | YES | - | Aggregate metric |
| avg_score | decimal(3,1) | YES | - | Aggregate metric |
| avg_turns | decimal(5,1) | YES | - | Aggregate metric |
| total_test_runs | integer | YES | 0 | Count |
| created_at | timestamptz | YES | NOW() | - |
| updated_at | timestamptz | YES | NOW() | - |

**Constraints**: UNIQUE(prompt_name, version)

### personas (Version-Centric)
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | varchar(255) | NO | - | Persona name |
| description | text | YES | - | Description |
| psychological_profile | text | YES | - | Detailed profile |
| category | varchar(100) | YES | - | Category grouping |
| difficulty | varchar(50) | YES | - | 'easy', 'medium', 'hard', 'extreme' |
| behaviors | jsonb | YES | - | Array of behavior strings |
| created_for_prompt | varchar(255) | YES | - | Original prompt |
| created_by | varchar(50) | YES | - | 'ai', 'human', 'template' |
| validated_by_human | boolean | YES | FALSE | Human validation flag |
| validation_notes | text | YES | - | Validation notes |
| created_at | timestamptz | YES | NOW() | - |
| updated_at | timestamptz | YES | NOW() | - |

### test_runs (Version-Centric)
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| test_run_code | varchar(100) | NO | - | UNIQUE, e.g., "TEST-2024-001" |
| prompt_version_id | uuid | NO | - | FK → prompt_versions.id |
| personas_tested | uuid[] | YES | - | Array of persona IDs |
| test_config | jsonb | YES | - | Additional config |
| overall_score | decimal(3,1) | YES | - | Aggregate score |
| success_count | integer | YES | - | Success count |
| failure_count | integer | YES | - | Failure count |
| timeout_count | integer | YES | - | Timeout count |
| failure_patterns | jsonb | YES | - | {pattern, frequency, affected_personas} |
| strengths | jsonb | YES | - | What worked well |
| weaknesses | jsonb | YES | - | What needs improvement |
| started_at | timestamptz | YES | NOW() | - |
| completed_at | timestamptz | YES | - | Completion time |
| status | varchar(50) | YES | 'running' | 'running', 'completed', 'failed' |

### battle_results
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| test_run_id | uuid | NO | - | FK → test_runs.id |
| persona_id | uuid | NO | - | FK → personas.id |
| conversation_id | integer | YES | - | Legacy ID if needed |
| outcome | varchar(50) | YES | - | 'success', 'partial', 'failure', 'timeout' |
| score | decimal(3,1) | YES | - | 0-10 scale |
| turns | integer | YES | - | Number of turns |
| duration_seconds | integer | YES | - | Duration |
| transcript | jsonb | YES | - | Full conversation |
| evaluation_details | jsonb | YES | - | Criteria scores |
| created_at | timestamptz | YES | NOW() | - |

### optimization_history
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| from_version_id | uuid | YES | - | FK → prompt_versions.id |
| to_version_id | uuid | YES | - | FK → prompt_versions.id |
| optimization_type | varchar(50) | YES | - | 'ai_suggested', 'manual', 'a_b_test' |
| changes_made | jsonb | YES | - | {what, why, expected_impact} |
| confidence_score | decimal(3,2) | YES | - | Confidence level |
| risk_assessment | varchar(20) | YES | - | 'low', 'medium', 'high' |
| performance_delta | jsonb | YES | - | {score_change, success_rate_change, etc} |
| was_successful | boolean | YES | - | Success flag |
| created_at | timestamptz | YES | NOW() | - |

### persona_validations
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| persona_id | uuid | YES | - | FK → personas.id |
| prompt_version_id | uuid | YES | - | FK → prompt_versions.id |
| validation_status | varchar(50) | YES | - | 'pending', 'approved', 'rejected', 'modified' |
| reviewer_notes | text | YES | - | Notes |
| modifications_made | jsonb | YES | - | Modifications |
| validated_at | timestamptz | YES | - | Validation time |
| validated_by | varchar(255) | YES | - | Who validated |

---

## Views

### personas_performance (Legacy)
Main dashboard view - aggregates conversation data with evaluation criteria.

```sql
SELECT
  c.conversationid,
  c.personaid,
  p.persona_description,
  c.testrunid,
  tr.promptversionid,
  tr.agentversion,
  c.score as avg_score,
  c.turns as avg_turns,
  tr.test_date,
  -- evaluation_criteria as JSONB array
  -- conversations_summary as JSONB object
  c.transcript
FROM conversations c
LEFT JOIN personas p ON c.personaid = p.personaid
LEFT JOIN test_runs tr ON c.testrunid = tr.testrunid;
```

### version_performance_summary (Version-Centric)
Aggregates prompt version metrics with test counts.

### persona_performance_by_version (Version-Centric)
Shows persona performance broken down by prompt version.

---

## Enums / Check Constraints

| Field | Values |
|-------|--------|
| conversations.outcome | 'success', 'partial', 'failure' |
| battle_results.outcome | 'success', 'partial', 'failure', 'timeout' |
| prompt_versions.status | 'draft', 'testing', 'production', 'archived' |
| personas.difficulty | 'easy', 'medium', 'hard', 'extreme' |
| personas.created_by | 'ai', 'human', 'template' |
| persona_validations.validation_status | 'pending', 'approved', 'rejected', 'modified' |
| optimization_history.optimization_type | 'ai_suggested', 'manual', 'a_b_test' |
| optimization_history.risk_assessment | 'low', 'medium', 'high' |
| test_runs.status | 'running', 'completed', 'failed' |

---

## TypeScript Types (lib/supabase.ts)

```typescript
export type PersonaPerformanceRow = {
  conversationid: number
  personaid: string
  persona_description: string
  persona_category: string
  testrunid: string
  promptversionid: string
  agentversion: string
  testrun_notes: string
  avg_score: number
  avg_turns: number
  test_date: string
  all_criteria_details: Array<{
    criteria_name: string
    score: number
    conversation_id: number
  }>
  conversations_summary: Array<{
    conversationid: number
    outcome: "success" | "partial" | "failure"
    score: number
    summary: string
    human_notes: string
    turns: number
    appointment_booked?: boolean
  }>
  conversations_transcripts: string
}
```

---

## Indexes

### Legacy Schema
- `idx_conversations_testrunid` ON conversations(testrunid)
- `idx_conversations_personaid` ON conversations(personaid)
- `idx_evaluation_criteria_conversationid` ON evaluation_criteria(conversationid)

### Version-Centric Schema
- `idx_prompt_versions_name` ON prompt_versions(prompt_name)
- `idx_prompt_versions_status` ON prompt_versions(status)
- `idx_test_runs_version` ON test_runs(prompt_version_id)
- `idx_test_runs_status` ON test_runs(status)
- `idx_battle_results_test_run` ON battle_results(test_run_id)
- `idx_battle_results_persona` ON battle_results(persona_id)

---

## Triggers

### update_version_metrics_trigger
Fires AFTER UPDATE OF status ON test_runs.
Updates prompt_versions aggregate metrics when test run completes.

---

## Relationships

```
Legacy:
  test_runs 1:N conversations (testrunid)
  personas 1:N conversations (personaid)
  conversations 1:N evaluation_criteria (conversationid)

Version-Centric:
  prompt_versions 1:N test_runs (prompt_version_id)
  prompt_versions 1:1 prompt_versions (created_from, self-ref)
  test_runs 1:N battle_results (test_run_id)
  personas 1:N battle_results (persona_id)
  prompt_versions 1:N optimization_history (from_version_id, to_version_id)
  personas 1:N persona_validations (persona_id)
  prompt_versions 1:N persona_validations (prompt_version_id)
```

---

## RLS Policies

```sql
GRANT SELECT ON personas_performance TO anon, authenticated;
```

---

## Migration Notes

- Legacy schema uses TEXT ids (testrunid, personaid, conversationid)
- Version-centric schema uses UUID ids
- Both schemas can coexist but have different table structures
- TypeScript types in `lib/supabase.ts` currently match legacy schema view
