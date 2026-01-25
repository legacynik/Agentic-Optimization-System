# Session Archive: 2026-01-25 - Schema Refactor, n8n Fixes, Documentation Overhaul

## Summary
Sessione completa che ha incluso: (1) Refactor dello schema DB per multi-tenant con nuova tabella `prompts`, (2) Fix di tutti i workflow n8n per allinearsi al nuovo schema, (3) Analisi approfondita dell'integrazione Claude Bootstrap + BMAD Method, (4) Aggiornamento completo di CLAUDE.md con ownership chiara, decision tree, documentazione del flusso sessioni, (5) Regole obbligatorie per session management con comandi user e auto-trigger.

---

## Tasks Completed

### Schema Refactor (Multi-Tenant Ready)
- [x] Creata tabella `prompts` con `tenant_id` support
- [x] Aggiunto `prompt_id` FK a `prompt_versions`
- [x] Refactored `prompt_personas` da `prompt_version_id` a `prompt_id`
- [x] De-duplicati dati: 110 records → 10 unique links
- [x] Aggiunti constraints: UNIQUE(persona_id, prompt_id), FK CASCADE

### n8n Workflow Fixes
- [x] Test RUNNER Battle - Tutti i nodi funzionanti
- [x] Test Battle Agent v1.0 - SQL injection fix, transcript saving
- [x] Get Validated Personas - Query aggiornata per nuovo schema
- [x] Insert Battle Result - Query parametrizzata (sicurezza)

### Documentation Overhaul
- [x] Analisi Claude Bootstrap vs BMAD Method (conflitti e complementarità)
- [x] Aggiunto diagramma architettura a 3 livelli in CLAUDE.md
- [x] Creata sezione "System Ownership" (chi fa cosa)
- [x] Creato Decision Tree (quando usare cosa)
- [x] Chiarita regola commenti: "WHY not WHAT"
- [x] Documentato flusso sessioni (current-state, decisions, archive)
- [x] Aggiornati tutti i workflow con indicazione sistema (BMAD/CB)

### Session Management Rules
- [x] Aggiunti comandi sessione user ("fine sessione", "checkpoint", etc.)
- [x] Regole obbligatorie inizio/durante/fine sessione
- [x] Templates per current-state.md, decisions.md, archive/*.md
- [x] Auto-trigger per suggerire fine sessione
- [x] Checklist fine sessione
- [x] Creato primo file archive della sessione

---

## Key Decisions

### Schema Architecture
- **Scelta**: Tabella `prompts` separata invece di tutto in `prompt_versions`
- **Reasoning**: Permette multi-tenant, prompt_personas eredita automaticamente nuove versioni
- **Riferimento**: `decisions.md` entry [2026-01-25]

### Claude Bootstrap + BMAD Integration
- **Scelta**: Sistemi complementari a livelli diversi, non alternativi
- **BMAD**: Orchestrazione (COSA fare, CHI coinvolgere)
- **Claude Bootstrap**: Esecuzione (COME farlo bene)
- **Riferimento**: CLAUDE.md sezione "AI Development Integration"

### Comments Rule Clarification
- **Prima**: "Commenta tutto"
- **Dopo**: "Commenti per WHY, non WHAT" - codice self-documenting
- **Reasoning**: Risolve conflitto tra CLAUDE.md rules e CB base skill

---

## Code Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `CLAUDE.md` | Modified | Aggiunto diagramma livelli, ownership, decision tree, session flow |
| `supabase/migrations/005_fix_prompt_personas.sql` | Created | Schema refactor migration |
| `n8n workflows/Test-RUNNER-Battle.json` | Modified | Query aggiornate per nuovo schema |
| `n8n workflows/Battles-Evaluator.json` | Modified | Allineamento campi |

---

## Schema Finale

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   prompts   │       │ prompt_versions  │       │  personas   │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ prompt_id (FK)   │       │ id (PK)     │
│ prompt_name │       │ id (PK)          │       │ tenant_id   │
│ tenant_id   │       │ version          │       │ name        │
│ description │       │ content          │       └──────┬──────┘
└──────┬──────┘       │ status           │              │
       │              └──────────────────┘              │
       │         ┌─────────────────┐                    │
       └────────►│ prompt_personas │◄───────────────────┘
                 ├─────────────────┤
                 │ prompt_id (FK)  │  ← Link to PROMPT, not version!
                 │ persona_id (FK) │
                 │ is_active       │
                 └─────────────────┘
```

---

## CLAUDE.md Updates Summary

### Nuove Sezioni Aggiunte
1. **Diagramma 3 Livelli**: Strategia (BMAD) → Implementazione (CB) → Docs (Context7)
2. **System Ownership**: Tabelle chiare di responsabilità per sistema
3. **Decision Tree**: Albero decisionale per scegliere BMAD vs CB
4. **Session Documentation Flow**: Flusso completo current-state → decisions → archive
5. **Comandi Sessione**: Tabella comandi user (inizio/checkpoint/fine sessione)
6. **Regole Obbligatorie Session State**: Inizio/durante/fine sessione
7. **Templates**: current-state.md, decisions.md entry, archive/*.md
8. **Auto-Trigger Fine Sessione**: Quando suggerire chiusura
9. **Checklist Fine Sessione**: Verifica completezza

### Modifiche a Sezioni Esistenti
- **Rules/Codice**: Chiarita regola commenti + aggiunti limiti CB
- **Development Workflow**: Ogni workflow ora indica sistema usato (BMAD/CB)
- **AI Development Integration**: Aggiunto "Owns" per ogni sistema

---

## Open Items Carried Forward

### UI (Next Priority)
| Page | Issue | Priority |
|------|-------|----------|
| `/prompts` | Uses hardcoded mock data | High |
| `/agentic` → Optimization Loop | "Coming soon" placeholder | High |
| `/agentic` → Analytics | "Coming soon" placeholder | Medium |

### Documentation
- [ ] Creare `code-landmarks.md` se non esiste
- [ ] Review decisions.md per completezza

---

## Session Stats
- Duration: ~3 hours
- Tool calls: ~60
- Files modified: 4
- New archive entries: 1
- CLAUDE.md sections added: 9
- Templates added: 3 (current-state, decisions entry, archive)

---

## Important Context

### Database
- **Supabase Project**: `dlozxirsmrbriuklgcxq`
- **Prompts table**: 3 prompts (qual-audit-sa, solis-outbound-cold, evaluator)
- **Personas linked**: 10 to qual-audit-sa

### n8n
- **All workflows**: WORKING
- **Test Runner Webhook**: Active
- **Battle Agent**: Saving transcripts correctly

### Systems
- **BMAD**: Orchestrazione, planning, agents
- **Claude Bootstrap**: Code quality, TDD, session management
- **Context7**: Library documentation queries
