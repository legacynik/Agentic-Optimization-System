# n8n Workflow Changelog

Log di tutte le modifiche applicate ai workflow n8n.

---

## [2026-01-19] - MODIFICATIONS-REQUIRED.md v2.4 Lean Update

### Further Simplified (v2.4 LEAN)
- **Section 0b: KILL SWITCH** - Check Abort ottimizzato da 4+ a **2 punti**
  - Check #1: Prima di LLM call
  - Check #2: Dopo LLM call
  - Rationale: Bilancio reattività/semplicità (95% coverage)
- **Section 1.1: Webhook Input** - mode `full_cycle` rimosso
  - Solo `single` | `full_cycle_with_review`
  - tool_scenario_id confermato VARCHAR (non UUID)
- **Section 1.3: Get Personas** - Query ultra-semplificata
  - Rimosso UNION, override_config, version-specific binding
  - Join diretto personas ↔ prompt_personas
- **Section 1.4: Create test_run** - Rimosso cycle_state
  - Aggiunto llm_config JSONB per tracking
- **validation_status** - Ridotto a 2 stati ('pending', 'validated')

### Notes v2.4
- Sincronizzato con PRD v2.4 Lean
- Ulteriore ~15% semplificazione rispetto a v2.3
- Recovery manuale per MVP (no cycle_state auto-recovery)

---

## [2026-01-19] - MODIFICATIONS-REQUIRED.md v2.3 Lean Update

### Simplified (v2.3 LEAN)
- **Section 0: SECURITY** - Semplificato da HMAC a simple secret header
  - Rimosso: x-n8n-signature, x-n8n-timestamp, x-n8n-nonce
  - Nuovo: solo `x-n8n-secret` header
  - Rimosso: Code Node complesso per HMAC
- **Rimossa Section 0b: RETRY LOGIC** - Deferred to enterprise
- **Rimosso: tool_mock_scenarios da DB** - Ora hardcoded in n8n Code Node
- **Phase 6 Analyzer/Optimizer** - Ora richiede HUMAN REVIEW (no loop automatico)

### Added (v2.3)
- **Section 0b: KILL SWITCH** (NEW) - Check Abort nodes
  - Query per controllare test_runs.status='aborted'
  - Posizionamento nel workflow (prima/dopo ogni step)
  - Abort handler con IF node
- **Checklist aggiornata** con "Check Abort" nodes
- **tool_scenario_id** ora è STRING (non UUID) per hardcoded scenarios

### Kept from v2.2
- validation_status='validated' filter (CRITICAL)
- test_run_id filter in Evaluator (CRITICAL)
- tool_error outcome
- Struttura base di tutte le queries

### Notes
- Sincronizzato con PRD v2.3 Lean
- Enterprise features (HMAC, Upstash, auto-loop) in `ROADMAP-enterprise-features.md`
- ~40% semplificazione rispetto a v2.2

---

## [2026-01-19] - MODIFICATIONS-REQUIRED.md Audit Update v2.2

### Added (AUDIT FIX)
- **Section 0: SECURITY** - Autenticazione HMAC per callbacks
  - Code node template per generazione signature
  - Headers richiesti: x-n8n-signature, x-n8n-timestamp, x-n8n-nonce
  - Struttura N8nCallbackPayload documentata
- **Section 0b: RETRY LOGIC** - Resilienza workflow con exponential backoff
  - Query retry_policy da workflow_configs
  - Implementazione retry con backoff multiplier
- **Section 1.7: Heartbeat Update** - Per stale run detection
  - Query UPDATE last_heartbeat_at
  - Posizionamento nel workflow loop
- **Section 1.8: Extended Outcome** - Aggiunto 'tool_error' outcome
- **Fase 0 nella Checklist** - Security setup come prerequisito

### Changed (AUDIT FIX)
- **Section 1.3 Get Personas**: Query ottimizzata con UNION invece di OR
  - Aggiunto filtro `validation_status = 'validated'` (CRITICAL)
  - Separazione general_personas vs version_personas
- **Section 1.6 Update Status**: failure_count include tool_error
- **Section 2.1 Query Unevaluated**: Aggiunto filtro `test_run_id` (CRITICAL)
  - Documenta query vecchia vs nuova per chiarezza
- **Checklist Fase 1-6**: Aggiunti requisiti AUDIT FIX per ogni fase

### Notes
- Sincronizzato con PRD v2.2
- Tutti gli AUDIT FIX sono marcati con label visibili
- Security (Fase 0) BLOCCA tutte le altre fasi (DEPRECATED in v2.3)

---

## [2026-01-19] - v2.4 LEAN Implementation via MCP

### Test RUNNER Battle (XmpBhcUxsRpxAYPN) - IMPLEMENTED ✅
- [x] **Validate Input node** - Added webhook input validation
  - UUID format validation for prompt_version_id
  - Mode enum validation (`single` | `full_cycle_with_review`)
  - max_iterations validation (1-10)
  - tool_scenario_id VARCHAR support
- [x] **Get Prompt Testing** - Updated to query `prompt_versions` table
  - Now uses validated input from Validate Input node
  - Query: `SELECT id, prompt_name, version, content, status FROM prompt_versions WHERE id = :prompt_version_id::uuid`
- [x] **Get Validated Personas** - JOIN with prompt_personas + validation_status filter
  - Query includes `p.validation_status = 'validated'` filter (AUDIT FIX)
  - JOIN on prompt_personas for prompt-specific personas
- [x] **Set Test Run** - New field structure
  - test_run_code, prompt_version_id, prompt_name, mode, tool_scenario_id, max_iterations
- [x] **Create Test Run** - Now inserts into `test_runs` table
  - Full v2.4 schema: test_run_code, prompt_version_id, mode, max_iterations, tool_scenario_id, llm_config, status
- [x] **Check Abort Before Loop** - Kill Switch Point #1
  - Queries test_runs for abort_requested or status='aborted'
  - Updates heartbeat timestamp
- [x] **Execute Workflow** - Updated to pass new v2 fields
  - persona_id, test_run_code, test_run_id, tool_scenario_id
- [x] **Run Evaluator** - Now passes test_run_id and test_run_code

### Battles Evaluator (202JEX5zm3VlrUT8) - IMPLEMENTED ✅
- [x] **Extract Test Run Info node** - Added for input extraction
- [x] **Get Pending Evaluations** - CRITICAL AUDIT FIX
  - Added test_run_code filter to prevent race conditions
  - Backward compatible: evaluates all if no test_run provided

### Personas Generator v2.0 (HltftwB9Bm8LNQsO) - CREATED ✅
- [x] **Webhook Trigger** - Path: `/generate-personas`
- [x] **Validate Input** - UUID validation, count validation (1-20)
- [x] **Get Prompt Content** - Fetches from prompt_versions
- [x] **AI Persona Generator** - Claude Sonnet 4.5 via OpenRouter
  - Italian authentic personalities
  - Difficulty mix support
  - Category-based generation
- [x] **Parse Generated Personas** - Structured JSON parsing
- [x] **Loop + Insert** - Personas and prompt_personas associations
- [x] **Respond to Webhook** - JSON response with results

### Still Pending
- [ ] x-n8n-secret header on HTTP callbacks (security)
- [ ] Check Abort #2 (after LLM call) in Battle Agent
- [ ] Tool Mocking implementation in Battle Agent
- [ ] Update test_run status to 'completed' at end

---

## [Unreleased]

### Test RUNNER Battle
- [x] ~~Webhook input: prompt_version_id~~ DONE
- [x] ~~Query da prompt_versions~~ DONE
- [x] ~~Filtro personas via prompt_personas + validation_status~~ DONE
- [x] ~~Nuove tabelle test_runs + battle_results~~ DONE (test_runs)
- [ ] Heartbeat updates (partial - in Check Abort)
- [ ] HMAC authentication su callbacks (deferred to x-n8n-secret)

### Evaluator
- [x] ~~Query battle_results **con filtro test_run_id**~~ DONE (using conversations + filter)
- [ ] Update evaluation_details
- [ ] HMAC authentication su callbacks

### Personas Generator
- [x] ~~Workflow da creare~~ DONE
- [ ] HMAC authentication su callbacks

---

## Template Entry

```markdown
## [YYYY-MM-DD] - Workflow Name

### Added
- Descrizione feature aggiunta

### Changed
- Descrizione modifica

### Fixed
- Descrizione bug fix

### Notes
- Note aggiuntive, problemi riscontrati, etc.
```
