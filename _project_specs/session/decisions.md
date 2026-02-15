# Decision Log

Track key decisions for future reference. Never delete entries.

---

## [2026-01-19] PRD v2.4 Lean Implementation

**Decision**: Implement PRD v2.4 Lean spec with hardcoded tool scenarios

**Context**: Building backend APIs for AI Agent Testing Dashboard with n8n integration

**Options Considered**:
1. Full enterprise features (HMAC, Upstash, DB-stored scenarios)
2. v2.4 Lean (simple secret auth, hardcoded scenarios, single-user)

**Choice**: v2.4 Lean

**Reasoning**:
- Single-user agency use case doesn't need enterprise complexity
- Simple x-n8n-secret header is sufficient for internal tool
- Hardcoded tool scenarios easier to maintain than DB table
- Faster to implement and iterate

**Trade-offs**:
- No HMAC replay protection (acceptable for internal use)
- Tool scenarios require code deploy to change (acceptable for 4 scenarios)

**References**:
- `_project_specs/features/PRD-n8n-integration-v2.md` - Full spec
- `lib/tool-scenarios.ts` - Hardcoded scenarios

---

## [2026-01-19] Simplified Validation Status

**Decision**: Use only 'pending' and 'validated' for persona validation_status

**Context**: PRD v2.3 had 5 states: pending, validating, validated, failed, needs_human_review

**Options Considered**:
1. Keep all 5 states for granular tracking
2. Simplify to 2 states (pending, validated)

**Choice**: 2 states only

**Reasoning**:
- Fewer edge cases to handle in code
- If validation fails, just delete and recreate the persona
- Single-user doesn't need "needs_human_review" queue
- Simpler mental model

**Trade-offs**:
- No tracking of failed validations (lose diagnostic info)
- Can't pause personas mid-validation

**References**:
- `supabase/migrations/002_prd_v2_4_schema.sql` - CHECK constraint
- `app/api/personas/[id]/route.ts` - Validation in PATCH

---

## [2026-01-19] Test Mode Simplification

**Decision**: Remove `full_cycle` mode, keep only `single` and `full_cycle_with_review`

**Context**: PRD v2.3 had autonomous `full_cycle` mode that looped without human review

**Options Considered**:
1. Keep all 3 modes
2. Remove `full_cycle` (autonomous)

**Choice**: Remove autonomous mode

**Reasoning**:
- Risk of overfitting without human oversight
- Human review ensures quality control
- Aligns with "human-in-the-loop" principle in PRD

**Trade-offs**:
- Can't run fully automated optimization cycles
- Requires human interaction for each iteration

**References**:
- `supabase/migrations/002_prd_v2_4_schema.sql` - CHECK constraint on mode
- `app/api/test-runs/route.ts` - Mode validation

---

## [2026-01-25] Claude Bootstrap + BMAD Method Integration

**Decision**: Usare BMAD e Claude Bootstrap come sistemi complementari a livelli diversi

**Context**: Il progetto aveva entrambi i sistemi configurati ma con overlap e conflitti non chiariti

**Options Considered**:
1. Usare solo BMAD per tutto
2. Usare solo Claude Bootstrap per tutto
3. Integrarli a livelli diversi (complementari)

**Choice**: Integrazione a 3 livelli

**Architecture**:
```
LIVELLO 1: STRATEGIA (BMAD)
  → *pm, *architect, *workflow-init, brainstorming
  → Cosa fare, chi coinvolgere, pianificazione

LIVELLO 2: IMPLEMENTAZIONE (Claude Bootstrap)
  → base, TDD, security skill, session-management
  → Come farlo bene, qualità codice, test

LIVELLO 3: DOCS (Context7)
  → Query librerie per documentazione attuale
```

**Ownership**:
- BMAD: Orchestrazione, planning, agents, QA strategy, threat modeling
- Claude Bootstrap: Code quality, TDD workflow, session persistence, OWASP patterns, code review

**Reasoning**:
- Evita duplicazione di responsabilità
- BMAD eccelle in planning/discussion
- Claude Bootstrap eccelle in code quality enforcement
- Insieme coprono l'intero ciclo di sviluppo

**Conflicts Resolved**:
1. "Commenta tutto" vs "Self-documenting code" → "Commenti per WHY, non WHAT"
2. `*workflow-init` vs `/ralph-spec` → Decision tree: planning vs implementation
3. `*security` vs security skill → Architettura vs coding patterns

**Trade-offs**:
- Richiede conoscenza di entrambi i sistemi
- Decision tree necessario per scegliere

**References**:
- `CLAUDE.md` - Sezioni "AI Development Integration", "System Ownership", "Decision Tree"
- `.claude/skills/base/SKILL.md` - Code quality rules
- `.claude/agents/bmad-agents.md` - BMAD agents reference

---

## [2026-01-29] Battles Evaluator Dual-Trigger Architecture

**Decision**: Converge manual and external triggers into single evaluation flow

**Context**: Battles Evaluator had two disconnected flows - one using OLD schema (conversations, turns) and one using NEW schema (battle_results, test_runs). Manual trigger couldn't evaluate test_runs that completed battles but didn't auto-trigger.

**Options Considered**:
1. Keep flows separate, deprecate manual trigger
2. Create separate manual-only workflow
3. Converge both triggers into same processing flow

**Choice**: Converge triggers

**Architecture**:
```
EXTERNAL: When Executed → Extract Test Run → Has ID? → Set Status Evaluating
MANUAL:   Start Evaluation → Get Pending → Loop → Set Status Evaluating
                                                   ↓
                                            PG Aggregate → LLM → Save/Error → Loop
```

**Reasoning**:
- Single maintenance point for evaluation logic
- Manual trigger can now process any pending test_runs
- Query validates battles are complete before processing
- Loop handles multiple test_runs sequentially

**Changes Applied**:
1. "Get Pending Evaluations" query → NEW schema with validation
2. Connections rewired: Set Status Evaluating → PG Aggregate
3. Loop: Process Each Conversation EACH → Set Status Evaluating
4. Loop back: Save Report / Log error → Process Each Conversation

**Trade-offs**:
- More complex connection structure
- Manual trigger processes all pending (not selectable)

**References**:
- `_project_specs/n8n-battles-evaluator-fix-guide.md` - Full fix guide
- n8n Workflow ID: `202JEX5zm3VlrUT8`

---

## [2026-01-29] Evaluator Multi-Prompt Architecture

**Decision**: Refactor evaluator da hardcoded a sistema dinamico con criteri configurabili per prompt

**Context**: L'evaluator attuale ha 9 criteri hardcoded specifici per "vendita audit" (pitch_audit, discovery_socratica, etc.). Non funziona per altri tipi di agenti (support, booking, customer service). Lo scope del progetto è testare DIVERSI agenti con DIVERSI prompt.

**Options Considered**:
1. Criteri nel Prompt - evaluator legato al prompt
2. Criteri nella Persona - evaluator legato alla persona
3. Criteri nel Test Run - definiti ad ogni test
4. Ibrido Prompt + Persona - combinazione dinamica

**Choice**: Criteri nel Prompt (Opzione 1)

**Reasoning**:
- Le PERSONAS descrivono il CLIENTE (scettico, fretta, indeciso) → riutilizzabili tra prompt diversi
- L'EVALUATOR descrive come valutare l'AGENTE → specifico per tipo di prompt
- L'ibrido prompt+persona è troppo complesso da mantenere
- KISS principle: un evaluator per prompt, personas riutilizzabili

**Architecture**:
```
evaluator_configs (NUOVA)
├── criteria JSONB - array di criteri dinamici
├── system_prompt_template - template per Judge Agent
├── is_promoted - default per questo prompt
└── FK prompt_id

evaluations (NUOVA)
├── test_run_id - quale test run
├── evaluator_config_id - quale evaluator usato
├── is_promoted - evaluation "ufficiale"
└── aggregati (overall_score, success_count, etc.)

battle_evaluations (NUOVA)
├── evaluation_id - quale evaluation
├── battle_result_id - quale battle
└── score, criteria_scores, summary
```

**Key Features**:
- Un test_run può avere N evaluations (A/B testing evaluator)
- Solo 1 evaluation è "promoted" (visibile di default)
- Re-evaluate action per valutare con evaluator diverso
- Compare view per confrontare evaluations
- Personas riutilizzabili tra prompt diversi

**Trade-offs**:
- Più tabelle (3 nuove)
- Migration necessaria per dati esistenti
- Workflow n8n da aggiornare

**References**:
- `_project_specs/specs/evaluator-multi-prompt.md` - Full spec
- Party Mode Session: 2026-01-29 (Architect, Data Engineer, PM, UX Designer)

---

## [2026-01-29] Multi-Evaluation per Test Run

**Decision**: Permettere N evaluations per test_run invece di 1

**Context**: Necessità di testare evaluator diversi sullo stesso test_run per validare quale produce risultati migliori (A/B testing).

**Options Considered**:
1. evaluator_config_id in test_runs → fisso al lancio, 1 evaluation
2. Tabella separata evaluations → N evaluations per test_run

**Choice**: Tabella separata evaluations

**Reasoning**:
- Il test_run viene creato PRIMA dell'evaluation (durante battles)
- Per A/B testing serve ri-valutare con evaluator diversi
- Permette confronto diretto tra due evaluations
- "Promote" action per cambiare quale è quella ufficiale

**Flow**:
```
1. Lancio test_run → crea evaluation con evaluator promosso (is_promoted=true)
2. Re-evaluate → crea nuova evaluation (is_promoted=false)
3. Compare → vedi differenze tra evaluations
4. Promote → cambia quale è primary
```

**Trade-offs**:
- Dashboard deve leggere da evaluations invece di test_runs
- Più join nelle query

**References**:
- `_project_specs/specs/evaluator-multi-prompt.md` - Schema dettagliato

---

## [2026-01-29] Compare View UX - Overlay Diff con Expand

**Decision**: Usare view "Overlay Diff" (3B) con possibilità di espandere per dettaglio persona

**Context**: Scelta tra side-by-side (più dettaglio) vs overlay diff (focus su differenze)

**Options Considered**:
1. Side by Side - tutto visibile, più pesante
2. Overlay Diff - focus su delta, più actionable
3. Entrambi - toggle tra views

**Choice**: Overlay Diff + Expand

**Reasoning**:
- Focus su differenze è più utile per decisione rapida
- Expand per persona soddisfa need di dettaglio
- Meno cognitive load

**UI Design**:
```
SUMMARY (sempre visibile)
├── Overall score delta con percentuale
├── Success rate delta
└── Criteria changes (↑ ↓ =)

EXPAND (on demand)
└── Per-persona breakdown con failure reasons
```

**References**:
- `_project_specs/specs/evaluator-multi-prompt.md` - Mockups sezione

---

## [2026-01-29] Evaluator Configs API - Soft Delete Pattern

**Decision**: Use soft delete (status='deprecated') instead of hard delete for evaluator_configs

**Context**: Implementing DELETE /api/evaluator-configs/[id] endpoint

**Options Considered**:
1. Hard delete (remove from database)
2. Soft delete (set status='deprecated')

**Choice**: Soft delete

**Reasoning**:
- Data integrity: evaluations table references evaluator_configs
- Historical analysis: keep record of all evaluators used over time
- Rollback capability: can "undelete" if needed
- Audit trail: understand why certain test runs used certain evaluators
- ON DELETE CASCADE would delete evaluations + battle_evaluations (data loss)

**Trade-offs**:
- Database grows over time (acceptable - evaluator_configs are small)
- Must filter deprecated configs in UI (already have status field)

**References**:
- `app/api/evaluator-configs/[id]/route.ts` - DELETE handler

---

## [2026-01-29] Promote Endpoint Idempotency

**Decision**: Make promote endpoint idempotent - return success if already promoted

**Context**: POST /api/evaluator-configs/[id]/promote implementation

**Options Considered**:
1. Return error if already promoted
2. Return success (idempotent)

**Choice**: Idempotent

**Reasoning**:
- REST best practice: POST should be idempotent when reasonable
- UI can call multiple times without error handling complexity
- Same end state regardless of how many times called
- Matches pattern from other promote/activate endpoints

**Implementation**:
- Check is_promoted flag before making changes
- If already true, return 200 with success message
- Otherwise, proceed with unpromote others + promote target

**References**:
- `app/api/evaluator-configs/[id]/promote/route.ts`

---

## [2026-01-29] Re-evaluate Duplicate Handling

**Decision**: Return existing evaluation instead of error on duplicate

**Context**: POST /api/evaluations/re-evaluate when evaluation already exists

**Options Considered**:
1. Return 409 Conflict error
2. Return existing evaluation (idempotent)

**Choice**: Return existing evaluation

**Reasoning**:
- Idempotency: multiple clicks don't cause errors
- Same evaluator_config on same test_run = same evaluation
- UNIQUE(test_run_id, evaluator_config_id) constraint prevents duplicates
- Better UX: no error to handle, just use existing evaluation
- Database constraint already prevents duplicates, so just query for it

**Response Format**:
```json
{
  "data": { existing_evaluation },
  "error": null,
  "message": "Evaluation already exists for this test run and evaluator config"
}
```

**References**:
- `app/api/evaluations/re-evaluate/route.ts`

---

## [2026-01-29] Re-evaluate Business Rules

**Decision**: Enforce strict business rules for re-evaluation

**Context**: POST /api/evaluations/re-evaluate validation logic

**Rules Enforced**:
1. Test run must have status='completed' (not pending, running, etc.)
2. Evaluator config must exist
3. New evaluation always has is_promoted=false
4. New evaluation always has triggered_by='manual'
5. New evaluation always starts with status='pending'

**Reasoning**:
- Rule 1: Can't re-evaluate incomplete/failed test runs (no battle_results to evaluate)
- Rule 2: Prevents 404 later when n8n workflow tries to use evaluator
- Rule 3: Re-evaluations never auto-promoted (user must explicitly promote)
- Rule 4: Distinguish manual from auto evaluations (for analytics)
- Rule 5: Picked up by n8n workflow polling for pending evaluations

**Error Response Example**:
```json
{
  "error": "Cannot re-evaluate test run with status 'running'. Only completed test runs can be re-evaluated.",
  "code": "INVALID_STATUS"
}
```

**References**:
- `app/api/evaluations/re-evaluate/route.ts`
- `_project_specs/specs/evaluator-multi-prompt.md` - Flow 2

---

## [2026-01-29] Supabase JOIN Pattern for API Routes

**Decision**: Use separate queries instead of Supabase `!inner()` joins for foreign key data

**Context**: Fetching evaluator_config name/version in evaluations list

**Options Considered**:
1. Use Supabase nested select: `evaluator_configs!inner(name, version)`
2. Use separate query for prompt/config names
3. Use SQL view with pre-joined data

**Choice**: Separate queries (option 2)

**Reasoning**:
- Supabase `!inner()` syntax sometimes fails with TypeScript types
- Separate queries more predictable and easier to debug
- Negligible performance impact (both are efficient)
- More explicit control over error handling

**Pattern Used**:
```typescript
// 1. Fetch main records
const { data: configs } = await supabase
  .from('evaluator_configs')
  .select('id, name, prompt_id, ...')

// 2. Fetch related records
const promptIds = [...new Set(configs.map(c => c.prompt_id))]
const { data: prompts } = await supabase
  .from('prompts')
  .select('id, name')
  .in('id', promptIds)

// 3. Map and transform
const promptMap = new Map(prompts.map(p => [p.id, p.name]))
const result = configs.map(c => ({ ...c, prompt_name: promptMap.get(c.prompt_id) }))
```

**Trade-offs**:
- More code than single nested select
- But more reliable and type-safe
- Pattern is consistent across all API routes

**References**:
- `app/api/evaluator-configs/route.ts` - GET handler
- `app/api/evaluations/route.ts` - GET handler

---

## [2026-01-29] E3: Dynamic System Prompt Architecture in n8n Workflow

**Decision**: Build dynamic system prompts from evaluator_configs at workflow runtime

**Context**: n8n Battles Evaluator workflow 202JEX5zm3VlrUT8 now uses new evaluations + evaluator_configs schema

**Options Considered**:
1. Keep static system prompt in n8n (coupled to evaluator code)
2. Fetch evaluator_config at runtime and build dynamic prompt (decoupled)
3. Pre-build all prompts and store as blob in evaluator_configs

**Choice**: Option 2 - Fetch at runtime and build dynamically

**Reasoning**:
- Option 1: Static prompt can't change without code redeploy → tight coupling
- Option 2: Prompt changes reflect immediately when evaluator_config updated → loose coupling
- Option 3: Overkill for current needs, harder to debug and customize
- Option 2 allows A/B testing different prompts against same battles

**Architecture Implemented**:
1. **Fetch Evaluator Config** (PostgreSQL node)
   - Queries: id, name, version, criteria (JSONB), system_prompt_template, success_config
   - Uses: evaluator_config_id from pending evaluation

2. **Build Dynamic System Prompt** (JavaScript Code node)
   - Input: criteria array + system_prompt_template
   - Processes:
     - Formats criteria: name (underscores→spaces), weight, description, scoring_guide
     - Creates numbered list for clarity
     - Builds expected_scores_shape (JSON map of criterion names)
   - Output: dynamic_system_prompt ready for Judge Agent
   - Handles templates with/without {{CRITERIA_SECTION}} and {{SCORES_TEMPLATE}} placeholders

3. **Judge Agent** (LangChain Agent)
   - Uses: {{ $json.dynamic_system_prompt }} expression
   - Plus: full_transcript, persona context, db_outcome, total_turns, detected_patterns
   - Output: JSON with overall_score, criteria_scores, conversation_outcome, etc.

4. **Insert Battle Evaluation** (PostgreSQL)
   - Writes to: battle_evaluations table
   - Uses: INSERT...ON CONFLICT for idempotent upserts
   - Preserves: raw_response (complete JSON for debugging)

5. **Update Evaluation Complete** (PostgreSQL)
   - Runs after batch completes
   - Aggregates: overall_score (AVG), success_count, failure_count, partial_count
   - Sets: evaluation.status='completed', completed_at=now()

**Trade-offs**:
- Slightly more complex workflow (extra nodes for fetch + build)
- But full flexibility: change criteria/template without code redeploy
- Better debugging: raw_response stores all LLM responses for analysis

**Why This Pattern**:
- Decoupling: Prompt definition in evaluator_configs, not n8n code
- Reusability: Same evaluator can run against multiple test_runs
- Maintainability: Update criteria once, affects all future evaluations
- Testing: Different prompts can be A/B tested on same battles via different evaluator_configs

**Assumptions**:
- evaluation_id is passed through entire workflow via $json
- battle_result_id populated before Judge Agent runs
- criteria is array of {name, weight, description, scoring_guide}
- system_prompt_template may have placeholders or be plain text (both supported)

**References**:
- Workflow: `202JEX5zm3VlrUT8` (Battles Evaluator)
- Database: evaluations, evaluator_configs, battle_evaluations tables
- Schema spec: `_project_specs/specs/evaluator-multi-prompt.md` (E3 section)
- Workflow nodes: Get Pending Evaluations → Fetch Evaluator Config → Build Dynamic Prompt → Judge Agent → Insert Battle Evaluation → Update Evaluation Complete


---

## [2026-01-31] Playwright Test Architecture for Data-Dependent Tests

**Decision**: Use graceful skip pattern for tests requiring Supabase data

**Context**: Dashboard E2E tests need Supabase data, but data loading can be slow or fail in CI

**Options Considered**:
1. Mock all Supabase data (complex setup, maintenance burden)
2. Always wait for data with long timeout (slow tests, flaky in CI)
3. Graceful skip when data unavailable (fast feedback, resilient)

**Choice**: Graceful skip pattern with serial mode

**Reasoning**:
- Core UI tests (sidebar, navigation, structure) always run
- Data-dependent tests skip gracefully when Supabase slow/unavailable
- 15s timeout for data check, then skip if not loaded
- Serial mode prevents race conditions in data tests

**Trade-offs**:
- Some tests may be skipped in CI if Supabase is slow
- Acceptable because core UI tests always verify structure

**References**:
- `tests/dashboard.spec.ts` - Test implementation
- `waitForDashboardLoad()` helper function
