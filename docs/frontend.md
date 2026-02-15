# Frontend Architecture

## Pages

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `DashboardContent` | Main dashboard — KPIs, heatmap, test runs, latest conversations |
| `/conversations` | `ConversationExplorer` | Filterable conversation list with transcript + evaluation side-by-side |
| `/executive` | `ExecutiveDashboard` | Executive-level analytics, persona leaderboard, booking funnel |
| `/prompts` | `PromptVersionsHub` | Prompt version management, diff viewer |
| `/settings` | Settings form | n8n workflow config, general settings, DB status |
| `/test-launcher` | Test config UI | Launch tests, view history, configure scenarios |
| `/test-diff-viewer` | `PromptDiffViewer` | Phase 7 demo — prompt version diff viewer |
| `/personas` | `PersonaWorkshop` | Persona management, validation, feedback |
| `/agentic` | `AgentHealthContent` | Agent health monitor, optimization panel |
| `/evaluators` | Evaluator configs table | CRUD for evaluator configurations |

## Component Organization

```
components/
├── dashboard/          # Dashboard sub-components (KPIs, test runs list, latest conversations)
├── agentic/            # Agent health, optimization, n8n status
├── version-centric/    # Prompt versions hub, persona workshop
├── ui/                 # shadcn/ui primitives (~80 components)
└── *.tsx               # Feature components (conversations, evaluator, filters, etc.)
```

**Pattern**: Page components (`app/**/page.tsx`) are minimal wrappers that delegate to feature components in `components/`.

## Components by Area

### Dashboard

| Component | File | Purpose |
|-----------|------|---------|
| `DashboardContent` | `dashboard-content.tsx` | Main dashboard page, fetches own data |
| `FilterBar` | `filter-bar.tsx` | Persona, outcome, score range filters |
| `KPICards` | `dashboard/kpi-cards.tsx` | KPI card grid (total, avg score, success rate, efficiency) |
| `TestRunsList` | `dashboard/test-runs-list.tsx` | Recent test runs table |
| `LatestConversations` | `dashboard/latest-conversations.tsx` | Latest conversations list |
| `ExportMenu` | `export-menu.tsx` | CSV/PDF/JSON export dropdown |

### Conversations

| Component | File | Purpose |
|-----------|------|---------|
| `ConversationExplorer` | `conversation-explorer.tsx` | Filterable list + side-by-side view |
| `ConversationTranscript` | `conversation-transcript.tsx` | Individual conversation display |
| `ConversationEvaluation` | `conversation-evaluation.tsx` | Evaluation criteria breakdown |
| `ConversationNotes` | `conversation-notes.tsx` | Human notes editor |
| `ConversationCompare` | `conversation-compare.tsx` | Side-by-side comparison |

### Visualizations

| Component | File | Purpose |
|-----------|------|---------|
| `PersonasHeatmap` | `personas-heatmap.tsx` | Persona performance heatmap |
| `PersonaTestRunsView` | `persona-testruns-view.tsx` | Test run history per persona |
| `SimpleTrends` | `simple-trends.tsx` | Score trends over time (Recharts) |
| `AIInsights` | `ai-insights.tsx` | AI-generated insights card |

### Executive

| Component | File | Purpose |
|-----------|------|---------|
| `ExecutiveDashboard` | `executive-dashboard.tsx` | High-level executive view |
| `ExecutiveKPIs` | `executive-kpis.tsx` | Executive KPI cards |
| `PersonaLeaderboard` | `persona-leaderboard.tsx` | Top/bottom persona ranking |
| `AppointmentsFunnel` | `appointments-funnel.tsx` | Booking funnel visualization |

### Agentic Testing

| Component | File | Purpose |
|-----------|------|---------|
| `AgentSelector` | `agentic/agent-selector.tsx` | Agent dropdown |
| `HealthMonitor` | `agentic/health-monitor.tsx` | Agent health metrics |
| `AgentDetails` | `agentic/agent-details.tsx` | Detailed agent metrics |
| `OptimizationPanel` | `agentic/optimization-panel.tsx` | Optimization trigger UI |
| `N8NStatusBar` | `agentic/n8n-status-bar.tsx` | n8n workflow status footer |

### Version-Centric

| Component | File | Purpose |
|-----------|------|---------|
| `PromptVersionsHub` | `version-centric/prompt-versions-hub.tsx` | Prompt versions management |
| `PersonaWorkshop` | `version-centric/persona-workshop.tsx` | Persona validation UI |

### Evaluator

| Component | File | Purpose |
|-----------|------|---------|
| `EvaluatorConfigForm` | `evaluator-config-form.tsx` | Create/edit evaluator config |
| `CriteriaEditor` | `criteria-editor.tsx` | Dynamic criteria editor |
| `EvaluationsList` | `evaluations-list.tsx` | Evaluations for test run |
| `EvaluationCompareView` | `evaluation-compare-view.tsx` | Compare evaluation results |
| `ReEvaluateModal` | `re-evaluate-modal.tsx` | Re-evaluation trigger dialog |

### Utility

| Component | File | Purpose |
|-----------|------|---------|
| `AppSidebar` | `app-sidebar.tsx` | Main navigation sidebar |
| `Providers` | `providers.tsx` | React Query + Theme provider wrapper |
| `ThemeProvider` | `theme-provider.tsx` | next-themes wrapper |
| `ThemeToggle` | `theme-toggle.tsx` | Theme switcher button |
| `DateRangePicker` | `date-range-picker.tsx` | Date range selector |
| `BattleNotesPanel` | `battle-notes-panel.tsx` | Battle result notes UI |
| `TestRunStatusMonitor` | `test-run-status-monitor.tsx` | Real-time test run monitoring |
| `PromptDiffViewer` | `prompt-diff-viewer.tsx` | Prompt version diff viewer |

## Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTestRunStatus` | `hooks/use-test-run-status.ts` | Poll test run status (5s when active) |
| `useAbortTestRun` | `hooks/use-test-run-status.ts` | Abort test run mutation |
| `useTestRuns` | `hooks/use-test-run-status.ts` | List test runs with filters |
| `useAgentHealth` | `hooks/use-agent-health.ts` | Fetch agent health metrics |
| `useAgentDetails` | `hooks/use-agent-details.ts` | Fetch detailed agent metrics |
| `useBattleNotes` | `hooks/use-battle-notes.ts` | Fetch/create battle notes |
| `useToast` | `hooks/use-toast.ts` | Toast notification manager |
| `useMobile` | `hooks/use-mobile.ts` | Responsive breakpoint detection |

## State Management

| Pattern | Where | How |
|---------|-------|-----|
| `useState` | All components | Primary state management |
| `useMemo` | Dashboard, filters | Derived/filtered data caching |
| React Query | Agentic, test runs | Server state with caching + polling |
| Context | Theme only | `ThemeProvider` via next-themes |

**No Redux/Zustand.** All components use client-side rendering (`"use client"`), no Server Components.

### Data Fetching Patterns

**Direct Fetch** (Dashboard, Conversations):
```
useEffect → fetch() → setState → useMemo filters → render
```

**React Query** (Agentic, Test Launcher):
```
useQuery → cache → auto-refetch/polling → render
```

### Filtering

Dashboard and Conversation Explorer use `useMemo` on raw data:
- Filter state: `selectedPersona`, `selectedOutcomes`, `scoreRange`, `showBookedOnly`
- `FilterBar` component updates state → `useMemo` recalculates → re-render

### Polling

| Feature | Interval | Condition |
|---------|----------|-----------|
| Test runs | 5s | Status in `['pending', 'running', 'battles_completed', 'evaluating']` |
| Agent health | Manual | No auto-polling |
| Dashboard | Manual | User-triggered refresh only |

## Styling

- **Framework**: Tailwind CSS 4.1.9
- **Components**: shadcn/ui (Radix UI primitives)
- **Theme**: Slate (blu-grigio), light/dark/system via next-themes
- **Fonts**: DM Sans (body) + Space Mono (code)
- **Icons**: Lucide React
- **Charts**: Recharts
