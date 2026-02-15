# Evaluator Multi-Prompt Architecture

**Status**: Draft
**Created**: 2026-01-29
**Authors**: Architect, Data Engineer, PM, UX Designer (Party Mode)

---

## Overview

Refactor dell'evaluator da sistema hardcoded (specifico per vendita audit) a sistema dinamico che supporta diversi tipi di prompt con criteri di valutazione configurabili.

### Problem Statement

L'evaluator attuale ha 9 criteri hardcoded nel system prompt del Judge Agent:
- `italiano_autentico`, `apertura_cornice`, `discovery_socratica`
- `pitch_audit`, `chiusura_prenotazione`, etc.

Questi criteri non hanno senso per agenti di supporto, booking, customer service.

### Solution

- **Evaluator configs**: Template di valutazione con criteri dinamici
- **Multi-evaluation**: Un test_run può avere N valutazioni con evaluator diversi
- **A/B Testing**: Confronto tra evaluator per validare quale è migliore
- **Personas riutilizzabili**: Le personas descrivono il cliente, non i criteri

---

## Architecture

### Entity Relationships

```
prompts (esistente)
│
├──< prompt_versions (esistente)
│
├──< evaluator_configs (NUOVA)
│     ├── criteria JSONB
│     ├── system_prompt_template TEXT
│     └── is_promoted BOOLEAN (default per prompt)
│
└──< prompt_personas (esistente, invariato)

test_runs (esistente)
│
├──< battle_results (esistente, score deprecato)
│     └── transcript, outcome RAW
│
└──< evaluations (NUOVA)
      ├── evaluator_config_id FK
      ├── is_promoted BOOLEAN (primary per test_run)
      ├── overall_score, success_count, etc.
      │
      └──< battle_evaluations (NUOVA)
            ├── score NUMERIC
            ├── criteria_scores JSONB
            └── summary, strengths, weaknesses
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dove criteri | `evaluator_configs` | Legato a prompt, non persona |
| Personas | Riutilizzabili tra prompt | Descrivono cliente, non valutazione |
| Multi-evaluation | N per test_run | Permette A/B testing evaluator |
| Default evaluator | `is_promoted` flag | Flessibile, prompt può non avere default |
| Scores | `battle_evaluations` | Separati da battle_results.score |

---

## Database Schema

### Table: evaluator_configs

```sql
CREATE TABLE evaluator_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  description TEXT,

  -- Association
  prompt_id UUID NOT NULL REFERENCES prompts(id),

  -- Configuration
  criteria JSONB NOT NULL,
  system_prompt_template TEXT NOT NULL,
  success_config JSONB DEFAULT '{"min_score": 7}',

  -- State
  is_promoted BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, deprecated

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(prompt_id, version)
);

CREATE INDEX idx_evaluator_promoted
ON evaluator_configs(prompt_id, is_promoted)
WHERE is_promoted = true;
```

**criteria JSONB format:**
```json
[
  {
    "name": "gestione_obiezioni",
    "weight": 1.5,
    "description": "Come gestisce le obiezioni del cliente",
    "scoring_guide": "1-3: ignora, 4-6: tenta, 7-9: risolve, 10: eccelle"
  },
  {
    "name": "empatia",
    "weight": 1.0,
    "description": "Mostra comprensione per la situazione del cliente"
  }
]
```

### Table: evaluations

```sql
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  evaluator_config_id UUID NOT NULL REFERENCES evaluator_configs(id),

  -- State
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
  is_promoted BOOLEAN DEFAULT false,

  -- Aggregates (calculated after completion)
  overall_score NUMERIC(4,2),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  partial_count INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  triggered_by VARCHAR(50), -- 'auto', 'manual', 'api'

  UNIQUE(test_run_id, evaluator_config_id)
);

CREATE INDEX idx_evaluation_promoted
ON evaluations(test_run_id, is_promoted)
WHERE is_promoted = true;

CREATE INDEX idx_evaluation_pending
ON evaluations(status)
WHERE status = 'pending';
```

### Table: battle_evaluations

```sql
CREATE TABLE battle_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  battle_result_id UUID NOT NULL REFERENCES battle_results(id) ON DELETE CASCADE,

  -- Scores
  score NUMERIC(4,2),
  criteria_scores JSONB,
  outcome VARCHAR(30), -- success, partial, failure, timeout, error

  -- LLM Output
  summary TEXT,
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',

  -- Debug
  raw_response JSONB,

  -- Audit
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  evaluator_version VARCHAR(50),

  UNIQUE(evaluation_id, battle_result_id)
);

CREATE INDEX idx_battle_eval_evaluation
ON battle_evaluations(evaluation_id);
```

---

## Operational Flows

### Flow 1: Launch Test Run

```
1. UI selects prompt_version
2. Backend finds promoted evaluator:
   SELECT id FROM evaluator_configs
   WHERE prompt_id = :prompt_id AND is_promoted = true
3. Create test_run
4. Create evaluation with:
   - evaluator_config_id = promoted evaluator
   - is_promoted = true
   - status = 'pending'
5. n8n workflow processes battles
6. Evaluator workflow evaluates and populates battle_evaluations
7. Update evaluation.status = 'completed' + aggregates
```

### Flow 2: Re-evaluate

```
1. UI clicks "Re-evaluate" on test_run
2. Select different evaluator_config
3. Create new evaluation with:
   - is_promoted = false
   - status = 'pending'
4. n8n workflow evaluates (reuses transcript from battle_results)
5. UI shows "Compare" when completed
```

### Flow 3: Promote Evaluation

```
1. UI clicks "Promote" on non-primary evaluation
2. Backend:
   UPDATE evaluations SET is_promoted = false
   WHERE test_run_id = :test_run_id AND is_promoted = true;

   UPDATE evaluations SET is_promoted = true
   WHERE id = :new_promoted_id;
3. Dashboard shows new scores
```

### Flow 4: Promote Evaluator Config

```
1. UI clicks "Set as Default" on evaluator_config
2. Backend:
   UPDATE evaluator_configs SET is_promoted = false
   WHERE prompt_id = :prompt_id AND is_promoted = true;

   UPDATE evaluator_configs SET is_promoted = true
   WHERE id = :new_default_id;
3. New test_runs will use this evaluator
```

---

## UI Mockups

### Test Run Detail Page

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEST RUN: RUN-20260125-SPO                                    [⚙️] │
├─────────────────────────────────────────────────────────────────────┤
│  Prompt: vendita-audit v2.4        Status: ✅ Completed            │
│  Evaluator: sales-evaluator v1.2 ⭐ (promoted)                      │
│  Battles: 10/10    Score: 6.8    Success: 70%                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [📊 Results]  [💬 Transcripts]  [🔄 Re-evaluate]  [📈 Compare]     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Re-evaluate Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔄 RE-EVALUATE TEST RUN                                       [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Current evaluation: sales-evaluator v1.2 ⭐                        │
│                                                                     │
│  Select new evaluator:                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ sales-evaluator v1.3 (latest)                             │   │
│  │ ○ sales-evaluator v1.1                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⚠️ This will create a secondary evaluation for A/B comparison      │
│                                                                     │
│                              [Cancel]  [🔄 Re-evaluate]             │
└─────────────────────────────────────────────────────────────────────┘
```

### Compare View (Overlay Diff)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📈 COMPARE: v1.2 ⭐ → v1.3                                    [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SUMMARY                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Overall Score:  6.8 → 7.2  ██████████░░  +5.9%             │   │
│  │  Success Rate:   70% → 80%  ████████████░  +14.3%           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  CRITERIA CHANGES                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ↑ gestione_obiezioni    6 → 7   (+16.7%)                   │   │
│  │  ↑ risoluzione           7 → 8   (+14.3%)                   │   │
│  │  = empatia               7 → 7   (  0.0%)                   │   │
│  │  ↓ chiusura              8 → 7   (-12.5%)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ▼ EXPAND: Dettaglio per Persona                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 😠 Cliente Scettico (hard)           v1.2: 5.2 → v1.3: 6.8  │   │
│  │    ❌ gestione_obiezioni: 4 → 6                              │   │
│  │    ⚠️ failure: "non ha quantificato il problema"            │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ ⏰ Cliente Fretta (medium)           v1.2: 7.1 → v1.3: 7.0  │   │
│  │    = sostanzialmente uguale                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│              [Keep v1.2 ⭐]  [Promote v1.3 ⭐]                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Design System & Technical Tokens

### Visual Identity: Soft Pop Theme

**Design Philosophy:**
Dashboard con aesthetic "Soft Pop" - friendly, playful ma professionale. Utilizza colori vivaci ma non saturi, radius pronunciati (16px), e design flat senza shadows. Perfetto per Optimizer + Quick Monitor use cases.

**Key Characteristics:**
- **Palette**: Viola primary, Teal secondary, Lime accent - colori energetici ma soft
- **Radius**: 1rem (16px) - super rounded, friendly aesthetic
- **Shadows**: Zero - flat design puro, separation tramite border e color
- **Typography**: DM Sans (humanist, readable), Space Mono (monospace per code)
- **Contrast**: Dark mode con nero puro + colori vivaci per massimo pop

**Light Mode Atmosphere:**
- Background verde menta chiarissimo - unique, fresh
- Colori saturati ma non aggressive
- Border neri per definition chiara

**Dark Mode Atmosphere:**
- Background nero puro - massimo contrasto
- Border e sidebar border BIANCHI - bold choice, high contrast
- Colori più luminosi rispetto a light mode per visibility

---

### 3.1.1 Technical Design Tokens (Source of Truth)

**CRITICAL**: Questo CSS è il Source of Truth per il design system. Deve essere usato esattamente come appare quando si genera `app/globals.css`.

```css
:root {
  --background: oklch(0.9789 0.0082 121.6272);
  --foreground: oklch(0 0 0);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.5106 0.2301 276.9656);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.7038 0.1230 182.5025);
  --secondary-foreground: oklch(1.0000 0 0);
  --muted: oklch(0.9551 0 0);
  --muted-foreground: oklch(0.3211 0 0);
  --accent: oklch(0.7686 0.1647 70.0804);
  --accent-foreground: oklch(0 0 0);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0 0 0);
  --input: oklch(0.5555 0 0);
  --ring: oklch(0.7853 0.1041 274.7134);
  --chart-1: oklch(0.5106 0.2301 276.9656);
  --chart-2: oklch(0.7038 0.1230 182.5025);
  --chart-3: oklch(0.7686 0.1647 70.0804);
  --chart-4: oklch(0.6559 0.2118 354.3084);
  --chart-5: oklch(0.7227 0.1920 149.5793);
  --sidebar: oklch(0.9789 0.0082 121.6272);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0.5106 0.2301 276.9656);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.7686 0.1647 70.0804);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(0 0 0);
  --sidebar-ring: oklch(0.7853 0.1041 274.7134);
  --font-sans: DM Sans, sans-serif;
  --font-serif: DM Sans, sans-serif;
  --font-mono: Space Mono, monospace;
  --radius: 1rem;
  --shadow-x: 0px;
  --shadow-y: 0px;
  --shadow-blur: 0px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.05;
  --shadow-color: #1a1a1a;
  --shadow-2xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-sm: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-md: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 2px 4px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-lg: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 4px 6px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 8px 10px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-2xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.13);
  --tracking-normal: normal;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0 0 0);
  --foreground: oklch(1.0000 0 0);
  --card: oklch(0.2455 0.0217 257.2823);
  --card-foreground: oklch(1.0000 0 0);
  --popover: oklch(0.2455 0.0217 257.2823);
  --popover-foreground: oklch(1.0000 0 0);
  --primary: oklch(0.6801 0.1583 276.9349);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.7845 0.1325 181.9120);
  --secondary-foreground: oklch(0 0 0);
  --muted: oklch(0.3211 0 0);
  --muted-foreground: oklch(0.8452 0 0);
  --accent: oklch(0.8790 0.1534 91.6054);
  --accent-foreground: oklch(0 0 0);
  --destructive: oklch(0.7106 0.1661 22.2162);
  --destructive-foreground: oklch(0 0 0);
  --border: oklch(0.4459 0 0);
  --input: oklch(1.0000 0 0);
  --ring: oklch(0.6801 0.1583 276.9349);
  --chart-1: oklch(0.6801 0.1583 276.9349);
  --chart-2: oklch(0.7845 0.1325 181.9120);
  --chart-3: oklch(0.8790 0.1534 91.6054);
  --chart-4: oklch(0.7253 0.1752 349.7607);
  --chart-5: oklch(0.8003 0.1821 151.7110);
  --sidebar: oklch(0 0 0);
  --sidebar-foreground: oklch(1.0000 0 0);
  --sidebar-primary: oklch(0.6801 0.1583 276.9349);
  --sidebar-primary-foreground: oklch(0 0 0);
  --sidebar-accent: oklch(0.8790 0.1534 91.6054);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(1.0000 0 0);
  --sidebar-ring: oklch(0.6801 0.1583 276.9349);
  --font-sans: DM Sans, sans-serif;
  --font-serif: DM Sans, sans-serif;
  --font-mono: Space Mono, monospace;
  --radius: 1rem;
  --shadow-x: 0px;
  --shadow-y: 0px;
  --shadow-blur: 0px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.05;
  --shadow-color: #1a1a1a;
  --shadow-2xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-xs: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.03);
  --shadow-sm: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-md: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 2px 4px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-lg: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 4px 6px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.05), 0px 8px 10px -1px hsl(0 0% 10.1961% / 0.05);
  --shadow-2xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.13);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

body {
  letter-spacing: var(--tracking-normal);
}
```

**Font Requirements:**
- **DM Sans**: Install via Google Fonts or self-host
- **Space Mono**: Install via Google Fonts or self-host
- Fallbacks già definiti nel CSS

**Implementation Notes:**
- OKLCH color space utilizzato per perceptual uniformity
- Radius 1rem applicato a tutti componenti shadcn/ui
- No shadows = rimuovere o impostare a 0 in componenti
- Dark mode toggle via `next-themes` con class strategy

---

## Epic Stories

### E1: Schema DB + Migration

**Goal**: Create new tables and migrate existing data

| Story | Description | AC |
|-------|-------------|-----|
| 1.1 | Create `evaluator_configs` table | Table with all columns, FK, indexes |
| 1.2 | Create `evaluations` table | Table with all columns, FK, indexes |
| 1.3 | Create `battle_evaluations` table | Table with all columns, FK, indexes |
| 1.4 | Create legacy evaluator_config | For existing prompts with current criteria |
| 1.5 | Migrate test_runs → evaluations | All existing test_runs have evaluation |
| 1.6 | Migrate battle_results → battle_evaluations | evaluation_details migrated |
| 1.7 | Create indexes and constraints | All indexes from spec created |

**Effort**: 3h
**Priority**: P0
**Dependencies**: None

---

### E2: API Endpoints

**Goal**: CRUD for evaluator_configs and evaluations

| Story | Description | Endpoint |
|-------|-------------|----------|
| 2.1 | List/Create evaluator configs | GET/POST `/api/evaluator-configs` |
| 2.2 | Get/Update/Delete evaluator config | GET/PUT/DELETE `/api/evaluator-configs/:id` |
| 2.3 | Promote evaluator as default | POST `/api/evaluator-configs/:id/promote` |
| 2.4 | List evaluations for test_run | GET `/api/evaluations?test_run_id=` |
| 2.5 | Trigger re-evaluation | POST `/api/evaluations/re-evaluate` |
| 2.6 | Promote evaluation as primary | POST `/api/evaluations/:id/promote` |
| 2.7 | Get comparison data | GET `/api/evaluations/:id/compare/:otherId` |

**Effort**: 4h
**Priority**: P0
**Dependencies**: E1

---

### E3: Workflow n8n Update

**Goal**: Evaluator workflow uses new schema

| Story | Description |
|-------|-------------|
| 3.1 | Modify "Get Pending Evaluations" to read from evaluations table |
| 3.2 | Create "Fetch Evaluator Config" node to load dynamic criteria |
| 3.3 | Create "Build Dynamic System Prompt" node |
| 3.4 | Modify Judge Agent to use dynamic prompt |
| 3.5 | Modify output to write to battle_evaluations |
| 3.6 | Update aggregates on evaluations at completion |
| 3.7 | End-to-end testing with new flow |

**Effort**: 3h
**Priority**: P0
**Dependencies**: E1

---

### E4: UI Evaluator Management

**Goal**: Manage evaluator configs from UI

| Story | Description |
|-------|-------------|
| 4.1 | Page `/evaluators` with list per prompt |
| 4.2 | Create/edit evaluator config form |
| 4.3 | Criteria editor (add/remove/reorder) |
| 4.4 | Preview generated system prompt |
| 4.5 | "Promote as Default" action |
| 4.6 | Status badge (draft/active/deprecated) |

**Effort**: 5h
**Priority**: P1
**Dependencies**: E2

---

### E5: UI Re-evaluate + Compare

**Goal**: Re-evaluation and comparison from test run detail

| Story | Description |
|-------|-------------|
| 5.1 | Evaluation count badge on test run card |
| 5.2 | "Re-evaluate" button on test run detail |
| 5.3 | Modal for evaluator selection |
| 5.4 | Progress indicator during re-evaluation |
| 5.5 | Compare view (overlay diff - mockup 3B) |
| 5.6 | Expand for per-persona detail |
| 5.7 | "Promote" action to change primary evaluation |

**Effort**: 6h
**Priority**: P1
**Dependencies**: E2, E4

---

## Implementation Sequence

```
E1 (Schema) ──────► E2 (API) ──────► E4 (UI Evaluator)
     │                  │
     │                  └──────────► E5 (UI Compare)
     │
     └────────────► E3 (n8n Workflow)
```

### MVP Path (~10h)

1. E1 - Schema + Migration
2. E3 - n8n workflow update
3. E2.5 - POST /re-evaluate endpoint only
4. E5.2-5.4 - Re-evaluate button + modal

### Full Feature (+11h = ~21h total)

5. E2 complete - All API endpoints
6. E4 - Evaluator management UI
7. E5 complete - Compare view with expand

---

## Migration Strategy

### Phase 1: Schema Creation (non-breaking)

```sql
-- Create new tables (no impact on existing)
CREATE TABLE evaluator_configs ...
CREATE TABLE evaluations ...
CREATE TABLE battle_evaluations ...
```

### Phase 2: Legacy Evaluator

```sql
-- Create evaluator_config with current hardcoded criteria
INSERT INTO evaluator_configs (
  name, version, prompt_id, criteria, system_prompt_template, is_promoted
) VALUES (
  'sales-evaluator', '1.0', :prompt_id,
  '[current 9 criteria as JSON]',
  '[current system prompt]',
  true
);
```

### Phase 3: Data Migration

```sql
-- For each existing test_run
INSERT INTO evaluations (test_run_id, evaluator_config_id, status, is_promoted, ...)
SELECT id, :legacy_evaluator_id, 'completed', true, ...
FROM test_runs WHERE status = 'completed';

-- For each battle_result with evaluation_details
INSERT INTO battle_evaluations (evaluation_id, battle_result_id, score, criteria_scores, ...)
SELECT e.id, br.id, br.score, br.evaluation_details->'criteria_scores', ...
FROM battle_results br
JOIN evaluations e ON e.test_run_id = br.test_run_id;
```

### Phase 4: Workflow Switch

- Deploy new n8n workflow version
- Test with new test_run
- Verify writes to new tables

### Phase 5: Deprecation

- Mark `battle_results.score` as deprecated in code
- Dashboard reads from `battle_evaluations`
- Keep `battle_results.evaluation_details` for rollback (remove after 30 days)

---

## Open Questions

- [ ] RLS policies needed for new tables?
- [ ] Playground UI for creating evaluators (like personas)?
- [ ] Versioning strategy for evaluator_configs (auto-increment or manual)?
- [ ] Notification when re-evaluation completes?

---

## References

- Party Mode Session: 2026-01-29
- Participants: Architect, Data Engineer, PM, UX Designer
- Related: `_project_specs/specs/evaluator-migration.md` (old spec)
