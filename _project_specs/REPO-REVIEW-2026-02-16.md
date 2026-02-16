# Full Repository Review - AI Agent Testing Dashboard

**Date**: 2026-02-16
**Scope**: Structure, Code Quality, API, Frontend, Database
**Health Score**: 6.8/10

---

## Executive Summary

Il progetto ha una buona architettura di base e documentazione eccellente, ma presenta diversi problemi che richiedono intervento prima di poter scalare. Il blocco critico principale e' nel database (FK a tabella inesistente `prompts`), seguito da violazioni sistematiche dei limiti di dimensione file e mancanza di autenticazione API.

### Top 5 Issues by Impact

| # | Issue | Severity | Area | Effort |
|---|-------|----------|------|--------|
| 1 | **Missing `prompts` table** - FK in evaluator_configs referenzia tabella inesistente | CRITICAL | Database | 1h |
| 2 | **No API authentication** - Tutti gli endpoint pubblici senza auth | CRITICAL | Security | 4h |
| 3 | **5 components >300 lines** (max 936!) - Violazione regole progetto (max 200) | HIGH | Code Quality | 8h |
| 4 | **5 response format diversi** nelle API - Frontend deve gestire 5 pattern | HIGH | API | 3h |
| 5 | **53% components senza loading/error states** - UX degradata | HIGH | Frontend | 4h |

---

## 1. PROJECT STRUCTURE

**Score: 7.6/10**

### Findings

| Finding | Severity | Action |
|---------|----------|--------|
| `dashboard-overview.tsx.backup` + `filter-bar.tsx.backup` (660 lines dead code) | WARNING | Delete |
| 30+ `.DS_Store` files non in .gitignore | WARNING | Add to .gitignore |
| `package.json` name = "my-v0-project" | WARNING | Rename |
| `playwright-report/` e `test-results/` non in .gitignore | WARNING | Add to .gitignore |
| Missing `.env.example` template | INFO | Create |
| Supabase dependency usa `latest` instead of pinned version | INFO | Pin version |

### Quick Wins
```bash
# .gitignore additions needed:
.DS_Store
**/.DS_Store
playwright-report/
test-results/
```

---

## 2. CODE QUALITY

**Score: 5.5/10**

### File Size Violations (max 200 lines rule)

| File | Lines | Over by |
|------|-------|---------|
| `components/version-centric/persona-workshop.tsx` | **936** | +368% |
| `components/conversation-explorer.tsx` | **643** | +221% |
| `components/dashboard-content.tsx` | **540** | +170% |
| `components/dashboard-overview.tsx` | **467** | +133% |
| `app/api/test-runs/route.ts` | **468** | +134% |
| `components/test-run-status-monitor.tsx` | **431** | +115% |
| `components/evaluation-compare-view.tsx` | **410** | +105% |
| `components/conversation-evaluation.tsx` | **409** | +104% |
| `components/evaluator-config-form.tsx` | **394** | +97% |
| `components/version-centric/prompt-versions-hub.tsx` | **392** | +96% |

### Type Safety Issues

| Issue | Count | Files |
|-------|-------|-------|
| `any` type usage | 6+ | dashboard-overview, conversation-explorer, dashboard-content |
| `conversations_summary` typed as Array but stored as JSON string | Systemic | 7+ components parse it differently |
| Missing generics on `Map()` | 2 | lib/queries.ts |

### Code Duplication

| Pattern | Instances | Fix |
|---------|-----------|-----|
| JSON parse for `conversations_summary` | 7+ | Extract to `lib/parsers.ts` |
| Data fetch + loading state in useEffect | 3 | Extract to `useFetchDashboard()` hook |
| UUID validation regex | 6 | Move to `lib/validation.ts` |
| Supabase client creation | 18 vs 3 | Standardize (inline `createClient` vs `getSupabase()`) |

### Dead Code

| Location | Issue |
|----------|-------|
| `test-run-status-monitor.tsx:39-42` | `void isEditing` - suppressed unused warning |
| `prompt-versions-hub.tsx` | Mock data in production code |
| `dashboard-overview.tsx` | Duplicated logic from `dashboard-content.tsx` |
| 2 unused views in DB | `version_performance_summary`, `persona_performance_by_version` |

---

## 3. API ROUTES

**Score: 6.5/10**

### Inventory: 24 routes, ~7,400 lines total

### Critical Issues

| Issue | Details |
|-------|---------|
| **No authentication** | Zero auth middleware on any endpoint. Anyone with URL can call any API |
| **No rate limiting** | Webhook endpoints vulnerable to abuse |
| **5 response formats** | `{data, error}`, `{data, pagination}`, `{success, ...}`, direct payload, `{data: {nested}}` |
| **Optional secret validation** | `x-n8n-secret` falls back gracefully if env var not set |

### Legacy/Dead Routes (3)

| Route | Status | Action |
|-------|--------|--------|
| `/api/launch-test` | Legacy, replaced by `/api/test-runs` | Delete |
| `/api/generate-personas` | Italian comments, hardcoded URLs | Delete or migrate |
| `/api/n8n/trigger-test` | Minimal, unclear purpose | Delete or consolidate |

### Consistency Issues

| Area | Status |
|------|--------|
| Error handling (try/catch) | Good - all routes have it |
| UUID validation | Good - consistent regex |
| Logging prefixes | Mixed - some use `[v0]` (legacy), others module names |
| Supabase client | Inconsistent - 18 use inline `createClient`, 3 use `getSupabase()` |
| Response format | Critical - 5 different patterns |

---

## 4. FRONTEND COMPONENTS

**Score: 6/10**

### Coverage Matrix (15 major components)

| Feature | Has It | Missing | Coverage |
|---------|--------|---------|----------|
| Loading states | 8 | 7 | 53% |
| Error handling | 8 | 7 | 53% |
| Empty states | 6 | 8 | 40% |
| Accessibility (aria) | 4 | 11+ | <25% |

### Missing Loading States

- `conversation-evaluation.tsx`
- `evaluations-list.tsx`
- `conversation-transcript.tsx`
- `personas-heatmap.tsx`
- `persona-testruns-view.tsx`
- `ai-insights.tsx`
- `battle-arena.tsx`

### Missing Error Handling

- `conversation-evaluation.tsx` - no try-catch for data processing
- `persona-testruns-view.tsx` - silent failure
- `personas-heatmap.tsx` - no parse error handling
- `conversation-transcript.tsx` - could crash on malformed JSON
- `ai-insights.tsx` - unhandled errors in insight generation
- `evaluations-list.tsx` - no modal error handling
- `persona-workshop.tsx` - minimal form submission feedback

### Accessibility Gaps

- Only 24 aria labels across 50+ components
- `personas-heatmap.tsx` - no grid role, no cell labels
- `test-run-status-monitor.tsx` - no aria-live for real-time updates
- Charts/visualizations completely inaccessible to screen readers
- Color contrast issues with `text-muted-foreground` on `bg-muted`

### Data Fetching

- Pattern: `useEffect + fetch` everywhere (no React Query for data, only agentic)
- No data caching between pages
- No optimistic updates
- No infinite scroll/pagination for large datasets
- Zustand store exists but only for filter state, not data

---

## 5. DATABASE

**Score: 6/10**

### CRITICAL: Missing `prompts` Table

Migration 006 creates `evaluator_configs` with:
```sql
prompt_id UUID NOT NULL REFERENCES prompts(id)
```

**But no `prompts` table exists in any migration.** The project uses `prompt_versions` as the prompt entity.

**Impact**:
- `evaluator_configs` FK constraint references non-existent table
- Migration 007 INSERT will fail
- `/api/evaluator-configs` POST will fail

**Fix**: Create `prompts` table OR change FK to reference `prompt_versions(id)`

### Schema Health

| Area | Status |
|------|--------|
| 9 migrations | All defined, but 006-007 have FK issue |
| TypeScript alignment | `PersonaPerformanceRow` 100% aligned with view |
| Seed data | Good coverage for core tables, missing evaluator data |
| RLS policies | Only 3 tables have RLS (all with `USING (true)` = no real policy) |
| Indexes | Missing on evaluator tables (`evaluations.created_at`, `evaluations.test_run_id`) |
| Unused views | 2 views defined but never referenced in code |

### Schema Reference Doc

`_project_specs/schema-reference.md` is **outdated** - missing documentation for migrations 004-009 (evaluator schema, analysis columns, prompt_personas fix).

---

## Prioritized Action Plan

### Phase 0: Blockers (Before Testing)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 0.1 | Fix `prompts` table FK in evaluator_configs | 1h | Unblocks evaluator system |
| 0.2 | Verify migrations 006-009 ran successfully on live DB | 30min | Validates schema |

### Phase 1: Quick Wins (1 day)

| # | Action | Effort |
|---|--------|--------|
| 1.1 | Add `.DS_Store`, `playwright-report/`, `test-results/` to .gitignore | 5min |
| 1.2 | Delete `.backup` files | 5min |
| 1.3 | Rename package.json from "my-v0-project" | 5min |
| 1.4 | Delete 3 legacy API routes | 15min |
| 1.5 | Extract UUID validation to `lib/validation.ts` | 15min |
| 1.6 | Extract JSON parse helper to `lib/parsers.ts` | 30min |

### Phase 2: Code Quality (1 week)

| # | Action | Effort |
|---|--------|--------|
| 2.1 | Split `persona-workshop.tsx` (936 lines) into 4-5 components | 2h |
| 2.2 | Split `conversation-explorer.tsx` (643 lines) into ListPanel + DetailPanel + FilterPanel | 2h |
| 2.3 | Resolve `dashboard-overview.tsx` vs `dashboard-content.tsx` duplication | 1.5h |
| 2.4 | Split remaining >300 line components | 3h |
| 2.5 | Replace all `any` types with proper TypeScript types | 1h |
| 2.6 | Standardize Supabase client pattern (pick one) | 1h |

### Phase 3: UX Robustness (1 week)

| # | Action | Effort |
|---|--------|--------|
| 3.1 | Add loading skeletons to 7 missing components | 2h |
| 3.2 | Add error handling to 7 missing components | 2h |
| 3.3 | Add empty states to 8 missing components | 1.5h |
| 3.4 | Standardize API response format (pick one pattern) | 3h |

### Phase 4: Security & Infrastructure (2 weeks)

| # | Action | Effort |
|---|--------|--------|
| 4.1 | Add API authentication middleware | 4h |
| 4.2 | Add rate limiting to webhook endpoints | 2h |
| 4.3 | Implement proper RLS policies | 2h |
| 4.4 | Add missing database indexes | 30min |
| 4.5 | Update schema-reference.md | 1h |

### Phase 5: Polish (Ongoing)

| # | Action | Effort |
|---|--------|--------|
| 5.1 | Accessibility improvements (aria labels, keyboard nav) | 4h |
| 5.2 | Migrate data fetching to React Query | 4h |
| 5.3 | Add unit tests (currently 0%) | Ongoing |
| 5.4 | Fix failing Playwright tests (5 failing, 8 skipped) | 2h |

---

## Metrics Summary

| Area | Score | Key Issue |
|------|-------|-----------|
| Structure | 7.6/10 | Backup files, .DS_Store |
| Code Quality | 5.5/10 | 10 files over 200 lines, duplication |
| API Routes | 6.5/10 | No auth, 5 response formats |
| Frontend | 6.0/10 | 53% missing loading/error states |
| Database | 6.0/10 | Missing `prompts` table FK |
| Documentation | 9.0/10 | Excellent specs, skills, session |
| **Overall** | **6.8/10** | **Good foundation, needs hardening** |
