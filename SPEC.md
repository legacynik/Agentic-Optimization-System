# Spec-Driven Development Plan
## AI Agent Testing Dashboard v1.2

---

## 🎯 Implementation Strategy

This document follows a **test-first, spec-driven approach** with:
- ✅ Detailed specifications for each feature
- 🧪 Test cases defined before implementation
- 📦 Git commit at each milestone
- 🔄 Self-iteration and validation
- 📊 Success criteria for each phase

---

## 📋 Project Phases Overview

| Phase | Feature | Priority | Complexity | Est. Time |
|-------|---------|----------|------------|-----------|
| 0 | Setup & Infrastructure | P0 | Low | 1h |
| 1 | Quick Filters Enhancement | P0 | Low | 2h |
| 2 | Human Notes Tab | P1 | Medium | 3h |
| 3 | Compare Tab | P1 | High | 4h |
| 4 | Client/Executive View | P2 | Medium | 4h |
| 5 | Export Analysis | P1 | Medium | 3h |

---

## Phase 0: Setup & Infrastructure

### Spec
**Goal**: Initialize git, add missing dependencies, configure state management

**Dependencies to Add**:
```json
{
  "zustand": "^5.0.2",
  "@tanstack/react-query": "^5.62.11",
  "@tiptap/react": "^2.10.4",
  "@tiptap/starter-kit": "^2.10.4",
  "@tiptap/extension-placeholder": "^2.10.4",
  "jspdf": "^2.5.2",
  "papaparse": "^5.4.1"
}
```

**State Management Structure** (Zustand):
```typescript
// stores/dashboard-store.ts
interface DashboardState {
  // Filters
  dateRange: [Date, Date]
  selectedPersona: string | null
  selectedOutcomes: string[]
  scoreRange: [number, number]
  showBookedOnly: boolean

  // Selected conversations (for compare)
  selectedConversations: string[]

  // Actions
  setDateRange: (range: [Date, Date]) => void
  setSelectedPersona: (persona: string | null) => void
  toggleOutcome: (outcome: string) => void
  setScoreRange: (range: [number, number]) => void
  toggleShowBooked: () => void
  toggleConversationSelection: (id: string) => void
  clearSelections: () => void
}
```

**React Query Setup**:
```typescript
// lib/react-query.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
})
```

### Test Cases
- [ ] Git repository initialized
- [ ] All dependencies installed without errors
- [ ] Zustand store created and exports correctly
- [ ] QueryClient configured and wrapped in root layout
- [ ] TypeScript compilation succeeds
- [ ] Dev server starts without errors

### Success Criteria
- ✅ `git status` shows clean repository
- ✅ `pnpm install` completes successfully
- ✅ `pnpm dev` runs without warnings
- ✅ `pnpm build` succeeds

### Git Commit
```
feat: setup project infrastructure with zustand and react-query

- Add state management with Zustand
- Configure React Query for data fetching
- Setup TypeScript types for stores
- Configure query client with retry logic
```

---

## Phase 1: Quick Filters Enhancement

### Spec

**Feature**: Add "Booked Appointments" toggle and outlier badges to filter bar

**UI Components**:
1. **Booked Toggle**
   - Switch component with label "Show Booked Only"
   - Icon: Calendar icon from lucide-react
   - Position: After score range slider
   - State: Connected to Zustand store

2. **Outlier Badges**
   - Display next to persona filter
   - Show P10 and P90 score values
   - Badges: variant="outline" with muted colors
   - Tooltip on hover explaining percentile
   - Auto-calculate from current filtered dataset

**Data Requirements**:
```typescript
interface OutlierData {
  p10: number  // 10th percentile score
  p90: number  // 90th percentile score
}

function calculateOutliers(scores: number[]): OutlierData {
  const sorted = [...scores].sort((a, b) => a - b)
  const p10Index = Math.floor(sorted.length * 0.1)
  const p90Index = Math.floor(sorted.length * 0.9)
  return {
    p10: sorted[p10Index],
    p90: sorted[p90Index]
  }
}
```

**Component Update**: `components/filter-bar.tsx`
```typescript
interface FilterBarProps {
  // ... existing props
  onBookedToggle: () => void
  showBookedOnly: boolean
  outliers: OutlierData
}
```

### Test Cases
- [ ] Toggle switches between "All" and "Booked Only" states
- [ ] Outlier badges display correct P10/P90 values
- [ ] Outlier badges update when filters change
- [ ] Tooltip shows on hover with explanation
- [ ] Filter state persists in Zustand store
- [ ] Filtered data reflects booked-only when toggled
- [ ] Visual regression: matches design spec

### Acceptance Criteria
- ✅ Toggle filters conversations to show only those with `appointment: true`
- ✅ Outlier badges calculate correctly from filtered dataset
- ✅ UI is responsive on mobile (toggle stacks below)
- ✅ Accessible: keyboard navigation works, ARIA labels present

### Git Commit
```
feat: add booked toggle and outlier badges to quick filters

- Add booked appointments filter toggle
- Calculate and display P10/P90 outlier badges
- Connect filters to Zustand store
- Add tooltips with percentile explanations
```

---

## Phase 2: Human Notes Tab

### Spec

**Feature**: Rich text editor for adding human notes to conversations

**UI Layout**:
```
┌─ Tabs ────────────────────────────┐
│ Transcript | Evaluation | Notes    │
├──────────────────────────────────┤
│  [Rich Text Editor]              │
│                                  │
│  Toolbar: [B] [I] [•] [1.]      │
│                                  │
│  Auto-saved: 2 min ago          │
│                                  │
│  [Save Button] (primary)         │
└──────────────────────────────────┘
```

**Editor Features**:
- Tiptap editor with StarterKit
- Toolbar: Bold, Italic, BulletList, OrderedList
- Placeholder: "Add your notes about this conversation..."
- Auto-save every 30 seconds (debounced)
- Manual save button
- Character count (optional, max 5000)
- Last saved timestamp

**Data Flow**:
```typescript
interface ConversationNotes {
  conversationId: string
  humanNotes: string  // HTML string from Tiptap
  lastSaved: Date
}

// API call
async function saveNotes(id: string, notes: string): Promise<void> {
  await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ human_notes: notes })
  })
}
```

**Component Structure**:
```
components/
  conversation-notes.tsx  (NEW)
    - TiptapEditor wrapper
    - Auto-save logic
    - Save button with loading state
    - Toast notifications
```

**Supabase Update**:
```typescript
// lib/queries.ts
export async function updateConversationNotes(
  conversationId: string,
  notes: string
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('conversations')
    .update({ human_notes: notes })
    .eq('id', conversationId)

  if (error) throw error
}
```

### Test Cases
- [ ] Editor renders with empty state
- [ ] Editor loads existing notes from database
- [ ] Toolbar buttons work (bold, italic, lists)
- [ ] Auto-save triggers after 30s of inactivity
- [ ] Manual save button saves immediately
- [ ] Success toast appears on save
- [ ] Error toast appears on failed save
- [ ] Loading state shown during save
- [ ] Last saved timestamp updates correctly
- [ ] Character count displays (if implemented)
- [ ] Notes persist after page reload

### Acceptance Criteria
- ✅ Notes save successfully to Supabase
- ✅ Auto-save prevents data loss
- ✅ User receives clear feedback (toast + timestamp)
- ✅ Editor is accessible (keyboard shortcuts work)
- ✅ HTML output is sanitized to prevent XSS

### Git Commit
```
feat: add human notes tab with rich text editor

- Implement Tiptap editor with toolbar
- Add auto-save functionality (30s debounce)
- Add manual save button with loading state
- Display last saved timestamp
- Add toast notifications for save status
- Connect to Supabase for persistence
```

---

## Phase 3: Compare Tab

### Spec

**Feature**: Side-by-side comparison of 2-4 selected conversations

**Activation**:
- Tab only visible when `selectedConversations.length >= 2`
- Badge on tab shows count: "Compare (3)"
- Max 4 conversations can be selected

**Selection Mechanism**:
```typescript
// In conversation list items
<Checkbox
  checked={isSelected}
  onCheckedChange={() => toggleSelection(conv.id)}
  aria-label={`Select conversation ${conv.id}`}
/>
```

**Layout**:
```
┌─ Compare (3) ──────────────────────────────────┐
│                                                │
│  ┌─────────┬─────────┬─────────┬─────────┐   │
│  │ Conv A  │ Conv B  │ Conv C  │ Conv D  │   │
│  ├─────────┼─────────┼─────────┼─────────┤   │
│  │ Turn 1  │ Turn 1  │ Turn 1  │ Turn 1  │   │
│  │ Turn 2  │ Turn 2  │ Turn 2  │ Turn 2  │   │
│  └─────────┴─────────┴─────────┴─────────┘   │
│                                                │
│  [✓] Sync Scroll   [Export Comparison]        │
│                                                │
│  Criteria Comparison:                          │
│  ┌───────────────┬─────┬─────┬─────┬─────┐   │
│  │ Criteria      │  A  │  B  │  C  │  D  │   │
│  ├───────────────┼─────┼─────┼─────┼─────┤   │
│  │ Accuracy      │  8  │  9  │  7  │  8  │   │
│  │ Efficiency    │  6  │  8  │  9  │  7  │   │
│  └───────────────┴─────┴─────┴─────┴─────┘   │
└────────────────────────────────────────────────┘
```

**Transcript Sync Scroll**:
```typescript
const [syncScroll, setSyncScroll] = useState(true)

const handleScroll = (e: React.UIEvent<HTMLDivElement>, index: number) => {
  if (!syncScroll) return

  const scrollTop = e.currentTarget.scrollTop
  scrollRefs.current.forEach((ref, i) => {
    if (i !== index && ref.current) {
      ref.current.scrollTop = scrollTop
    }
  })
}
```

**Criteria Highlighting**:
```typescript
// Highlight if difference > threshold (e.g., 2 points)
function getCellHighlight(scores: number[], currentScore: number) {
  const max = Math.max(...scores)
  const min = Math.min(...scores)

  if (currentScore === max && max - min >= 2) return 'bg-green-100'
  if (currentScore === min && max - min >= 2) return 'bg-red-100'
  return ''
}
```

**Export Functionality**:
- PDF: Side-by-side layout with jsPDF
- CSV: Row per turn, columns per conversation

### Test Cases
- [ ] Compare tab only visible with 2+ selections
- [ ] Checkbox selection works in conversation list
- [ ] Max 4 conversations can be selected
- [ ] Transcripts display side-by-side
- [ ] Sync scroll works when enabled
- [ ] Sync scroll can be toggled off
- [ ] Criteria table shows all conversations
- [ ] Cells highlighted correctly for outliers
- [ ] PDF export generates correctly
- [ ] CSV export includes all data
- [ ] Export filename includes timestamp
- [ ] Selection persists when switching tabs

### Acceptance Criteria
- ✅ 2-4 conversations can be compared
- ✅ Transcripts scroll in sync (when enabled)
- ✅ Criteria differences are visually highlighted
- ✅ Export generates readable PDF/CSV
- ✅ UI is responsive (stacks on mobile)

### Git Commit
```
feat: add conversation comparison tab

- Add multi-select checkboxes to conversation list
- Implement side-by-side transcript view
- Add synchronized scrolling toggle
- Create criteria comparison table with highlighting
- Implement PDF and CSV export
- Limit selection to 4 conversations
```

---

## Phase 4: Client/Executive View

### Spec

**Feature**: Executive-friendly dashboard at `/executive` route

**Route**: `app/executive/page.tsx`

**Layout**:
```
┌─ Executive Dashboard ─────────────────────────┐
│  [Date Range Picker]            [Export PDF]  │
│                                                │
│  ┌──────────┬──────────┬──────────┬─────────┐│
│  │Success   │Appts     │Avg Score │Efficiency││
│  │  87%     │  124     │   8.2    │  4.5     ││
│  │  ↑ 5%    │  ↑ 12    │   ↑ 0.3  │  ↓ 0.2   ││
│  └──────────┴──────────┴──────────┴─────────┘│
│                                                │
│  Persona Leaderboard        Appointments      │
│  ┌──────────────────┐      ┌──────────────┐  │
│  │ 🥇 Persona A     │      │ Funnel Chart │  │
│  │    9.2  [▁▂▃▅▇]  │      │              │  │
│  │ 🥈 Persona B     │      └──────────────┘  │
│  │    8.8  [▃▅▇▅▃]  │                         │
│  │ 🥉 Persona C     │      Simple Trends      │
│  │    8.5  [▅▇▅▃▁]  │      ┌──────────────┐  │
│  │ ...              │      │ Line Chart   │  │
│  │ 📉 Persona X     │      │              │  │
│  │    6.2  [▇▅▃▁▁]  │      └──────────────┘  │
│  └──────────────────┘                         │
│                                                │
│  AI Insights                                   │
│  ┌──────────────────────────────────────────┐ │
│  │ 💡 Persona A improved 15% vs last week   │ │
│  │ 💡 Booking rate increased in Category B  │ │
│  │ 💡 Avg turns decreased by 1.2 (faster!)  │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**KPI Cards**:
```typescript
interface KPICard {
  title: string
  value: string | number
  change: number  // percentage
  trend: 'up' | 'down' | 'neutral'
  icon: LucideIcon
}

const kpis: KPICard[] = [
  { title: 'Success Rate', value: '87%', change: 5, trend: 'up', icon: CheckCircle2 },
  { title: 'Appointments', value: 124, change: 12, trend: 'up', icon: Calendar },
  { title: 'Avg Score', value: 8.2, change: 0.3, trend: 'up', icon: TrendingUp },
  { title: 'Efficiency', value: 4.5, change: -0.2, trend: 'down', icon: Zap }
]
```

**Persona Leaderboard**:
```typescript
interface PersonaRanking {
  personaId: string
  name: string
  avgScore: number
  rank: number  // 1-3 for top, -1 to -3 for bottom
  trend: number[]  // sparkline data (last 7 days)
}
```

**AI Insights** (placeholder for now):
```typescript
// Future: GPT-generated insights from data
// For now: Template-based insights
const insights = [
  generateTrendInsight(data),
  generateBookingInsight(data),
  generateEfficiencyInsight(data)
]

function generateTrendInsight(data: DashboardData): string {
  const topPersona = data.personas[0]
  const change = calculateWeekOverWeekChange(topPersona)
  return `${topPersona.name} improved ${change}% vs last week`
}
```

**Appointments Funnel**:
```typescript
interface FunnelData {
  total: number
  successful: number
  booked: number
}

// Recharts Funnel Chart
<FunnelChart data={[
  { name: 'Total Conversations', value: 1000 },
  { name: 'Successful', value: 870 },
  { name: 'Booked', value: 124 }
]} />
```

### Test Cases
- [ ] Route `/executive` renders correctly
- [ ] KPI cards display correct values
- [ ] Trend arrows show up/down correctly
- [ ] Leaderboard shows top 3 and bottom 3
- [ ] Sparklines render in leaderboard
- [ ] Appointments funnel displays correctly
- [ ] Simple trends chart shows data
- [ ] AI insights generate correctly
- [ ] Date range filter works
- [ ] PDF export includes all sections
- [ ] Page is responsive on mobile
- [ ] Loading states show while fetching

### Acceptance Criteria
- ✅ All KPIs calculate correctly from data
- ✅ Leaderboard ranks personas accurately
- ✅ Charts are readable and clear
- ✅ Insights are helpful and accurate
- ✅ Export generates professional PDF
- ✅ Non-technical users can understand the page

### Git Commit
```
feat: add executive/client dashboard view

- Create /executive route with simplified KPIs
- Add large KPI cards with trend indicators
- Implement persona leaderboard with sparklines
- Add appointments funnel chart
- Create AI insights section with templates
- Add simple trend charts
- Implement PDF export for executive report
```

---

## Phase 5: Export Analysis

### Spec

**Feature**: Comprehensive data export functionality for analysis and reporting

**Export Formats**:
1. **CSV Export** - Raw data for Excel/spreadsheet analysis
2. **PDF Report** - Professional formatted report
3. **JSON Export** - Developer-friendly data export

**Export Locations**:
- Dashboard Overview (all data)
- Conversation Explorer (filtered conversations)
- Compare Tab (comparison data)
- Executive View (executive summary)

### Export Components

#### 1. Export Button Component
```typescript
// components/export-button.tsx
interface ExportButtonProps {
  data: any
  filename: string
  format: 'csv' | 'pdf' | 'json'
  variant?: 'default' | 'outline'
}

export function ExportButton({ data, filename, format, variant }: ExportButtonProps) {
  const handleExport = () => {
    switch (format) {
      case 'csv':
        exportToCSV(data, filename)
        break
      case 'pdf':
        exportToPDF(data, filename)
        break
      case 'json':
        exportToJSON(data, filename)
        break
    }
  }

  return (
    <Button onClick={handleExport} variant={variant}>
      <Download className="h-4 w-4 mr-2" />
      Export {format.toUpperCase()}
    </Button>
  )
}
```

#### 2. CSV Export Utility
```typescript
// lib/export-csv.ts
import Papa from 'papaparse'

export interface ConversationCSVRow {
  conversation_id: number
  persona_id: string
  persona_description: string
  test_run_id: string
  test_date: string
  avg_score: number
  avg_turns: number
  outcome: string
  has_appointment: boolean
  criteria_scores: string // JSON string
  summary: string
  human_notes: string
}

export function exportConversationsToCSV(
  conversations: PersonaPerformanceRow[],
  filename: string
) {
  const rows: ConversationCSVRow[] = conversations.map((conv) => ({
    conversation_id: conv.conversationid,
    persona_id: conv.personaid,
    persona_description: conv.persona_description,
    test_run_id: conv.testrunid,
    test_date: conv.test_date,
    avg_score: conv.avg_score,
    avg_turns: conv.avg_turns,
    outcome: conv.avg_score >= 8 ? 'success' : conv.avg_score >= 6 ? 'partial' : 'failure',
    has_appointment: conv.conversations_summary?.some((c: any) => c.appointment) || false,
    criteria_scores: JSON.stringify(conv.all_criteria_details),
    summary: conv.conversations_summary?.[0]?.summary || '',
    human_notes: conv.conversations_summary?.[0]?.human_notes || '',
  }))

  const csv = Papa.unparse(rows)
  downloadFile(csv, `${filename}.csv`, 'text/csv')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

#### 3. PDF Export Utility
```typescript
// lib/export-pdf.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportDashboardToPDF(data: DashboardData, filename: string) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('AI Agent Testing Dashboard', 14, 20)

  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

  // KPIs Section
  doc.setFontSize(14)
  doc.text('Key Performance Indicators', 14, 40)

  const kpiData = [
    ['Total Tests', data.totalTests],
    ['Average Score', data.avgScore],
    ['Success Rate', `${data.successRate}%`],
    ['Average Efficiency', `${data.avgEfficiency} turns`],
  ]

  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: kpiData,
  })

  // Conversations Table
  doc.addPage()
  doc.setFontSize(14)
  doc.text('Conversations Summary', 14, 20)

  const conversationRows = data.conversations.map((conv) => [
    conv.conversationid,
    conv.personaid,
    conv.avg_score.toFixed(1),
    conv.avg_turns,
    conv.avg_score >= 8 ? 'Success' : conv.avg_score >= 6 ? 'Partial' : 'Failure',
  ])

  autoTable(doc, {
    startY: 25,
    head: [['ID', 'Persona', 'Score', 'Turns', 'Outcome']],
    body: conversationRows,
  })

  // Save
  doc.save(`${filename}.pdf`)
}

export function exportExecutiveReportToPDF(data: ExecutiveData, filename: string) {
  const doc = new jsPDF()

  // Executive Summary Page
  doc.setFontSize(24)
  doc.text('Executive Summary', 14, 20)

  doc.setFontSize(12)
  doc.text(`Report Period: ${data.dateRange}`, 14, 35)

  // KPIs in large format
  doc.setFontSize(16)
  doc.text('Success Rate', 14, 50)
  doc.setFontSize(32)
  doc.text(`${data.successRate}%`, 14, 65)

  doc.setFontSize(16)
  doc.text('Appointments Booked', 14, 85)
  doc.setFontSize(32)
  doc.text(String(data.appointmentsCount), 14, 100)

  // Persona Leaderboard
  doc.addPage()
  doc.setFontSize(16)
  doc.text('Top Performers', 14, 20)

  const leaderboardRows = data.topPersonas.map((p) => [
    p.name,
    p.avgScore.toFixed(1),
    `${p.change > 0 ? '+' : ''}${p.change}%`,
  ])

  autoTable(doc, {
    startY: 25,
    head: [['Persona', 'Avg Score', 'Change']],
    body: leaderboardRows,
  })

  // AI Insights
  doc.addPage()
  doc.setFontSize(16)
  doc.text('Key Insights', 14, 20)

  let yPos = 30
  data.insights.forEach((insight, i) => {
    doc.setFontSize(12)
    doc.text(`${i + 1}. ${insight}`, 14, yPos)
    yPos += 10
  })

  doc.save(`${filename}.pdf`)
}
```

#### 4. JSON Export Utility
```typescript
// lib/export-json.ts
export function exportToJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2)
  downloadFile(json, `${filename}.json`, 'application/json')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

### Export Menu Component

```typescript
// components/export-menu.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Download, FileText, Table, Code } from 'lucide-react'

interface ExportMenuProps {
  data: any
  filename: string
  showPDF?: boolean
  showCSV?: boolean
  showJSON?: boolean
}

export function ExportMenu({ data, filename, showPDF = true, showCSV = true, showJSON = true }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showCSV && (
          <DropdownMenuItem onClick={() => exportToCSV(data, filename)}>
            <Table className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {showPDF && (
          <DropdownMenuItem onClick={() => exportToPDF(data, filename)}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}
        {showJSON && (
          <DropdownMenuItem onClick={() => exportToJSON(data, filename)}>
            <Code className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Integration Points

**1. Dashboard Overview Header**
```typescript
<div className="flex items-center justify-between mb-6">
  <h1>Dashboard Overview</h1>
  <ExportMenu
    data={dashboardData}
    filename={`dashboard-${new Date().toISOString().split('T')[0]}`}
  />
</div>
```

**2. Conversation Explorer Header**
```typescript
<div className="flex items-center justify-between mb-4">
  <h2>Conversations ({filteredConversations.length})</h2>
  <ExportMenu
    data={filteredConversations}
    filename={`conversations-${new Date().toISOString().split('T')[0]}`}
    showPDF={false} // CSV and JSON only for raw data
  />
</div>
```

**3. Executive View Header**
```typescript
<div className="flex items-center justify-between mb-6">
  <h1>Executive Dashboard</h1>
  <Button onClick={() => exportExecutiveReportToPDF(executiveData, 'executive-report')}>
    <FileText className="h-4 w-4 mr-2" />
    Export Report
  </Button>
</div>
```

### Test Cases
- [ ] CSV export generates valid file
- [ ] CSV includes all expected columns
- [ ] CSV data matches displayed data
- [ ] PDF export generates readable document
- [ ] PDF includes all sections (KPIs, tables, charts)
- [ ] PDF formatting is professional
- [ ] JSON export is valid JSON
- [ ] JSON preserves data structure
- [ ] File downloads work in all browsers
- [ ] Filename includes timestamp
- [ ] Large datasets export without errors
- [ ] Export button shows loading state

### Acceptance Criteria
- ✅ All three export formats work correctly
- ✅ Exported data matches filtered view
- ✅ PDF reports are professionally formatted
- ✅ CSV files open correctly in Excel
- ✅ JSON is properly structured and valid
- ✅ Download works in Chrome, Firefox, Safari
- ✅ Large exports (1000+ rows) complete successfully
- ✅ User receives feedback during export

### Git Commit
```
feat: add comprehensive export analysis functionality

- Create ExportMenu dropdown component
- Implement CSV export with papaparse
- Implement PDF export with jsPDF and autoTable
- Implement JSON export utility
- Add export to Dashboard Overview
- Add export to Conversation Explorer
- Add executive report PDF export
- Include download utilities
- Add loading states and user feedback
- Test: all export formats work correctly
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// __tests__/components/filter-bar.test.tsx
describe('FilterBar', () => {
  it('should toggle booked filter', () => {
    // Test implementation
  })

  it('should calculate outliers correctly', () => {
    // Test implementation
  })
})
```

### Integration Tests
```typescript
// __tests__/api/conversations.test.ts
describe('GET /api/conversations', () => {
  it('should filter by persona', async () => {
    // Test implementation
  })

  it('should filter by booked only', async () => {
    // Test implementation
  })
})
```

### E2E Tests (Optional - Playwright)
```typescript
test('complete workflow: filter > select > compare > export', async ({ page }) => {
  await page.goto('/conversations')
  // ... test flow
})
```

---

## 📊 Success Metrics

### Performance
- [ ] Initial page load < 2s
- [ ] API response time < 500ms
- [ ] Smooth scrolling (60fps)
- [ ] No layout shift (CLS < 0.1)

### Quality
- [ ] TypeScript strict mode: no errors
- [ ] ESLint: no warnings
- [ ] Test coverage > 70%
- [ ] Accessibility: WCAG AA compliant

### User Experience
- [ ] Intuitive navigation
- [ ] Clear feedback on actions
- [ ] Responsive on all devices
- [ ] Works offline (cached data)

---

## 🔄 Self-Iteration Checklist

After each phase:
- [ ] Run tests: `pnpm test`
- [ ] Check types: `pnpm type-check`
- [ ] Lint code: `pnpm lint`
- [ ] Build project: `pnpm build`
- [ ] Review UI in browser
- [ ] Test on mobile viewport
- [ ] Commit changes to git
- [ ] Update this spec if deviations needed

---

## 📦 Git Workflow

```bash
# Initial setup
git init
git add .
git commit -m "chore: initial commit with existing dashboard"

# For each phase
git checkout -b feat/phase-1-quick-filters
# ... implement feature
git add .
git commit -m "feat: add booked toggle and outlier badges"
git checkout main
git merge feat/phase-1-quick-filters

# Repeat for phases 2-5
```

---

## 📝 Implementation Order

1. **Phase 0**: Setup (infrastructure) ✅
2. **Phase 1**: Quick Filters (quick win) ✅
3. **Phase 2**: Human Notes (medium complexity)
4. **Phase 3**: Compare Tab (complex, uses export utils)
5. **Phase 5**: Export Analysis (utilities for all views)
6. **Phase 4**: Executive View (uses all features)

---

## 🚀 Deployment Checklist

Before deploying:
- [ ] All tests pass
- [ ] Build succeeds without warnings
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] API endpoints secured (rate limiting)
- [ ] Error tracking configured (Sentry/similar)
- [ ] Analytics configured
- [ ] Performance budget met (<2s LCP)

---

## 📚 Documentation to Update

- [ ] CLAUDE.md - Add new features
- [ ] README.md - Update with new routes
- [ ] API.md - Document all endpoints
- [ ] CHANGELOG.md - Track version changes

---

## Next Steps

Ready to proceed with implementation?
1. Confirm spec alignment with PRD
2. Begin Phase 0: Setup & Infrastructure
3. Implement test-first approach
4. Git commit after each milestone
5. Self-validate and iterate

