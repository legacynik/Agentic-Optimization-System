# AI Agent Testing Dashboard

## 🚀 Quick Reference - Full Stack AI Development

| Need | Tool | Command/Path |
|------|------|--------------|
| **Coding Rules** | Claude Bootstrap | Read `.claude/skills/` |
| **Workflow/Planning** | BMAD Agents | `*workflow-init` |
| **Documentation** | Local Docs | `docs/` and `_project_specs/` |
| **Project Specs** | Local Docs | `_project_specs/` |

---

## ⚡ AI Development Integration

This project uses three complementary AI development systems:

### 1. **Claude Bootstrap** ✅ Installed
- **Purpose**: Enforces coding standards, TDD, security patterns
- **Skills Location**: `.claude/skills/`
- **Key Skills**: base, security, typescript, react-web, supabase-nextjs
- **Commands**: `/code-review`, `/initialize-project`

### 2. **BMAD-METHOD** ✅ Configured
- **Purpose**: Structured workflows with specialized agents
- **Agents Reference**: `.claude/agents/bmad-agents.md`
- **Quick Start**: `*workflow-init` to begin any task
- **21 Agents**: PM, Architect, Dev, QA, Security, DevOps, etc.

### 3. **Archon** 🔒 Deactivated (Not Currently Used)
- **Purpose**: Knowledge base, semantic search, RAG
- **Status**: Intentionally disabled for this project
- **Setup Guide**: `.claude/agents/archon-integration.md` (for future reference)

---

## 📋 Development Workflow

### Starting a New Feature
```
1. *workflow-init          → Choose workflow type
2. *pm                     → Define requirements
3. *architect              → Design solution
4. Read skills             → Apply Bootstrap patterns
5. *dev                    → Implement with TDD
6. /code-review           → Review before commit
```

### Quick Bug Fix
```
1. *workflow-quick        → Fast 5-min workflow
2. *qa                    → Reproduce issue
3. *dev                   → Fix with tests
4. /code-review          → Verify quality
```

### Architecture Changes
```
1. *workflow-enterprise   → 30-min comprehensive workflow
2. *architect             → Design changes
3. *security              → Security review
4. *devops                → Deployment strategy
```

---

## 🛠️ Skills to Follow (Claude Bootstrap)

Before writing ANY code, read and apply these skills:

### Core Skills (Always Apply)
- `.claude/skills/base/SKILL.md` - TDD, simplicity, clean code
- `.claude/skills/security/SKILL.md` - Security-first development
- `.claude/skills/code-review/SKILL.md` - Review requirements
- `.claude/skills/session-management/SKILL.md` - Context preservation
- `.claude/skills/code-deduplication/SKILL.md` - DRY principles

### Tech-Specific Skills
- `.claude/skills/typescript/SKILL.md` - TypeScript best practices
- `.claude/skills/react-web/SKILL.md` - React patterns
- `.claude/skills/supabase-nextjs/SKILL.md` - Supabase integration

---

## Project Overview
A Next.js 14 dashboard for analyzing and visualizing AI agent conversation testing results. Displays persona performance metrics, test run analytics, conversation transcripts, and evaluation criteria across multiple test scenarios.

## Tech Stack
- **Framework**: Next.js 14.2.16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS 4.1.9
- **Component Library**: Radix UI + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: pnpm

## Project Structure
```
├── app/
│   ├── page.tsx                    # Main dashboard page
│   ├── layout.tsx                  # Root layout with theme provider
│   └── conversations/
│       └── page.tsx                # Conversation explorer page
├── components/
│   ├── dashboard-overview.tsx      # Main dashboard with KPIs and charts
│   ├── conversation-explorer.tsx   # Filterable conversation list
│   ├── conversation-transcript.tsx # Individual conversation display
│   ├── conversation-evaluation.tsx # Evaluation criteria breakdown
│   ├── personas-heatmap.tsx        # Performance heatmap visualization
│   ├── persona-testruns-view.tsx   # Test run history for personas
│   ├── filter-bar.tsx              # Dashboard filter controls
│   ├── theme-provider.tsx          # Dark/light mode provider
│   ├── theme-toggle.tsx            # Theme switcher component
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase.ts                 # Supabase client configuration
│   ├── queries.ts                  # Database query functions
│   ├── mock-data.ts                # Sample data for development
│   └── utils.ts                    # Utility functions
└── supabase/
    ├── config.toml                 # Supabase local dev configuration
    └── seed.sql                    # Database seed file

```

## Key Features

### 1. Dashboard Overview (`/`)
- **KPI Cards**: Total tests, average score, success rate, average efficiency
- **Filter Bar**: Filter by persona, outcome (success/partial/failure), score range
- **Personas Heatmap**: Visual representation of persona performance across criteria
- **Test Runs List**: Recent test runs with distribution of outcomes
- **Latest Conversations**: Most recent conversation summaries

### 2. Conversation Explorer (`/conversations`)
- **Advanced Filtering**: Search, category, persona, outcome, score range
- **Conversation List**: Sortable grid of all conversations
- **Side-by-Side View**: Transcript and evaluation criteria
- **Real-time Search**: Filter conversations by content

### 3. Data Model
Main Supabase view: `personas_performance`
```typescript
{
  conversationid: number
  personaid: string
  persona_description: string
  persona_category: string
  testrunid: string
  promptversionid: string
  agentversion: string
  testrun_notes: string
  avg_score: number
  avg_turns: number
  test_date: string
  all_criteria_details: Array<{
    criteria_name: string
    score: number
    conversation_id: number
  }>
  conversations_summary: Array<{
    conversationid: number
    outcome: "success" | "partial" | "failure"
    score: number
    summary: string
    human_notes: string
    turns: number
  }>
  conversations_transcripts: string
}
```

## Environment Setup

### Required Environment Variables
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://dlozxirsmrbriuklgcxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsb3p4aXJzbXJicml1a2xnY3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTE5MDksImV4cCI6MjA2NjI2NzkwOX0.SKIi4wGroLMcZ0q9VRLhTS3pUTHGq-9j3OGEB4Hf4cc
```

### Supabase Configuration
- **Project ID**: dlozxirsmrbriuklgcxq
- **Project URL**: https://dlozxirsmrbriuklgcxq.supabase.co
- **Local Dev Port**: 54321 (API), 54322 (PostgreSQL), 54323 (Studio)

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Start local Supabase (optional)
supabase start

# Stop local Supabase
supabase stop
```

## Database Schema Requirements

The dashboard expects a `personas_performance` view/table in Supabase with the following structure:
- Conversation metadata (ID, test run, persona info)
- Performance metrics (scores, turns, outcomes)
- Evaluation criteria details (array of criteria with scores)
- Conversation summaries (array with outcome, notes, summary)
- Full conversation transcripts (JSON string)

## Component Architecture

### State Management
- **Local State**: React useState/useEffect
- **Filtering**: useMemo for derived/filtered data
- **Data Fetching**: Async functions in `lib/queries.ts`

### Key Query Functions
- `fetchPersonasPerformance()` - All conversation data
- `fetchTestRuns()` - Test run summaries with distributions
- `fetchUniquePersonas()` - Distinct persona list
- `fetchUniqueCategories()` - Distinct categories
- `fetchHeatmapData()` - Aggregated persona performance

### Retry Logic
All queries include automatic retry with exponential backoff (3 attempts) to handle temporary Supabase connection issues.

## Theming
- **Provider**: next-themes
- **Modes**: Light, Dark, System
- **Theme Toggle**: Available in header
- **CSS Variables**: Defined in `app/globals.css`

## Data Flow
1. **Load**: Components fetch data on mount via `lib/queries.ts`
2. **Filter**: User interactions update filter state
3. **Compute**: useMemo derives filtered/aggregated data
4. **Render**: Components display computed data
5. **Select**: User clicks conversation → side panel shows details

## Performance Optimizations
- useMemo for expensive filtering/aggregation
- Lazy loading with React Suspense
- Client-side filtering after initial data fetch
- Retry logic prevents failed requests from blocking UI

## Evaluation Criteria
Conversations are scored across multiple criteria:
- Individual criterion scores (0-10)
- Overall average score
- Outcome classification:
  - Success: score >= 8
  - Partial: 6 <= score < 8
  - Failure: score < 6

## Design System
- **Colors**: Semantic color tokens (primary, secondary, accent, destructive)
- **Typography**: System font stack (Geist)
- **Spacing**: Tailwind default scale
- **Components**: Radix UI primitives + custom styling
- **Icons**: Lucide React

## Error Handling
- Loading states for async operations
- Error boundaries for component failures
- User-friendly error messages
- Graceful degradation (falls back to mock data if Supabase unavailable)

## Future Enhancement Areas
- Real-time updates via Supabase subscriptions
- Export functionality (CSV, JSON)
- Advanced analytics (trends, comparisons)
- User authentication & multi-tenancy
- Conversation replay/step-through
- Custom evaluation criteria configuration
- Test run comparison tools
- Performance benchmarking

## Contributing Guidelines
1. Follow existing code style (TypeScript strict mode)
2. Use shadcn/ui components for UI consistency
3. Keep components focused and composable
4. Add loading/error states for all async operations
5. Use semantic HTML and ARIA labels for accessibility
6. Test dark mode compatibility
7. Validate data with Zod schemas where applicable

## Deployment Notes
- **Platform**: Vercel (recommended)
- **Environment Variables**: Set in Vercel dashboard
- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Node Version**: 22.x
- **Analytics**: Vercel Analytics enabled

## MCP Server Configuration
Supabase MCP server is configured for Claude Code integration:
- **URL**: https://mcp.supabase.com/mcp
- **Project**: dlozxirsmrbriuklgcxq
- **Config Location**: `~/Library/Application Support/ClaudeCode/managed-mcp.json`
- Restart Claude Code after configuration to enable Supabase tools

## Troubleshooting

### "View does not exist" Error
- Check Supabase connection credentials
- Verify `personas_performance` view exists
- Run database migration/seed scripts

### No Data Displaying
- Check browser console for errors
- Verify `.env.local` file exists and has correct values
- Test Supabase connection in Studio

### Styling Issues
- Clear `.next` cache: `rm -rf .next`
- Verify Tailwind configuration
- Check for CSS conflicts

### Performance Issues
- Reduce data fetched (add pagination)
- Optimize useMemo dependencies
- Check for unnecessary re-renders (React DevTools)
