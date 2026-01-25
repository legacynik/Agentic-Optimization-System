# AI Agent Testing Dashboard

## Quick Reference - Full Stack AI Development

| Need | Tool | Command/Path |
|------|------|--------------|
| **Resume Session** | Session State | `_project_specs/session/current-state.md` |
| **Project Overview** | PRD v3 Index | `_project_specs/PRD-v3-index.md` |
| **Implement Feature** | Ralph Spec | `/ralph-spec [phase]` |
| **Coding Rules** | Claude Bootstrap | Read `.claude/skills/` |
| **Workflow/Planning** | BMAD Agents | `*workflow-init` |
| **Documentation** | Context7 | "Query Context7 for [library] docs" |

---

## AI Development Integration

This project uses three **complementary** AI development systems at different levels:

```
┌────────────────────────────────────────────────────┐
│  LIVELLO 1: STRATEGIA (BMAD Method)                │
│  *pm, *architect, *workflow-init, brainstorming    │
│  → Cosa fare, chi coinvolgere, pianificazione      │
└────────────────────────────────────────────────────┘
                      ▼
┌────────────────────────────────────────────────────┐
│  LIVELLO 2: IMPLEMENTAZIONE (Claude Bootstrap)     │
│  base, TDD, security skill, session-management     │
│  → Come farlo bene, qualità codice, test           │
└────────────────────────────────────────────────────┘
                      ▼
┌────────────────────────────────────────────────────┐
│  LIVELLO 3: DOCS AGGIORNATE (Context7)             │
│  Query librerie per documentazione attuale         │
└────────────────────────────────────────────────────┘
```

### 1. **Claude Bootstrap** - Esecuzione
- **Purpose**: Enforces coding standards, TDD, security coding patterns
- **Skills Location**: `.claude/skills/`
- **Key Skills**: base, security, typescript, react-web, supabase-nextjs
- **Commands**: `/code-review`, `/initialize-project`
- **Owns**: Code quality, TDD workflow, session persistence, OWASP patterns

### 2. **BMAD-METHOD** - Orchestrazione
- **Purpose**: Structured workflows with specialized agents
- **Agents Reference**: `.claude/agents/bmad-agents.md`
- **Quick Start**: `*workflow-init` to begin planning/discussion
- **21 Agents**: PM, Architect, Dev, QA, Security, DevOps, etc.
- **Owns**: Planning, architecture decisions, QA strategy, threat modeling
- **Note**: BMAD agents automatically follow Claude Bootstrap skills during implementation

### 3. **Context7** - Documentazione
- **Purpose**: Query public library documentation
- **Usage**: "Query Context7 for React hooks documentation"

---

## System Ownership (Chi Fa Cosa)

### BMAD Method → Orchestrazione (COSA fare)
| Responsabilità | Comando |
|----------------|---------|
| Pianificazione requisiti | `*pm` |
| Design architetturale | `*architect` |
| Workflow orchestration | `*workflow-init` |
| Ideazione/brainstorming | `*brainstorming` |
| QA Strategy (test plans) | `*qa` |
| Security Architecture Review | `*security` (threat modeling, architettura) |

### Claude Bootstrap → Esecuzione (COME farlo bene)
| Responsabilità | Skill/Command |
|----------------|---------------|
| Qualità codice (max 200 righe/file) | `base` skill |
| TDD Workflow (RED→GREEN→VALIDATE) | `base` skill |
| Security Coding Patterns (OWASP) | `security` skill |
| Session persistence | `session-management` skill |
| Pre-commit verification | `/code-review` |
| Manual testing checklist | `real-testing` skill |

---

## Decision Tree: Quando Usare Cosa

```
Devo iniziare un task?
│
├─ Non so cosa costruire
│  └─→ BMAD: *workflow-init, *pm
│
├─ So cosa costruire ma devo progettare
│  └─→ BMAD: *architect
│
├─ Ho la spec, devo implementare
│  └─→ Claude Bootstrap: /ralph-spec + TDD
│
├─ Bug da fixare
│  └─→ Claude Bootstrap: TDD bug fix workflow
│
├─ Need brainstorming/ideazione
│  └─→ BMAD: brainstorming workflow
│
├─ Security review architetturale
│  └─→ BMAD: *security (threat modeling)
│
├─ Security durante coding
│  └─→ Claude Bootstrap: security skill (OWASP patterns)
│
├─ Pre-commit review
│  └─→ Claude Bootstrap: /code-review
│
└─ Riprendere sessione
   └─→ Claude Bootstrap: session-management
```

---

## Rules

### Codice
- **Commenti per WHY, non WHAT**: header file (scopo), docstrings API pubbliche, inline solo per logica non ovvia. Il codice deve essere self-documenting (nomi descrittivi > commenti)
- **Unit test ≠ verifica**: TESTA MANUALMENTE (avvia app, curl, verifica DB)
- **Logging obbligatorio**: ogni feature deve loggare
- **Preflight prima di commit**: `./scripts/preflight.sh`
- **Limiti Claude Bootstrap**: max 200 righe/file, max 20 righe/funzione, max 3 parametri

### MCP Tools
- **Brainstorming/Analisi**: USA SEMPRE `mcp__sequential-thinking__sequentialthinking`
- **Docs librerie**: Query Context7
- **Supabase**: Use Supabase MCP tools for database operations

### Skills (leggi prima di scrivere codice)
- `.claude/skills/base/SKILL.md` → Qualità codice, TDD
- `.claude/skills/security/SKILL.md` → OWASP patterns durante coding
- `.claude/skills/real-testing/SKILL.md` → Checklist test manuali

### Workflow
- `*workflow-init` → quando serve planning/discussione
- `/ralph-spec [phase]` → quando hai spec e devi implementare
- `/code-review` → SEMPRE prima di commit
- Agents BMAD: `.claude/agents/bmad-agents.md`

### Session & Specs
- **Resume**: `_project_specs/session/current-state.md`
- **PRD Index**: `_project_specs/PRD-v3-index.md`
- **Specs**: `_project_specs/specs/*.md`
- **Ralph Command**: `.claude/commands/ralph-spec.md`
- Todos: `_project_specs/todos/active.md`

---

## Session Documentation Flow

### Struttura Files di Sessione
```
_project_specs/session/
├── current-state.md      # 🔄 LIVE - Stato attuale (cosa sto facendo ORA)
├── decisions.md          # 📝 APPEND-ONLY - Log decisioni chiave (PERCHÉ)
├── code-landmarks.md     # 📍 Posizioni codice importanti (DOVE)
└── archive/              # 📚 STORIA COMPLETA - Sessioni passate
    └── YYYY-MM-DD-topic.md
```

### Quando Aggiornare Cosa

| Evento | File da Aggiornare | Azione |
|--------|-------------------|--------|
| **Fine task** | `current-state.md` | Quick update: progress, next steps |
| **Decisione presa** | `decisions.md` | APPEND entry con context e reasoning |
| **~20 tool calls** | `current-state.md` | Full checkpoint |
| **Fine sessione** | `archive/YYYY-MM-DD.md` | Crea summary, pulisci current-state |
| **Feature completata** | `archive/` + `current-state.md` | Archive + reset |

### current-state.md (STATO LIVE)
**Aggiorna frequentemente** - È lo stato attuale della sessione:
- Active Task (cosa sto facendo)
- Progress (a che punto sono)
- Pending Issues (cosa resta da fare)
- Resume Instructions (come riprendere)

**ATTENZIONE**: Questo file viene SOVRASCRITTO ad ogni sessione. Non contiene la storia completa.

### decisions.md (LOG DECISIONI)
**Append-only** - MAI cancellare entries:
```markdown
## [YYYY-MM-DD] Titolo Decisione

**Decision**: Cosa abbiamo deciso
**Context**: Perché stavamo decidendo
**Options Considered**: Alternative valutate
**Choice**: Scelta finale
**Reasoning**: Motivazione
**Trade-offs**: Compromessi accettati
**References**: File/code coinvolti
```

### archive/ (STORIA COMPLETA)
**Questo è il LOG STORICO del progetto**. Ogni sessione significativa diventa un file:
- `2026-01-19-prd-v24-backend.md` - Backend implementation
- `2026-01-25-schema-refactor.md` - Schema changes
- etc.

Contiene: Summary, Tasks Completed, Key Decisions, Code Changes, Session Stats.

### Flusso Completo

```
┌─────────────────────────────────────────────────────────────┐
│  INIZIO SESSIONE                                            │
│  1. Leggi current-state.md → Capisci dove eri               │
│  2. Leggi decisions.md recenti → Capisci perché             │
│  3. Continua da "Resume Instructions"                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  DURANTE LA SESSIONE                                        │
│  - Ogni task completato → Quick update current-state.md     │
│  - Ogni decisione → APPEND a decisions.md                   │
│  - Ogni ~20 tool calls → Full checkpoint current-state.md   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  FINE SESSIONE / FEATURE COMPLETATA                         │
│  1. Crea archive/YYYY-MM-DD-topic.md con summary completo   │
│  2. Aggiorna current-state.md con "Resume Instructions"     │
│  3. La storia è preservata in archive/                      │
└─────────────────────────────────────────────────────────────┘
```

### Dove Trovare la Storia Completa?
- **Storia sessioni**: `_project_specs/session/archive/*.md`
- **Storia decisioni**: `_project_specs/session/decisions.md`
- **Stato attuale**: `_project_specs/session/current-state.md`

---

## Regole Obbligatorie per Session State

### Comandi Sessione (User)
| Comando | Azione |
|---------|--------|
| `"inizio sessione"` / `"riprendi"` | Legge current-state.md e riprende |
| `"checkpoint"` / `"salva stato"` | Full checkpoint di current-state.md |
| `"fine sessione"` / `"chiudi sessione"` | Esegue workflow completo fine sessione |
| `"archivia"` | Crea file in archive/ |

### INIZIO SESSIONE (SEMPRE)
```
1. LEGGI current-state.md PRIMA di fare qualsiasi cosa
2. LEGGI decisions.md recenti se serve contesto
3. ANNUNCIA cosa stai per fare basandoti su "Resume Instructions"
```

### DURANTE LA SESSIONE (OBBLIGATORIO)

| Trigger | Azione | File |
|---------|--------|------|
| Task completato | Aggiorna "Completed This Session" | `current-state.md` |
| Decisione architetturale | APPEND nuova entry | `decisions.md` |
| Ogni ~20 tool calls | Full checkpoint | `current-state.md` |
| Errore/blocco risolto | Documenta soluzione | `current-state.md` |
| Nuovo pattern/location importante | Aggiungi entry | `code-landmarks.md` |

### FINE SESSIONE (SEMPRE)
```
1. CREA file in archive/YYYY-MM-DD-topic.md con:
   - Summary (1 paragrafo)
   - Tasks Completed (checkbox list)
   - Key Decisions (riferimenti a decisions.md)
   - Code Changes (tabella file modificati)
   - Open Items (cosa resta da fare)
   - Session Stats (durata, tool calls, files)

2. AGGIORNA current-state.md con:
   - Active Task = "Ready for next session"
   - Pending Issues = tasks non completati
   - Resume Instructions = prossimi passi chiari

3. VERIFICA che decisions.md contenga tutte le decisioni
```

### Template current-state.md
```markdown
# Current Session State
*Last updated: YYYY-MM-DD ~HH:MM*

## Active Task
[Cosa sto facendo ORA]

## Current Status
- **Phase**: [exploring | planning | implementing | testing | debugging]
- **Progress**: [X of Y steps / percentage]
- **Blockers**: [None / descrizione]

## Completed This Session
- [x] Task 1
- [x] Task 2

## Pending Issues
| Task | Priority | Notes |
|------|----------|-------|
| ... | High/Medium/Low | ... |

## Key Context
[Info importante per capire lo stato]

## Resume Instructions
```
1. Passo 1
2. Passo 2
3. Passo 3
```
```

### Template decisions.md Entry
```markdown
---

## [YYYY-MM-DD] Titolo Decisione

**Decision**: Cosa abbiamo deciso
**Context**: Perché stavamo decidendo
**Options Considered**:
1. Opzione A
2. Opzione B
**Choice**: Scelta finale
**Reasoning**: Motivazione dettagliata
**Trade-offs**: Compromessi accettati
**References**: File/code coinvolti
```

### Template archive/YYYY-MM-DD-topic.md
```markdown
# Session Archive: YYYY-MM-DD - Topic

## Summary
[1 paragrafo riassuntivo]

## Tasks Completed
- [x] Task 1
- [x] Task 2

## Key Decisions
- [YYYY-MM-DD] Decision 1 (vedi decisions.md)

## Code Changes
| File | Change Type | Description |
|------|-------------|-------------|
| path/file.ts | Created/Modified | Descrizione |

## Open Items Carried Forward
- [ ] Task non completato

## Session Stats
- Duration: ~X hours
- Tool calls: ~N
- Files modified: N
```

### Checklist Fine Sessione
- [ ] `current-state.md` aggiornato con stato pulito
- [ ] `decisions.md` contiene tutte le decisioni
- [ ] `archive/YYYY-MM-DD-topic.md` creato
- [ ] "Resume Instructions" sono chiari e actionable
- [ ] Pending Issues elencati con priorità

### Auto-Trigger Fine Sessione
Claude DEVE suggerire "Vuoi che chiuda la sessione?" quando:
- L'utente dice "ok grazie", "perfetto", "fatto" senza altri task
- È passato molto tempo (~50+ tool calls)
- Una feature major è completata
- L'utente sembra aver finito

### Esecuzione "Fine Sessione"
Quando l'utente dice `"fine sessione"` o equivalente, Claude DEVE:
```
1. Creare archive/YYYY-MM-DD-topic.md con summary completo
2. Aggiornare current-state.md con stato pulito
3. Verificare decisions.md sia completo
4. Mostrare riepilogo: "Sessione archiviata in archive/..."
```

---

## Development Workflow

### Spec-Driven Development (PREFERRED - Claude Bootstrap)
**Use when**: Hai già la spec e devi implementare
```
1. Read PRD-v3-index.md   → Find pending phase
2. /ralph-spec [phase]    → Auto-generate TDD prompt (CB)
3. Implement with TDD     → RED → GREEN → VALIDATE (CB)
4. Manual test            → real-testing skill checklist (CB)
5. Update spec status     → Mark requirements [x]
6. /code-review          → Review before commit (CB)
```

### Planning New Feature (BMAD → Claude Bootstrap)
**Use when**: Non sai ancora cosa/come costruire
```
1. *workflow-init         → Start planning process (BMAD)
2. *pm                    → Define requirements (BMAD)
3. *architect             → Design system (BMAD)
4. Create spec            → _project_specs/specs/ con template
5. /ralph-spec [name]     → Implement with TDD (CB)
6. /code-review          → Verify quality (CB)
```

### Starting a New Feature (Hai già i requisiti chiari)
```
1. Create spec in _project_specs/specs/
2. Use _TEMPLATE.md as base
3. Define requirements + acceptance criteria
4. /ralph-spec [spec-name] → Implement (CB)
```

### Quick Bug Fix (BMAD + Claude Bootstrap)
```
1. *workflow-quick        → Fast workflow (BMAD)
2. *qa                    → Reproduce issue (BMAD)
3. *dev                   → Fix with TDD (BMAD + CB skills)
4. /code-review          → Verify quality (CB)
```

### Security Review (BMAD + Claude Bootstrap)
```
1. *security              → Threat modeling, architettura (BMAD)
2. security skill         → OWASP patterns nel codice (CB)
3. /code-review           → Automated security checks (CB)
```

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
│   ├── agentic/                    # Agentic testing features
│   ├── api/                        # API routes
│   ├── prompts/                    # Prompt management
│   ├── test-launcher/              # Test launcher UI
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
│   ├── navigation-header.tsx       # Navigation component
│   ├── agentic/                    # Agentic components
│   ├── version-centric/            # Version-centric components
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase.ts                 # Supabase client configuration
│   ├── queries.ts                  # Database query functions
│   ├── mock-data.ts                # Sample data for development
│   └── utils.ts                    # Utility functions
├── supabase/
│   ├── config.toml                 # Supabase local dev configuration
│   ├── migrations/                 # Database migrations
│   └── seed.sql                    # Database seed file
├── _project_specs/                 # Project specifications
│   ├── PRD-v3-index.md             # Master index (~2k tokens)
│   ├── specs/                      # Granular specs per phase
│   │   ├── _TEMPLATE.md            # Spec template
│   │   ├── phase-5-n8n.md          # n8n workflow spec
│   │   └── ui-refactor-minimal.md  # UI refactor spec
│   ├── features/                   # Feature specs (legacy)
│   ├── todos/                      # Active todos
│   └── session/                    # Session state
└── .claude/
    ├── skills/                     # Claude Bootstrap skills
    └── agents/                     # BMAD agents reference
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
- **Current Theme**: shadcn/ui Slate (blu-grigio)
- **Theme Toggle**: Available in header
- **CSS Variables**: Defined in `app/globals.css`
- **Theme Options**: https://ui.shadcn.com/themes

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

## MCP Server Configuration
Supabase MCP server is configured for Claude Code integration:
- **URL**: https://mcp.supabase.com/mcp
- **Project**: dlozxirsmrbriuklgcxq
- **Config Location**: `~/Library/Application Support/ClaudeCode/managed-mcp.json`

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
