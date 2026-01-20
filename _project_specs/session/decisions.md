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
