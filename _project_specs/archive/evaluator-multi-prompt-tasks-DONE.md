# Evaluator Multi-Prompt - Implementation Tasks

**Parent Spec**: `evaluator-multi-prompt.md`
**Epic**: E1 - Schema DB + Migration
**Total Effort**: 3h
**Parallelization**: 4 waves

---

## Task Dependencies Graph

```
Wave 1 (parallel):
┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐
│   E1.1      │  │   E1.2      │  │      E1.3           │
│ evaluator_  │  │ evaluations │  │ battle_evaluations  │
│  configs    │  │             │  │                     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────────────┘
       │                │                │
       └────┬───────────┴────────────────┘
            │
Wave 2:     ↓
       ┌─────────────┐
       │   E1.4      │
       │   Legacy    │
       │  Evaluator  │
       └──────┬──────┘
              │
Wave 3:       ↓
       ┌─────────────┐
       │   E1.5      │
       │  Migrate    │
       │ test_runs   │
       └──────┬──────┘
              │
Wave 4:       ↓
       ┌─────────────┐
       │   E1.6      │
       │  Migrate    │
       │battle_results│
       └─────────────┘
```

---

## Wave 1: Create Tables (PARALLEL)

### E1.1: Create evaluator_configs table

**Model**: `haiku` (simple schema creation)
**Dependencies**: None
**Effort**: 20 min
**Can run in parallel with**: E1.2, E1.3

**Prompt**:
```
Create a new Supabase migration file for the evaluator_configs table.

SPEC REFERENCE: _project_specs/specs/evaluator-multi-prompt.md (section "Table: evaluator_configs")

TASK:
1. Create migration file: supabase/migrations/XXX_create_evaluator_configs.sql
2. Use the exact schema from the spec (evaluator_configs table)
3. Include:
   - All columns with correct types
   - PRIMARY KEY on id
   - FOREIGN KEY to prompts(id)
   - UNIQUE constraint on (prompt_id, version)
   - Index: idx_evaluator_promoted on (prompt_id, is_promoted) WHERE is_promoted = true
4. Test the migration locally with: supabase db reset

ACCEPTANCE CRITERIA:
- [ ] Migration file created with correct naming
- [ ] Table created with all columns from spec
- [ ] FK to prompts.id exists
- [ ] UNIQUE constraint on (prompt_id, version)
- [ ] Index created
- [ ] Migration runs without errors
```

---

### E1.2: Create evaluations table

**Model**: `haiku` (simple schema creation)
**Dependencies**: None
**Effort**: 20 min
**Can run in parallel with**: E1.1, E1.3

**Prompt**:
```
Create a new Supabase migration file for the evaluations table.

SPEC REFERENCE: _project_specs/specs/evaluator-multi-prompt.md (section "Table: evaluations")

TASK:
1. Create migration file: supabase/migrations/XXX_create_evaluations.sql
2. Use the exact schema from the spec (evaluations table)
3. Include:
   - All columns with correct types
   - PRIMARY KEY on id
   - FOREIGN KEY to test_runs(id) ON DELETE CASCADE
   - FOREIGN KEY to evaluator_configs(id)
   - UNIQUE constraint on (test_run_id, evaluator_config_id)
   - Index: idx_evaluation_promoted on (test_run_id, is_promoted) WHERE is_promoted = true
   - Index: idx_evaluation_pending on (status) WHERE status = 'pending'
4. Test the migration locally

ACCEPTANCE CRITERIA:
- [ ] Migration file created
- [ ] Table created with all columns from spec
- [ ] FK to test_runs.id with ON DELETE CASCADE
- [ ] FK to evaluator_configs.id
- [ ] Both indexes created
- [ ] Migration runs without errors

NOTE: This will fail if E1.1 hasn't run (FK to evaluator_configs), but you can create the migration file. Merge migrations into one file if needed.
```

---

### E1.3: Create battle_evaluations table

**Model**: `haiku` (simple schema creation)
**Dependencies**: None
**Effort**: 20 min
**Can run in parallel with**: E1.1, E1.2

**Prompt**:
```
Create a new Supabase migration file for the battle_evaluations table.

SPEC REFERENCE: _project_specs/specs/evaluator-multi-prompt.md (section "Table: battle_evaluations")

TASK:
1. Create migration file: supabase/migrations/XXX_create_battle_evaluations.sql
2. Use the exact schema from the spec (battle_evaluations table)
3. Include:
   - All columns with correct types
   - PRIMARY KEY on id
   - FOREIGN KEY to evaluations(id) ON DELETE CASCADE
   - FOREIGN KEY to battle_results(id) ON DELETE CASCADE
   - UNIQUE constraint on (evaluation_id, battle_result_id)
   - Index: idx_battle_eval_evaluation on (evaluation_id)
4. Test the migration locally

ACCEPTANCE CRITERIA:
- [ ] Migration file created
- [ ] Table created with all columns from spec
- [ ] FK to evaluations.id with ON DELETE CASCADE
- [ ] FK to battle_results.id with ON DELETE CASCADE
- [ ] Index created
- [ ] Migration runs without errors

NOTE: This will fail if E1.2 hasn't run (FK to evaluations). Merge migrations into one file if needed.
```

---

## 🚀 MERGE STRATEGY FOR WAVE 1

**RECOMMENDATION**: Instead of 3 separate migrations, create ONE migration file with all 3 tables:

```sql
-- Migration: XXX_create_evaluator_tables.sql

-- 1. evaluator_configs
CREATE TABLE evaluator_configs (...);
CREATE INDEX idx_evaluator_promoted ...;

-- 2. evaluations
CREATE TABLE evaluations (...);
CREATE INDEX idx_evaluation_promoted ...;
CREATE INDEX idx_evaluation_pending ...;

-- 3. battle_evaluations
CREATE TABLE battle_evaluations (...);
CREATE INDEX idx_battle_eval_evaluation ...;
```

This avoids FK dependency issues. You can still work on them in parallel and merge at the end.

---

## Wave 2: Create Legacy Evaluator

### E1.4: Create legacy evaluator_config for existing prompt

**Model**: `haiku` (straightforward INSERT)
**Dependencies**: E1.1 (evaluator_configs table must exist)
**Effort**: 30 min

**Prompt**:
```
Create a migration to insert a legacy evaluator_config for the existing prompt.

CONTEXT:
- Current evaluator has 9 hardcoded criteria (italiano_autentico, apertura_cornice, discovery_socratica, ascolto_attivo, recap_strategico, pitch_audit, gestione_obiezioni, chiusura_prenotazione, adattamento_persona)
- Current system prompt is in n8n workflow ID: 202JEX5zm3VlrUT8, node "Judge Agent"
- Need to extract current criteria and system prompt into evaluator_configs record

TASK:
1. Fetch current Judge Agent system prompt from n8n workflow
2. Create migration file: supabase/migrations/XXX_insert_legacy_evaluator.sql
3. INSERT INTO evaluator_configs with:
   - name = 'sales-evaluator'
   - version = '1.0'
   - description = 'Legacy evaluator for sales audit agent'
   - prompt_id = (SELECT id FROM prompts LIMIT 1) -- or specific prompt
   - criteria = JSON array of 9 criteria with name, weight, description
   - system_prompt_template = current system prompt
   - is_promoted = true
   - status = 'active'
4. Run migration

ACCEPTANCE CRITERIA:
- [ ] Migration file created
- [ ] criteria JSONB has all 9 criteria with structure: [{name, weight, description, scoring_guide}]
- [ ] system_prompt_template contains full current prompt
- [ ] is_promoted = true (this is the default)
- [ ] Migration runs without errors
- [ ] SELECT * FROM evaluator_configs returns 1 row

REFERENCE:
- n8n workflow: 202JEX5zm3VlrUT8
- Current system prompt in: Judge Agent node parameters.options.systemMessage
```

---

## Wave 3: Migrate Test Runs

### E1.5: Migrate test_runs to evaluations

**Model**: `sonnet` (complex migration with data integrity)
**Dependencies**: E1.2 (evaluations table), E1.4 (legacy evaluator exists)
**Effort**: 45 min

**Prompt**:
```
Create a migration to populate evaluations table from existing test_runs.

CONTEXT:
- Existing test_runs in status 'completed' need evaluation records
- Use legacy evaluator_config (sales-evaluator v1.0) for all
- is_promoted = true (these are the original evaluations)
- Calculate aggregates from battle_results

TASK:
1. Create migration file: supabase/migrations/XXX_migrate_test_runs_to_evaluations.sql
2. For each test_run with status = 'completed':
   INSERT INTO evaluations (
     test_run_id,
     evaluator_config_id, -- from legacy evaluator
     status, -- 'completed'
     is_promoted, -- true
     overall_score, -- AVG(battle_results.score)
     success_count, -- COUNT where outcome = 'success'
     failure_count, -- COUNT where outcome = 'failure'
     partial_count, -- COUNT where outcome = 'partial'
     started_at, -- test_runs.started_at
     completed_at, -- test_runs.completed_at
     triggered_by -- 'migration'
   )
3. Handle test_runs with no battle_results (skip or mark as pending?)
4. Test with SELECT COUNT(*) from evaluations vs test_runs

ACCEPTANCE CRITERIA:
- [ ] Migration file created
- [ ] All completed test_runs have evaluation record
- [ ] Aggregates calculated correctly (overall_score, counts)
- [ ] is_promoted = true for all
- [ ] No orphan evaluations (every evaluation.test_run_id exists)
- [ ] Migration is idempotent (can run multiple times safely)

REFERENCE:
- Spec section: "Phase 3: Data Migration"
```

---

## Wave 4: Migrate Battle Results

### E1.6: Migrate battle_results to battle_evaluations

**Model**: `sonnet` (complex migration, needs to preserve evaluation_details)
**Dependencies**: E1.3 (battle_evaluations table), E1.5 (evaluations migrated)
**Effort**: 45 min

**Prompt**:
```
Create a migration to populate battle_evaluations from existing battle_results.

CONTEXT:
- battle_results currently stores score and evaluation_details
- Need to move this data to battle_evaluations
- evaluation_details is JSONB with: {overall_score, criteria_scores, summary, strengths, weaknesses, ...}

TASK:
1. Create migration file: supabase/migrations/XXX_migrate_battle_results_to_evaluations.sql
2. For each battle_result with evaluation_details IS NOT NULL:
   INSERT INTO battle_evaluations (
     evaluation_id, -- JOIN evaluations ON test_run_id
     battle_result_id,
     score, -- battle_results.score
     criteria_scores, -- evaluation_details->'criteria_scores'
     outcome, -- battle_results.outcome
     summary, -- evaluation_details->'summary'
     strengths, -- evaluation_details->'strengths'
     weaknesses, -- evaluation_details->'weaknesses'
     raw_response, -- evaluation_details (entire object for debug)
     evaluated_at, -- battle_results.created_at
     evaluator_version -- evaluation_details->'evaluator_version'
   )
3. Handle battle_results where evaluation_details is NULL (skip?)
4. Verify no data loss

ACCEPTANCE CRITERIA:
- [ ] Migration file created
- [ ] All battle_results with evaluation_details have battle_evaluation record
- [ ] criteria_scores JSONB extracted correctly
- [ ] No data loss (strengths, weaknesses, summary preserved)
- [ ] COUNT(battle_evaluations) matches COUNT(battle_results WHERE evaluation_details IS NOT NULL)
- [ ] Migration is idempotent
- [ ] battle_results.evaluation_details can be deprecated but kept for rollback

REFERENCE:
- Spec section: "Phase 3: Data Migration"
- Current battle_results schema for evaluation_details structure
```

---

## Execution Strategy

### Option A: Sequential (Safe, Slower)

Run one panel at a time:
```bash
# Panel 1
Wave 1: Run all 3 CREATE TABLE in one migration
Wave 2: Run E1.4 (legacy evaluator)
Wave 3: Run E1.5 (migrate test_runs)
Wave 4: Run E1.6 (migrate battle_results)
```

**Time**: ~3h sequential

---

### Option B: Parallel (Fast, Risk)

Open 3 panels for Wave 1:
```bash
# Panel 1 (model: haiku)
[Paste E1.1 prompt]

# Panel 2 (model: haiku)
[Paste E1.2 prompt]

# Panel 3 (model: haiku)
[Paste E1.3 prompt]

# Then merge migrations manually
```

Then continue with E1.4 → E1.5 → E1.6 sequentially.

**Time**: ~2h with parallelization

---

## Model Cost Optimization

| Task | Model | Why | Est. Cost |
|------|-------|-----|-----------|
| E1.1 | haiku | Simple CREATE TABLE | $0.05 |
| E1.2 | haiku | Simple CREATE TABLE | $0.05 |
| E1.3 | haiku | Simple CREATE TABLE | $0.05 |
| E1.4 | haiku | Simple INSERT | $0.10 |
| E1.5 | **sonnet** | Complex JOIN + aggregates | $0.30 |
| E1.6 | **sonnet** | Complex JSONB extraction | $0.30 |

**Total Estimated**: ~$0.85

**Strategy**:
- Use `haiku` for Wave 1-2 (schema + simple data)
- Use `sonnet` for Wave 3-4 (complex migrations)
- This saves ~60% vs using sonnet for everything

---

## Testing Checklist (After All Waves)

```bash
# 1. Verify tables exist
supabase db reset
psql $DATABASE_URL -c "\dt evaluator_configs evaluations battle_evaluations"

# 2. Verify constraints
psql $DATABASE_URL -c "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name IN ('evaluator_configs', 'evaluations', 'battle_evaluations');"

# 3. Verify data migrated
psql $DATABASE_URL -c "SELECT COUNT(*) FROM evaluator_configs;" # Should be 1
psql $DATABASE_URL -c "SELECT COUNT(*) FROM evaluations;" # Should match completed test_runs
psql $DATABASE_URL -c "SELECT COUNT(*) FROM battle_evaluations;" # Should match battle_results with eval

# 4. Verify relationships
psql $DATABASE_URL -c "SELECT e.id, e.test_run_id, COUNT(be.id) as battles FROM evaluations e LEFT JOIN battle_evaluations be ON be.evaluation_id = e.id GROUP BY e.id LIMIT 5;"
```

---

## Ready-to-Use Commands

### Create All Migrations (Merged Wave 1)

```bash
# Create single migration file for all 3 tables
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_create_evaluator_tables.sql << 'EOF'
-- Copy schema from spec evaluator-multi-prompt.md
-- Section: Database Schema
EOF
```

### Run Migrations

```bash
supabase db reset  # Resets local DB and applies all migrations
# OR
supabase migration up  # Apply pending migrations only
```

### Verify

```bash
psql $(supabase status | grep 'DB URL' | awk '{print $3}') -c "SELECT * FROM evaluator_configs;"
```

---

## Notes

1. **Merge migrations**: Consider merging E1.1-E1.3 into one file to avoid FK issues
2. **Local testing**: Always test with `supabase db reset` before pushing
3. **Rollback plan**: Keep battle_results.evaluation_details for 30 days before deprecating
4. **RLS**: Consider if RLS policies needed (probably not for single-user)

---

## ✅ E1 COMPLETE - Next Steps

E1 Schema completed with migrations:
- 006_create_evaluations_schema.sql
- 007_insert_legacy_evaluator.sql
- 008_migrate_test_runs_to_evaluations.sql
- 009_migrate_battle_results_to_evaluations.sql

---

# EPIC E2: API Endpoints

**Effort**: 4h
**Skill**: `/quick-dev`
**Context7**: ✅ YES - Query for Next.js App Router + Supabase patterns
**Can run parallel with**: E3

## E2 Dependencies Graph

```
E2.1 (evaluator-configs CRUD) ──► E2.2 (promote evaluator)
         │
         └──► E2.3 (evaluations list + re-evaluate) ──► E2.4 (promote + compare)
```

---

## E2.1: CRUD evaluator-configs

**Model**: `sonnet`
**Dependencies**: E1 complete
**Effort**: 1h
**Context7**: YES - "Next.js 14 App Router API routes with Supabase"

**Prompt**:
```
/quick-dev

Create API routes for evaluator_configs CRUD operations.

CONTEXT:
- Next.js 14 App Router (app/api/)
- Supabase client from lib/supabase.ts
- Schema: evaluator_configs table (see _project_specs/specs/evaluator-multi-prompt.md)
- Existing patterns: check app/api/ for similar routes

TASK 1: Create app/api/evaluator-configs/route.ts

GET /api/evaluator-configs
- Query params: ?prompt_id= (optional filter)
- Returns: { data: evaluator_configs[], error: null }
- Include prompt name via join with prompts table

POST /api/evaluator-configs
- Body: { name, version, prompt_id, criteria, system_prompt_template, success_config?, status? }
- Validates: required fields, criteria is array
- Returns: { data: new_record, error: null }

TASK 2: Create app/api/evaluator-configs/[id]/route.ts

GET /api/evaluator-configs/[id]
- Returns single evaluator_config with full details

PUT /api/evaluator-configs/[id]
- Body: partial update fields
- Returns updated record

DELETE /api/evaluator-configs/[id]
- Soft delete: set status = 'deprecated'
- Returns: { success: true }

ACCEPTANCE CRITERIA:
- [ ] All routes return consistent { data, error } shape
- [ ] Error handling with proper HTTP status codes (400, 404, 500)
- [ ] TypeScript types for request/response
- [ ] Validates criteria JSONB structure on POST/PUT
- [ ] Test with curl or Postman

REFERENCE:
- Spec: _project_specs/specs/evaluator-multi-prompt.md (Table: evaluator_configs)
- Existing API patterns: app/api/prompts/ or app/api/test-runs/

CONTEXT7 QUERY: "Next.js 14 App Router API routes POST GET with Supabase client"
```

---

## E2.2: Promote evaluator-config

**Model**: `haiku`
**Dependencies**: E2.1
**Effort**: 20 min
**Context7**: NO - simple SQL update

**Prompt**:
```
/quick-dev

Create API route for promoting an evaluator_config as default for its prompt.

CONTEXT:
- Existing: app/api/evaluator-configs/[id]/route.ts from E2.1
- Business rule: Only ONE evaluator_config per prompt can have is_promoted = true

TASK: Create app/api/evaluator-configs/[id]/promote/route.ts

POST /api/evaluator-configs/[id]/promote

Logic:
1. Get evaluator_config by id → extract prompt_id
2. In a transaction:
   a. UPDATE evaluator_configs SET is_promoted = false WHERE prompt_id = X AND is_promoted = true
   b. UPDATE evaluator_configs SET is_promoted = true WHERE id = [id]
3. Return updated evaluator_config

ERROR HANDLING:
- 404 if evaluator_config not found
- 400 if already promoted (optional: just return success)

ACCEPTANCE CRITERIA:
- [ ] Only one evaluator_config per prompt has is_promoted = true after call
- [ ] Transaction-safe (both updates succeed or neither)
- [ ] Returns 404 if evaluator_config not found
- [ ] Idempotent (calling twice = same result)

REFERENCE:
- Similar pattern: any "set default" action in codebase
```

---

## E2.3: Evaluations list + re-evaluate

**Model**: `sonnet`
**Dependencies**: E2.1
**Effort**: 1.5h
**Context7**: YES - "Supabase select with joins and aggregations"

**Prompt**:
```
/quick-dev

Create API routes for evaluations management.

CONTEXT:
- Schema: evaluations, battle_evaluations tables
- evaluations linked to test_runs and evaluator_configs
- Business: A test_run can have multiple evaluations (for A/B testing evaluators)

TASK 1: Create app/api/evaluations/route.ts

GET /api/evaluations
- Query params: ?test_run_id= (REQUIRED)
- Returns all evaluations for that test_run
- Include:
  - evaluator_config name/version (via join)
  - battle_evaluations count
  - is_promoted flag
- Order by: created_at DESC

Response shape:
{
  data: [
    {
      id, test_run_id, evaluator_config_id,
      evaluator_name, evaluator_version,
      status, is_promoted,
      overall_score, success_count, failure_count, partial_count,
      battles_evaluated: 10,
      created_at, completed_at
    }
  ],
  error: null
}

TASK 2: Create app/api/evaluations/re-evaluate/route.ts

POST /api/evaluations/re-evaluate
- Body: { test_run_id, evaluator_config_id }
- Validates:
  - test_run exists and status = 'completed'
  - evaluator_config exists
  - No existing evaluation with same combo (or return existing)
- Creates new evaluation record:
  - status = 'pending'
  - is_promoted = false
  - triggered_by = 'manual'
- Returns: { data: new_evaluation, error: null }

Note: Actual evaluation will be triggered by n8n workflow polling for status='pending'

ACCEPTANCE CRITERIA:
- [ ] GET returns evaluations with all joined data
- [ ] POST validates test_run is completed
- [ ] POST validates evaluator_config exists
- [ ] POST handles duplicate gracefully (return existing or error)
- [ ] POST sets is_promoted = false (never auto-promote re-evaluation)

CONTEXT7 QUERY: "Supabase JavaScript client select with inner join foreign table"
```

---

## E2.4: Promote evaluation + Compare

**Model**: `sonnet`
**Dependencies**: E2.3
**Effort**: 1h
**Context7**: NO - business logic heavy

**Prompt**:
```
/quick-dev

Create API routes for evaluation promotion and A/B comparison.

TASK 1: Create app/api/evaluations/[id]/promote/route.ts

POST /api/evaluations/[id]/promote

Logic:
1. Get evaluation → extract test_run_id
2. In transaction:
   a. UPDATE evaluations SET is_promoted = false WHERE test_run_id = X AND is_promoted = true
   b. UPDATE evaluations SET is_promoted = true WHERE id = [id]
3. Return updated evaluation

ERROR HANDLING:
- 404 if evaluation not found
- 400 if evaluation status != 'completed'

TASK 2: Create app/api/evaluations/[id]/compare/[otherId]/route.ts

GET /api/evaluations/[id]/compare/[otherId]

Logic:
1. Validate both evaluations exist
2. Validate both are from SAME test_run (security check)
3. Fetch both evaluations with their battle_evaluations
4. Calculate comparison:

Response shape:
{
  evaluation_a: {
    id, evaluator_name, evaluator_version, overall_score, success_rate,
    criteria_avg: { gestione_obiezioni: 6.5, empatia: 7.2, ... }
  },
  evaluation_b: { ... same structure ... },
  deltas: {
    overall_score: { value: +0.4, percent: +5.9 },
    success_rate: { value: +10, percent: +14.3 },
    criteria: [
      { name: "gestione_obiezioni", a: 6.5, b: 7.2, delta: +0.7, direction: "up" },
      { name: "empatia", a: 7.2, b: 7.2, delta: 0, direction: "same" },
      ...
    ]
  },
  per_persona: [
    {
      persona_id, persona_name,
      score_a: 5.2, score_b: 6.8, delta: +1.6,
      criteria_deltas: [...]
    }
  ],
  verdict: {
    better_evaluation: "b",
    improvements: 6,
    regressions: 2,
    unchanged: 1
  }
}

ERROR HANDLING:
- 404 if either evaluation not found
- 400 if evaluations from different test_runs

ACCEPTANCE CRITERIA:
- [ ] Promote works with transaction safety
- [ ] Compare validates same test_run
- [ ] Deltas calculated correctly (b - a)
- [ ] Per-persona breakdown joins with personas table
- [ ] Verdict summarizes which is better

REFERENCE:
- UX Mockup: _project_specs/specs/evaluator-multi-prompt.md (Compare View section)
```

---

## E2 Model Cost Optimization

| Task | Model | Context7 | Est. Cost |
|------|-------|----------|-----------|
| E2.1 | sonnet | YES | $0.25 |
| E2.2 | haiku | NO | $0.05 |
| E2.3 | sonnet | YES | $0.30 |
| E2.4 | sonnet | NO | $0.20 |
| **Total E2** | | | **~$0.80** |

---

# EPIC E3: n8n Workflow Update

**Effort**: 3h
**Skill**: `/quick-dev`
**Context7**: ❌ NO - Use n8n MCP tools directly
**Can run parallel with**: E2

## E3 Dependencies Graph

```
E3.1 (Get Pending from evaluations)
         │
         └──► E3.2 (Fetch evaluator_config)
                      │
                      └──► E3.3 (Build dynamic prompt)
                                   │
                                   └──► E3.4 (Update Judge Agent)
                                                │
                                                └──► E3.5 (Write to battle_evaluations)
```

---

## E3.1: Update Get Pending Evaluations

**Model**: `sonnet`
**Dependencies**: E1 complete
**Effort**: 30 min
**n8n MCP**: YES

**Prompt**:
```
/quick-dev

Update n8n Battles Evaluator workflow to read pending evaluations from new table.

CONTEXT:
- Workflow ID: 202JEX5zm3VlrUT8
- Current: "Get Pending Evaluations" node queries test_runs table
- New: Should query evaluations WHERE status = 'pending'

TASK: Update "Get Pending Evaluations" PostgreSQL node

NEW QUERY:
SELECT
  e.id as evaluation_id,
  e.test_run_id,
  e.evaluator_config_id,
  tr.test_run_code,
  tr.prompt_version_id
FROM evaluations e
JOIN test_runs tr ON tr.id = e.test_run_id
WHERE e.status = 'pending'
ORDER BY e.created_at ASC
LIMIT 1

ALSO: Add "Update Status to Running" node after getting pending:
UPDATE evaluations
SET status = 'running', started_at = now()
WHERE id = $1
RETURNING *

Use n8n MCP tools:
1. mcp__n8n-mcp-prod__n8n_get_workflow(id: "202JEX5zm3VlrUT8") to see current
2. mcp__n8n-mcp-prod__n8n_update_partial_workflow to update query

ACCEPTANCE CRITERIA:
- [ ] Query returns evaluation_id (not test_run_id as primary)
- [ ] Status updated to 'running' when processing starts
- [ ] Falls through gracefully when no pending evaluations
```

---

## E3.2: Fetch Evaluator Config

**Model**: `sonnet`
**Dependencies**: E3.1
**Effort**: 30 min
**n8n MCP**: YES

**Prompt**:
```
/quick-dev

Add node to fetch evaluator_config criteria for dynamic prompt building.

CONTEXT:
- Workflow ID: 202JEX5zm3VlrUT8
- After "Get Pending Evaluations" we have evaluation_id and evaluator_config_id
- Need to fetch criteria and system_prompt_template

TASK: Add "Fetch Evaluator Config" PostgreSQL node

QUERY:
SELECT
  id,
  name,
  version,
  criteria,
  system_prompt_template,
  success_config
FROM evaluator_configs
WHERE id = $1

Connect: "Get Pending Evaluations" → "Fetch Evaluator Config" → rest of flow

Use n8n MCP tools:
1. mcp__n8n-mcp-prod__n8n_update_partial_workflow with operation addNode
2. Connect to existing flow

ACCEPTANCE CRITERIA:
- [ ] Node fetches evaluator_config by id
- [ ] criteria JSONB available in $json.criteria
- [ ] system_prompt_template available in $json.system_prompt_template
- [ ] Connected properly in workflow
```

---

## E3.3: Build Dynamic System Prompt

**Model**: `sonnet`
**Dependencies**: E3.2
**Effort**: 45 min
**n8n MCP**: YES

**Prompt**:
```
/quick-dev

Add Code node to build dynamic system prompt from evaluator_config criteria.

CONTEXT:
- Workflow ID: 202JEX5zm3VlrUT8
- Input from previous node: criteria (array), system_prompt_template (string)
- Output: dynamic_system_prompt ready for Judge Agent

TASK: Add "Build Dynamic System Prompt" Code node

CODE:
const criteria = $input.first().json.criteria;
const template = $input.first().json.system_prompt_template;

// Build criteria evaluation section
const criteriaSection = criteria.map((c, i) => `
${i + 1}. **${c.name.replace(/_/g, ' ').toUpperCase()}** (peso: ${c.weight || 1.0})
   ${c.description || ''}
   ${c.scoring_guide ? `Scala: ${c.scoring_guide}` : ''}
`).join('\n');

// Build JSON template for expected output
const scoresTemplate = {};
criteria.forEach(c => scoresTemplate[c.name] = 0);

// Build dynamic prompt
// If template has {{CRITERIA_SECTION}} placeholder, replace it
// Otherwise append criteria section
let systemPrompt = template;
if (template.includes('{{CRITERIA_SECTION}}')) {
  systemPrompt = template.replace('{{CRITERIA_SECTION}}', criteriaSection);
} else {
  systemPrompt = template + '\n\n## CRITERI DI VALUTAZIONE\n' + criteriaSection;
}

if (template.includes('{{SCORES_TEMPLATE}}')) {
  systemPrompt = systemPrompt.replace('{{SCORES_TEMPLATE}}', JSON.stringify(scoresTemplate, null, 2));
}

return {
  ...$input.first().json,
  dynamic_system_prompt: systemPrompt,
  criteria_names: criteria.map(c => c.name),
  expected_scores_shape: scoresTemplate
};

Position: After "Fetch Evaluator Config", before "Judge Agent"

ACCEPTANCE CRITERIA:
- [ ] dynamic_system_prompt built correctly
- [ ] criteria_names array available for validation
- [ ] Handles templates with or without placeholders
- [ ] Preserves all other json fields from input
```

---

## E3.4: Update Judge Agent

**Model**: `haiku`
**Dependencies**: E3.3
**Effort**: 15 min
**n8n MCP**: YES

**Prompt**:
```
/quick-dev

Update Judge Agent node to use dynamic system prompt.

CONTEXT:
- Workflow ID: 202JEX5zm3VlrUT8
- Current: Judge Agent has static systemMessage in parameters
- New: Should use {{ $json.dynamic_system_prompt }} from previous node

TASK: Update "Judge Agent" node parameters

Change:
- parameters.options.systemMessage FROM: static string
- parameters.options.systemMessage TO: ={{ $json.dynamic_system_prompt }}

Keep:
- parameters.text (user message with transcript) - unchanged
- All other agent settings

Use n8n MCP:
mcp__n8n-mcp-prod__n8n_update_partial_workflow({
  id: "202JEX5zm3VlrUT8",
  operations: [{
    type: "updateNode",
    nodeName: "Judge Agent",
    updates: {
      "parameters.options.systemMessage": "={{ $json.dynamic_system_prompt }}"
    }
  }]
})

ACCEPTANCE CRITERIA:
- [ ] Judge Agent uses dynamic prompt expression
- [ ] Static prompt content removed from node
- [ ] Other agent settings preserved
- [ ] Test: run workflow and verify prompt is dynamic
```

---

## E3.5: Write to battle_evaluations

**Model**: `sonnet`
**Dependencies**: E3.4
**Effort**: 1h
**n8n MCP**: YES

**Prompt**:
```
/quick-dev

Update workflow output to write to battle_evaluations and update evaluation status.

CONTEXT:
- Workflow ID: 202JEX5zm3VlrUT8
- Current: "Update Battle Result" writes to battle_results.evaluation_details
- New: Should INSERT into battle_evaluations AND update evaluations.status

TASK 1: Modify "Update Battle Result" → rename to "Insert Battle Evaluation"

NEW QUERY:
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
  '{{ $json.evaluation_id }}'::uuid,
  '{{ $json.battle_result_id }}'::uuid,
  {{ $json.overall_score || 0 }},
  '{{ JSON.stringify($json.criteria_scores || {}) }}'::jsonb,
  '{{ $json.conversation_outcome || "unknown" }}',
  '{{ ($json.summary || "").replace(/'/g, "''") }}',
  '{{ JSON.stringify($json.strengths || []) }}'::jsonb,
  '{{ JSON.stringify($json.weaknesses || []) }}'::jsonb,
  '{{ JSON.stringify($json) }}'::jsonb,
  'evaluator-v4.1-dynamic'
)
ON CONFLICT (evaluation_id, battle_result_id) DO UPDATE SET
  score = EXCLUDED.score,
  criteria_scores = EXCLUDED.criteria_scores,
  outcome = EXCLUDED.outcome,
  summary = EXCLUDED.summary,
  evaluated_at = now()
RETURNING id

TASK 2: Add "Update Evaluation Complete" node AFTER loop finishes (on batch complete output)

QUERY:
UPDATE evaluations SET
  status = 'completed',
  completed_at = now(),
  overall_score = (
    SELECT ROUND(AVG(score)::numeric, 2)
    FROM battle_evaluations
    WHERE evaluation_id = '{{ $json.evaluation_id }}'::uuid
  ),
  success_count = (
    SELECT COUNT(*)
    FROM battle_evaluations
    WHERE evaluation_id = '{{ $json.evaluation_id }}'::uuid
    AND outcome IN ('success', 'successo')
  ),
  failure_count = (
    SELECT COUNT(*)
    FROM battle_evaluations
    WHERE evaluation_id = '{{ $json.evaluation_id }}'::uuid
    AND outcome IN ('failure', 'fallimento')
  ),
  partial_count = (
    SELECT COUNT(*)
    FROM battle_evaluations
    WHERE evaluation_id = '{{ $json.evaluation_id }}'::uuid
    AND outcome IN ('partial', 'successo_parziale')
  )
WHERE id = '{{ $json.evaluation_id }}'::uuid
RETURNING *

Connect: Loop batch complete → "Update Evaluation Complete" → End

ACCEPTANCE CRITERIA:
- [ ] Writes to battle_evaluations (not battle_results)
- [ ] ON CONFLICT handles re-runs gracefully
- [ ] Aggregates calculated correctly at end
- [ ] evaluation.status = 'completed' when done
- [ ] evaluation.overall_score populated from AVG
- [ ] All battle data preserved (raw_response for debug)

IMPORTANT: Ensure evaluation_id is passed through the entire loop!
```

---

## E3 Model Cost Optimization

| Task | Model | n8n MCP | Est. Cost |
|------|-------|---------|-----------|
| E3.1 | sonnet | YES | $0.15 |
| E3.2 | sonnet | YES | $0.10 |
| E3.3 | sonnet | YES | $0.15 |
| E3.4 | haiku | YES | $0.05 |
| E3.5 | sonnet | YES | $0.15 |
| **Total E3** | | | **~$0.60** |

---

# Parallel Execution Strategy

## Option A: Two Panels (Recommended)

```bash
# Panel 1: E2 (API Endpoints)
Model: sonnet (with haiku for E2.2)
Context7: YES
Sequence: E2.1 → E2.2 → E2.3 → E2.4
Time: ~4h

# Panel 2: E3 (n8n Workflow)
Model: sonnet (with haiku for E3.4)
Context7: NO (use n8n MCP)
Sequence: E3.1 → E3.2 → E3.3 → E3.4 → E3.5
Time: ~3h
```

## Total Cost Estimate

| Epic | Cost |
|------|------|
| E1 (done) | $0.85 |
| E2 | $0.80 |
| E3 | $0.60 |
| **Total** | **~$2.25** |

---

# Testing Checklist (After E2 + E3)

## API Tests (E2)

```bash
# E2.1: CRUD evaluator-configs
curl http://localhost:3000/api/evaluator-configs
curl http://localhost:3000/api/evaluator-configs?prompt_id=XXX
curl -X POST http://localhost:3000/api/evaluator-configs -d '{"name":"test","version":"1.0",...}'

# E2.2: Promote
curl -X POST http://localhost:3000/api/evaluator-configs/XXX/promote

# E2.3: Evaluations
curl http://localhost:3000/api/evaluations?test_run_id=XXX
curl -X POST http://localhost:3000/api/evaluations/re-evaluate -d '{"test_run_id":"XXX","evaluator_config_id":"YYY"}'

# E2.4: Compare
curl http://localhost:3000/api/evaluations/AAA/compare/BBB
```

## n8n Tests (E3)

```bash
# 1. Create pending evaluation manually
INSERT INTO evaluations (test_run_id, evaluator_config_id, status, is_promoted)
VALUES ('XXX', 'YYY', 'pending', false);

# 2. Trigger workflow manually in n8n

# 3. Verify battle_evaluations populated
SELECT * FROM battle_evaluations WHERE evaluation_id = 'ZZZ';

# 4. Verify evaluation status updated
SELECT status, overall_score, completed_at FROM evaluations WHERE id = 'ZZZ';
```

---

# Quick Reference

| Epic | Skill | Context7 | Model | Parallel |
|------|-------|----------|-------|----------|
| E2.1 | /quick-dev | YES | sonnet | - |
| E2.2 | /quick-dev | NO | haiku | after E2.1 |
| E2.3 | /quick-dev | YES | sonnet | after E2.1 |
| E2.4 | /quick-dev | NO | sonnet | after E2.3 |
| E3.1 | /quick-dev | NO (n8n MCP) | sonnet | - |
| E3.2 | /quick-dev | NO (n8n MCP) | sonnet | after E3.1 |
| E3.3 | /quick-dev | NO (n8n MCP) | sonnet | after E3.2 |
| E3.4 | /quick-dev | NO (n8n MCP) | haiku | after E3.3 |
| E3.5 | /quick-dev | NO (n8n MCP) | sonnet | after E3.4 |
