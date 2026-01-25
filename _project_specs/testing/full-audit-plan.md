# Full Audit Plan - AI Agent Testing Dashboard

**Data:** 2026-01-23
**Scope:** Testing completo, debug, ottimizzazione connessioni e UX

---

## Executive Summary

| Metrica | Valore |
|---------|--------|
| **Pagine** | 9 route |
| **Componenti custom** | 28+ |
| **API routes** | 15 endpoints |
| **Bug Critici (P0)** | 4 |
| **Bug High (P1)** | 6 |
| **Bug Medium (P2)** | 5+ |

### Stato User Journeys

| Journey | Status | Severity |
|---------|--------|----------|
| Launch Test Run | BROKEN | P0 |
| View Dashboard | WORKS | - |
| Explore Conversations | DEGRADED | P1 |
| Agentic Testing | BROKEN | P0 |
| Personas Management | PARTIAL | P1 |

---

## FASE 1: CRITICAL FIXES (P0)

### 1.1 BUG: `.rpc('increment')` inesistente

**File:** `/app/api/test-runs/route.ts` (riga ~184)
**Problema:** Supabase non ha metodo `.rpc('increment')` standard
**Impatto:** POST /api/test-runs FALLISCE → Test launch non funziona

**Fix:**
```typescript
// PRIMA (broken):
await supabase.from('workflow_configs').rpc('increment', {...})

// DOPO (fix):
await supabase.from('workflow_configs')
  .update({
    trigger_count: supabase.sql`trigger_count + 1`,
    last_triggered_at: new Date().toISOString()
  })
  .eq('workflow_type', 'test_runner')
```

**Test manuale:**
```bash
curl -X POST http://localhost:3000/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{"prompt_version_id": "xxx", "mode": "single", "tool_scenario_id": "happy_path"}'
```

---

### 1.2 BUG: `saveBattleResult()` error non gestito

**File:** `/app/api/n8n/webhook/route.ts` (righe ~370-374)
**Problema:** INSERT error viene ignorato → Dati persi silenziosamente

**Fix:**
```typescript
// Aggiungere error handling
const { data, error } = await supabase
  .from('battle_results')
  .insert(battleResult)
  .select()
  .single()

if (error) {
  console.error('[n8n/webhook] Failed to save battle result:', error)
  throw new Error(`Battle result save failed: ${error.message}`)
}
```

**Test:**
```bash
# Inviare webhook con dati invalidi
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "test_runner", "test_run_id": "invalid", "results": []}'
```

---

### 1.3 INCOMPLETE: BattleArena completamente MOCK

**File:** `/components/agentic/battle-arena.tsx`
**Problema:** Tutto il componente simula dati fake, nessuna connessione reale a N8N

**Stato attuale:**
- `battleStatus` gestito localmente
- `messages` generati random
- `agentHealth/personaHealth` calcolati fake
- Nessun WebSocket/polling verso API

**Azioni richieste:**
1. Collegare a `useTestRunStatus()` hook
2. Ricevere messaggi reali da webhook callback
3. Mostrare battle_results reali da DB

**Test:** Verificare che lanciando test reale, BattleArena mostri dati live

---

### 1.4 INCOMPLETE: TestRunStatusMonitor edit mode

**File:** `/components/test-run-status-monitor.tsx` (righe 82-84)
**Problema:** Edit mode è stub, PromptDiffViewer non permette editing reale

**TODO presente nel codice:**
```typescript
// TODO: Implement full edit mode with inline prompt editor (Phase 8)
```

**Azioni richieste:**
1. Implementare `isEditing` state management
2. Aggiungere inline prompt editor
3. Collegare a `onEdit` callback di PromptDiffViewer
4. Salvare edited prompt prima di approval

---

## FASE 2: HIGH PRIORITY FIXES (P1)

### 2.1 Webhook non idempotent

**File:** `/app/api/n8n/webhook/route.ts`
**Problema:** Retry da N8N causa duplicati in `battle_results`

**Fix:** Aggiungere idempotency key check
```typescript
// Prima di insert, verificare se esiste già
const existing = await supabase
  .from('battle_results')
  .select('id')
  .eq('test_run_id', testRunId)
  .eq('persona_id', personaId)
  .single()

if (existing.data) {
  console.log('[webhook] Duplicate ignored:', testRunId, personaId)
  return // Skip insert
}
```

---

### 2.2 Race condition updateConversationNotes

**File:** `/lib/queries.ts`
**Problema:** fetch + update separate → race condition possibile

**Fix:** Usare upsert o transaction
```typescript
// Usare .update() con filter diretto invece di fetch prima
const { error } = await supabase
  .from('conversations')
  .update({ human_notes: notes })
  .eq('conversationid', conversationId)
```

---

### 2.3 Agentic page KPIs hardcoded

**File:** `/app/agentic/page.tsx`
**Problema:** Valori statici non collegati a DB

**Valori fake trovati:**
- `1,247` battles
- `48` personas
- `87.3%` success rate
- `156` optimization cycles

**Fix:** Collegare a query reali da `battle_results` e `test_runs`

---

### 2.4 N8N connection badge fake

**File:** `/app/agentic/page.tsx` (riga ~200)
**Problema:** Badge "N8N Workflows: Connected" è hardcoded

**Fix:**
1. Chiamare `/api/settings` per status reale
2. Verificare `workflow_configs` health status
3. Mostrare stato dinamico (Connected/Disconnected/Error)

---

### 2.5 ConversationExplorer duplicate score badge

**File:** `/components/conversation-explorer.tsx` (righe 473-486)
**Problema:** Score badge renderizzato 2 volte nella UI

**Fix:** Rimuovere duplicato

---

### 2.6 PersonaWorkshop props inutilizzate

**File:** `/app/personas/page.tsx`
**Problema:** `promptName=""` e `promptVersion=""` passati ma mai usati

**Fix:** O rimuovere props o implementare utilizzo

---

## FASE 3: MEDIUM PRIORITY (P2)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 3.1 | Mix italiano/inglese | GeneratePersonasButton, LaunchTestButton | Standardizzare lingua |
| 3.2 | UUID validation duplicata | 6+ file API | Creare `lib/validation.ts` |
| 3.3 | DashboardContent duplicato? | dashboard-content.tsx vs dashboard-overview.tsx | Verificare e unificare |
| 3.4 | Scroll sync limitato | ConversationCompare | Implementare virtual scroll |
| 3.5 | Mobile nav mancante | NavigationHeader | Aggiungere hamburger menu |

---

## User Journey Testing Matrix

### Journey 1: Launch Test Run

| Step | Page/Component | Test | Expected | Status |
|------|----------------|------|----------|--------|
| 1 | /test-launcher | Load page | Prompt versions list | TBD |
| 2 | PromptSelector | Select prompt | Version details shown | TBD |
| 3 | ScenarioSelector | Select scenario | Tool scenario options | TBD |
| 4 | LaunchButton | Click launch | POST /api/test-runs | BROKEN |
| 5 | TestRunStatusMonitor | Monitor progress | Status updates | TBD |
| 6 | - | View results | Navigate to results | TBD |

### Journey 2: View Dashboard

| Step | Page/Component | Test | Expected | Status |
|------|----------------|------|----------|--------|
| 1 | / | Load page | KPIs + Heatmap | TBD |
| 2 | FilterBar | Apply filters | Data filtered | TBD |
| 3 | PersonasHeatmap | Click persona | Drill-down view | TBD |
| 4 | PersonaTestRunsView | View history | Test runs list | TBD |
| 5 | ExportMenu | Export CSV | File downloaded | TBD |

### Journey 3: Explore Conversations

| Step | Page/Component | Test | Expected | Status |
|------|----------------|------|----------|--------|
| 1 | /conversations | Load page | Conversation list | TBD |
| 2 | Filters | Apply filters | Filtered results | TBD |
| 3 | ConversationList | Select conv | Right panel updates | TBD |
| 4 | TranscriptTab | View transcript | Messages displayed | TBD |
| 5 | EvaluationTab | View scores | Criteria breakdown | TBD |
| 6 | NotesTab | Add note | Note saved | TBD |
| 7 | CompareTab | Compare 2-4 | Side-by-side view | TBD |

### Journey 4: Agentic Testing

| Step | Page/Component | Test | Expected | Status |
|------|----------------|------|----------|--------|
| 1 | /agentic | Load page | Real KPIs | BROKEN |
| 2 | BattleArena | Start battle | Real-time updates | BROKEN |
| 3 | - | View results | battle_results data | BROKEN |

### Journey 5: Personas Management

| Step | Page/Component | Test | Expected | Status |
|------|----------------|------|----------|--------|
| 1 | /personas | Load page | Persona list | TBD |
| 2 | PersonaWorkshop | Create persona | Form submission | TBD |
| 3 | - | Generate AI | N8N trigger | TBD |
| 4 | - | Validate | Status update | TBD |

---

## Page-by-Page Audit Checklist

### / (Dashboard)

- [ ] KPI cards load correctly
- [ ] FilterBar filters work
- [ ] PersonasHeatmap renders
- [ ] PersonaTestRunsView on selection
- [ ] AIInsights generate
- [ ] SimpleTrends chart renders
- [ ] Export CSV/PDF/JSON work
- [ ] Loading state shown
- [ ] Error state shown (disconnect DB)
- [ ] Empty state shown (no data)

### /conversations

- [ ] Conversation list loads
- [ ] Search filter works
- [ ] Category filter works
- [ ] Persona filter works
- [ ] Outcome filter works
- [ ] Score range filter works
- [ ] Transcript tab works
- [ ] Evaluation tab works
- [ ] Notes tab works (save/load)
- [ ] Compare tab works (2-4 convs)
- [ ] Score badge NOT duplicated
- [ ] Export works

### /agentic

- [ ] KPIs show REAL data (not hardcoded)
- [ ] N8N status is REAL (not fake)
- [ ] BattleArena connects to real tests
- [ ] PersonaGenerator works
- [ ] OptimizationLoop works (or proper "coming soon")

### /test-launcher

- [ ] Prompt versions load
- [ ] Scenarios load
- [ ] Launch test WORKS (P0 fix needed)
- [ ] TestRunStatusMonitor updates
- [ ] Edit mode works (P0 fix needed)
- [ ] Abort works
- [ ] Continue works

### /personas

- [ ] Persona list loads
- [ ] Create persona works
- [ ] Generate personas works
- [ ] Validate personas works
- [ ] Props passed correctly

### /prompts

- [ ] Prompt list loads
- [ ] Version history works
- [ ] PromptDiffViewer works

### /settings

- [ ] Workflow configs load
- [ ] Edit config works
- [ ] Test webhook works
- [ ] Theme toggle works

### /executive

- [ ] ExecutiveKPIs load
- [ ] Charts render
- [ ] Export PDF works

---

## API Routes Testing

### POST /api/test-runs

```bash
# Test: Create test run
curl -X POST http://localhost:3000/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_version_id": "uuid-here",
    "mode": "single",
    "tool_scenario_id": "happy_path"
  }'

# Expected: 201 with test_run object
# Current: FAILS due to .rpc('increment') bug
```

### POST /api/test-runs/[id]/abort

```bash
curl -X POST http://localhost:3000/api/test-runs/xxx/abort
# Expected: 200 with updated status
```

### POST /api/n8n/webhook

```bash
# Test: Webhook callback
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test_runner",
    "test_run_id": "xxx",
    "status": "completed",
    "results": [...]
  }'
```

### GET /api/settings

```bash
curl http://localhost:3000/api/settings
# Expected: workflow_configs array
```

---

## Fix Implementation Order

### Sprint 1: Critical (P0) - ~4h

1. [x] Fix .rpc('increment') bug ✅ FIXED 2026-01-23
2. [x] Fix saveBattleResult error handling ✅ FIXED 2026-01-23
3. [ ] Stub real connection for BattleArena (or clear "demo mode" indicator)
4. [ ] Document TestRunStatusMonitor edit as Phase 8 blocker

### Sprint 2: High (P1) - ~6h

5. [x] Add webhook idempotency ✅ FIXED 2026-01-23
6. [x] Fix race condition in updateConversationNotes ✅ FIXED 2026-01-23
7. [ ] Connect Agentic page to real data
8. [ ] Fix N8N connection status badge
9. [x] Remove duplicate score badge ✅ FIXED 2026-01-23
10. [ ] Fix PersonaWorkshop props

### Sprint 3: Medium (P2) - ~4h

11. [ ] Standardize language (English or Italian)
12. [ ] Create shared UUID validation utility
13. [ ] Investigate DashboardContent duplication
14. [ ] Improve scroll sync in ConversationCompare
15. [ ] Add mobile navigation

---

## Test Execution Checklist

### Pre-requisiti

- [ ] `.env.local` configurato con Supabase credentials
- [ ] `pnpm install` eseguito
- [ ] `pnpm dev` running su localhost:3000
- [ ] Supabase project accessibile
- [ ] N8N webhooks configurati (se testing integrazioni)

### Esecuzione Test

Per ogni Journey:
1. [ ] Eseguire steps manualmente
2. [ ] Documentare failures
3. [ ] Verificare console errors (browser)
4. [ ] Verificare network errors (DevTools)
5. [ ] Verificare DB state dopo operazioni

---

## Notes

- Questo documento va aggiornato man mano che i fix vengono implementati
- Ogni fix deve essere testato manualmente prima di considerarlo completato
- Priority P0 deve essere risolto prima di procedere con P1
