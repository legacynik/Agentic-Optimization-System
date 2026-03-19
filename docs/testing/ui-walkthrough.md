# UI Walkthrough Checklist

> Manual verification of all dashboard pages. Run `pnpm dev` and check each item.
> Date: ____  Tester: ____

## Instructions

1. Run `pnpm dev`
2. Open http://localhost:3000
3. Check each item, mark `[x]` when verified
4. Note issues in the "Issues" column
5. Test in both light and dark themes (toggle in sidebar)

---

## Global / Layout

| # | Check | Pass | Issues |
|---|-------|------|--------|
| G1 | Sidebar renders with all nav groups: Dashboard, Testing, Configuration, Intelligence | [ ] | |
| G2 | Sidebar collapse/expand toggle works (bottom button) | [ ] | |
| G3 | Active page is highlighted in sidebar | [ ] | |
| G4 | All sidebar links navigate to their pages without console errors | [ ] | |
| G5 | Theme toggle works (light/dark/system) | [ ] | |
| G6 | No layout shift or flash of unstyled content on initial load | [ ] | |

---

## `/` -- Dashboard (Home)

Component: `DashboardContent`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| D1 | Page loads without errors; skeleton shows while loading | [ ] | |
| D2 | 4 KPI cards display: Total Runs, Avg Score, Success Rate, Avg Turns | [ ] | |
| D3 | KPI values are not NaN, undefined, or 0 when data exists in DB | [ ] | |
| D4 | Score Trend line chart renders with axes and data points | [ ] | |
| D5 | Criteria Radar chart renders with labeled axes | [ ] | |
| D6 | Recent Test Runs table shows rows with status badges, scores, dates | [ ] | |
| D7 | Clicking a test run row or link navigates to `/test-runs/[id]` | [ ] | |
| D8 | Empty state: if no data, a meaningful message is shown (not blank/broken) | [ ] | |

---

## `/test-launcher` -- Test Launcher

Component: `TestLauncherPage`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| TL1 | Page loads; prompt versions dropdown populates from Supabase | [ ] | |
| TL2 | Selecting a prompt version shows persona count and details | [ ] | |
| TL3 | Scenario selector shows available tool scenarios | [ ] | |
| TL4 | "Launch Test" button is disabled until a prompt version is selected | [ ] | |
| TL5 | Launching a test shows loading spinner and status updates | [ ] | |
| TL6 | Test history tab displays previous test runs with status badges | [ ] | |
| TL7 | Test Run Status Monitor updates in real-time for running tests | [ ] | |
| TL8 | Error handling: invalid/missing webhook shows alert, not crash | [ ] | |

---

## `/test-runs` -- Test Runs List

Component: `TestRunsPage`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| TR1 | Page loads; table of test runs displays with columns: code, status, mode, score, counts | [ ] | |
| TR2 | Status badges render with correct variant colors (completed=default, failed=destructive, etc.) | [ ] | |
| TR3 | Status filter dropdown works (all, completed, running, failed, etc.) | [ ] | |
| TR4 | Clicking a row navigates to `/test-runs/[id]` detail page | [ ] | |
| TR5 | Skeleton loading state shows while data is fetching | [ ] | |
| TR6 | Empty state renders gracefully when no test runs exist | [ ] | |

---

## `/test-runs/[id]` -- Test Run Detail

Component: `TestRunDetailPage` + `EvaluationsList`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| TD1 | Page loads for a valid test run ID; header shows test run code and status | [ ] | |
| TD2 | Metadata cards display: prompt name, version, mode, iterations, scores | [ ] | |
| TD3 | Back button (`<- Back to Test Runs`) navigates to `/test-runs` | [ ] | |
| TD4 | Evaluations list renders with individual conversation evaluations | [ ] | |
| TD5 | Score values are formatted correctly (not NaN or undefined) | [ ] | |
| TD6 | 404/error handling: navigating to a non-existent ID shows error state | [ ] | |

---

## `/conversations` -- Conversations Explorer

Component: `ConversationsV2`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| C1 | Page loads; conversation list populates | [ ] | |
| C2 | Search/filter bar is functional (text search, category, persona, outcome) | [ ] | |
| C3 | Conversation cards show summary, outcome badge, score, persona info | [ ] | |
| C4 | Clicking a conversation shows transcript in side panel or detail view | [ ] | |
| C5 | Evaluation criteria breakdown displays for selected conversation | [ ] | |
| C6 | Sorting works (by score, date, etc.) | [ ] | |
| C7 | Empty state or no-results state renders correctly | [ ] | |

---

## `/prompts` -- Prompt Versions Hub

Component: `PromptVersionsHub`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| P1 | Page loads; prompt versions list displays | [ ] | |
| P2 | Each prompt version card/row shows name, version, status | [ ] | |
| P3 | Version comparison or diff viewer is accessible | [ ] | |
| P4 | Create/edit prompt version form works (if implemented) | [ ] | |
| P5 | Status badges (production, testing, draft) display correctly | [ ] | |
| P6 | Navigation to related test runs or evaluations works | [ ] | |

---

## `/evaluators` -- Evaluator Configs

Component: `EvaluatorsPage`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| E1 | Page loads; evaluator configs table displays | [ ] | |
| E2 | Columns show: name, version, prompt association, status, criteria summary | [ ] | |
| E3 | "Add Evaluator" button opens `EvaluatorConfigForm` dialog | [ ] | |
| E4 | Edit button opens form pre-filled with existing config | [ ] | |
| E5 | Delete button shows confirmation and removes entry | [ ] | |
| E6 | Star/default toggle works to set default evaluator | [ ] | |
| E7 | Status badges (draft, active, deprecated) render with correct styling | [ ] | |
| E8 | Criteria taxonomy (core + domain) displays in expanded view | [ ] | |

---

## `/personas` -- Personas Workshop

Component: `PersonasPage` + `PersonaWorkshop`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| PE1 | Page loads; prompt selector dropdown populates | [ ] | |
| PE2 | Selecting a prompt filters personas for that prompt version | [ ] | |
| PE3 | Persona cards/list displays with name, category, description | [ ] | |
| PE4 | "All" option in selector shows all personas across prompts | [ ] | |
| PE5 | Create/edit persona functionality works (if implemented) | [ ] | |
| PE6 | Empty state shows when no personas exist for selected prompt | [ ] | |

---

## `/settings` -- Settings (Workflow Configs)

Component: `SettingsPage`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| S1 | Page loads; tabs display (General, Workflows, Database, etc.) | [ ] | |
| S2 | Workflow configs show for: test_runner, evaluator, persona_generator | [ ] | |
| S3 | Webhook URL input fields are editable | [ ] | |
| S4 | Active/inactive switch toggles and persists on save | [ ] | |
| S5 | "Test Connection" button sends a test ping and shows success/failure | [ ] | |
| S6 | "Save" button persists changes and shows confirmation feedback | [ ] | |
| S7 | Last tested timestamp displays correctly (or "Never" if null) | [ ] | |

---

## `/agentic` -- Agent Health Monitor

Component: `AgenticPage` + `AgentSelector`, `HealthMonitor`, `AgentDetails`, `OptimizationPanel`, `N8NStatusBar`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| A1 | Page loads; agent selector dropdown populates | [ ] | |
| A2 | Selecting an agent updates health monitor, details, and optimization panel | [ ] | |
| A3 | Health monitor displays score, trend direction, and insights | [ ] | |
| A4 | Agent details panel shows issues list, related personas, and trend chart | [ ] | |
| A5 | Optimization panel shows feedback and trigger button | [ ] | |
| A6 | N8N Status Bar shows workflow connection status (green/red) | [ ] | |
| A7 | Loading skeletons display while data is fetching | [ ] | |
| A8 | Error state handled if no agents or API failure | [ ] | |

---

## `/executive` -- Executive Dashboard (Placeholder)

Component: `ExecutivePage`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| EX1 | Page loads with placeholder message ("Coming in Phase 4") | [ ] | |
| EX2 | Link to Dashboard (`/`) works | [ ] | |
| EX3 | No console errors on page load | [ ] | |

---

## `/test-diff-viewer` -- Prompt Diff Viewer (Test Page)

Component: `TestDiffViewerPage` + `PromptDiffViewer`

| # | Check | Pass | Issues |
|---|-------|------|--------|
| DV1 | Page loads; diff viewer renders with sample old/new prompt text | [ ] | |
| DV2 | Diff highlights additions (green) and deletions (red) | [ ] | |
| DV3 | Side-by-side or unified view toggle works (if implemented) | [ ] | |
| DV4 | No console errors or unhandled exceptions | [ ] | |

---

## Cross-Cutting Concerns

| # | Check | Pass | Issues |
|---|-------|------|--------|
| X1 | All pages handle Supabase connection failure gracefully (no white screen) | [ ] | |
| X2 | Browser console shows no unhandled errors across all pages | [ ] | |
| X3 | Responsive: pages render reasonably at 1024px, 768px widths | [ ] | |
| X4 | Dark mode: all pages readable, no invisible text or broken contrast | [ ] | |
| X5 | Loading states: every data-fetching page shows skeleton or spinner | [ ] | |
| X6 | Navigation: browser back/forward buttons work correctly | [ ] | |
| X7 | URL direct access: pasting any page URL loads it correctly (no client-only crash) | [ ] | |

---

## Summary

| Section | Total Checks | Passed | Failed | Skipped |
|---------|-------------|--------|--------|---------|
| Global / Layout | 6 | | | |
| Dashboard | 8 | | | |
| Test Launcher | 8 | | | |
| Test Runs | 6 | | | |
| Test Run Detail | 6 | | | |
| Conversations | 7 | | | |
| Prompts | 6 | | | |
| Evaluators | 8 | | | |
| Personas | 6 | | | |
| Settings | 7 | | | |
| Agent Health | 8 | | | |
| Executive | 3 | | | |
| Diff Viewer | 4 | | | |
| Cross-Cutting | 7 | | | |
| **TOTAL** | **90** | | | |

### Blocking Issues

_List any issues that prevent further testing:_

1. ...

### Non-Blocking Issues

_List cosmetic or minor issues:_

1. ...
