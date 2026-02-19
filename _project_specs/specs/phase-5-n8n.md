---
phase: 5
name: "n8n Workflows Implementation"
status: complete
created: 2026-01-23
last_updated: 2026-02-18
last_tested: 2026-02-18
tested_by: nic + claude
pending_items: 0
deferred_items: 3
blockers: []
---

# Phase 5: n8n Workflows Implementation

> Configure n8n workflows to execute test battles, evaluate results, and generate personas.

## Overview

This phase implements the n8n workflow modifications required to support the PRD v2.4 architecture. Includes Test Runner, Battle Agent v2.0, Evaluator, and Personas Generator workflows.

## Requirements

### Must Have (Core)
- [x] REQ-5.1: Test RUNNER workflow with webhook trigger + manual trigger
- [x] REQ-5.2: Battle Agent v2.0 aligned with PRD v2.4 (no individual turns storage)
- [x] REQ-5.3: Battles Evaluator with test_run_id filter (AUDIT FIX)
- [x] REQ-5.4: Personas Generator v2 with webhook + validation
- [x] REQ-5.5: Check Abort #1 (before LLM call) in Runner
- [x] REQ-5.9: Update test_run status to 'completed' at end
- [~] REQ-5.6: Check Abort #2 (after LLM call) — **DEFERRED**: Abort #1 sufficient, abort works (slightly slower)
- [~] REQ-5.7: x-n8n-secret header on callbacks — **DEFERRED**: Dev mode accepts without, single-user internal tool
- [~] REQ-5.8: Tool Mocking in Battle Agent — **DEFERRED**: Tools work live, mocking adds no value vs live testing

### Nice to Have (defer)
- [ ] OPT-5.1: Heartbeat updates during long battles

## Implementation Reference

| Component | Location | Status |
|-----------|----------|--------|
| Test RUNNER | n8n: XmpBhcUxsRpxAYPN | ✅ |
| Battle Agent v2.0 | n8n: Z35cpvwXt7Xy4Mgi | 🔶 |
| Evaluator | n8n: 202JEX5zm3VlrUT8 | ✅ |
| Personas Generator | n8n: HltftwB9Bm8LNQsO | ✅ |
| Webhook handler | `app/api/n8n/webhook/route.ts` | ✅ |

## Acceptance Criteria

### Criteria Checklist
- [x] AC-5.1: Webhook trigger starts test run correctly
- [x] AC-5.2: Manual trigger works from n8n UI
- [x] AC-5.3: Battle results stored in `battle_results` table (not `turns`)
- [x] AC-5.4: Evaluator filters by test_run_id
- [x] AC-5.5: Personas generated with correct prompt association
- [x] AC-5.9: test_runs.status = 'completed' after all battles
- [~] AC-5.6: Abort request stops battle within 5 seconds — DEFERRED
- [~] AC-5.7: Callbacks include x-n8n-secret header — DEFERRED
- [~] AC-5.8: Tool scenarios return mocked responses — DEFERRED

## Manual Test Script

### Prerequisites
- [x] n8n running on Railway
- [x] Supabase accessible
- [x] .env.local configured with N8N_SECRET
- [x] At least 1 prompt_version in DB
- [x] At least 2 validated personas linked to prompt

### Test Steps

#### Test 5.1: Start Test Run via Dashboard
```
1. Open dashboard at localhost:3000
2. Go to Test Launcher page
3. Select a prompt version
4. Select mode: 'single'
5. Click "Start Test"
6. Check n8n execution log

Expected: Test run created, battles execute, results in DB
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 5.2: Abort Test Run
```
1. Start a test run with 5+ personas (takes time)
2. While running, click "Abort" button
3. Check n8n execution
4. Check test_runs.status in DB

Expected: Battle stops within 5 sec, status = 'aborted'
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 5.3: Tool Mocking (happy_path)
```
1. Start test run with tool_scenario_id = 'happy_path'
2. Monitor battle conversation
3. Check if tool calls return mocked responses

Expected: AI Agent receives mock calendar/booking data
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 5.4: Security Header
```
1. Start test run
2. Check n8n HTTP Request node logs
3. Verify x-n8n-secret header present

Expected: Header matches N8N_SECRET env var
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 5.5: Status Completed
```
1. Start test run with 2 personas (quick)
2. Wait for completion
3. Query: SELECT status FROM test_runs WHERE id = X

Expected: status = 'completed'
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

## Deferred Items (2026-02-18)

The following items were evaluated and intentionally deferred as non-blocking for production use:

### REQ-5.6: Check Abort #2 — DEFERRED
**Rationale**: Abort #1 (before LLM call) already works. Adding a second check after LLM response would make abort ~5s faster but adds workflow complexity. Current abort is functional.

### REQ-5.7: x-n8n-secret Header — DEFERRED
**Rationale**: Single-user internal tool. Dev mode accepts requests without header. Adding auth on callbacks is an enterprise concern, not needed for current use case.

### REQ-5.8: Tool Mocking — DEFERRED
**Rationale**: Tools will be tested live in production. Mocking happy_path/error scenarios adds artificial testing that doesn't reflect real behavior. Better to test with actual tool integrations.

### REQ-5.9: Status Completed — DONE (2026-02-17)
Implemented in Test RUNNER. Verified in E2E tests (RUN-H9C, RUN-J90).

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Phase 1-4 | Blocks this | ✅ Complete |
| n8n Railway | Required | ✅ Running |
| OpenRouter API | Required | ✅ Active |

## Notes

- Battle Agent v2.0 uses n8n Postgres Chat Memory (auto-manages chat history)
- No more individual `turns` table - all in `battle_results.transcript`
- Evaluator is backward compatible (works with or without test_run_id)

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-01-20 | Battle Agent v2.0 refactor | nic |
| 2026-01-20 | Manual trigger added | nic |
| 2026-01-19 | Initial n8n implementation | nic |
| 2026-01-23 | Created spec from PRD v2.4 | claude |

---

*Token count: ~2,400*
