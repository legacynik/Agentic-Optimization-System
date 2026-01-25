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
