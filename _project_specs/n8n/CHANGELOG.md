# n8n Workflow Changelog

Log di tutte le modifiche applicate ai workflow n8n.

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

## [Unreleased]

### Test RUNNER Battle
- [ ] Webhook input: prompt_version_id
- [ ] Query da prompt_versions
- [ ] Filtro personas via prompt_personas + validation_status
- [ ] Nuove tabelle test_runs + battle_results
- [ ] Heartbeat updates
- [ ] HMAC authentication su callbacks

### Evaluator
- [ ] Query battle_results **con filtro test_run_id**
- [ ] Update evaluation_details
- [ ] HMAC authentication su callbacks

### Personas Generator
- [ ] Workflow da creare
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
