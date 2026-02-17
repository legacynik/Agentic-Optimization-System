# Guida Configurazione MCP Server per Nuovi Progetti

## Panoramica MCP Server

Gli MCP (Model Context Protocol) server permettono a Claude di interagire con servizi esterni. Esistono **3 tipi di MCP server**:

### 1. Built-in MCP (Nativo Claude Code)
Server pre-installati che **non richiedono configurazione**:
- ✅ **shadcn/ui** - Gestione componenti UI
- ✅ **playwright** - E2E testing
- ✅ **sequential-thinking** - Reasoning avanzato

**Non serve fare nulla** - sono già disponibili!

### 2. Cloud MCP (Claude.ai)
Server gestiti da Anthropic, configurabili via web:
- **Notion**, **Mermaid Chart**, etc.
- Si configurano su https://claude.ai → Settings → Integrations

### 3. Custom MCP (Self-hosted)
Server custom che richiedono configurazione locale:
- **Supabase** (database)
- **n8n** (automation)
- Altri servizi custom

---

## Configurazione MCP Server

### File di Configurazione

**Location**: `~/Library/Application Support/ClaudeCode/managed-mcp.json`

```json
{
  "mcpServers": {
    "server-name": {
      "type": "http",
      "url": "https://api-url.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      },
      "params": {
        "key": "value"
      }
    }
  }
}
```

---

## Setup per Nuovo Progetto

### Step 1: Verifica MCP Built-in Disponibili

I seguenti server sono **già disponibili** senza configurazione:

#### shadcn/ui MCP
```bash
# Verifica disponibilità
claude-code "list shadcn components"
```

**Tools disponibili**:
- `mcp__shadcn-ui__list_components` - Lista tutti i componenti
- `mcp__shadcn-ui__list_blocks` - Lista blocchi UI completi
- `mcp__shadcn-ui__get_component` - Ottieni source di un componente
- `mcp__shadcn-ui__get_block` - Ottieni blocco completo
- `mcp__shadcn-ui__get_theme` - Ottieni configurazione tema
- `mcp__shadcn-ui__apply_theme` - Applica tema

**Esempio utilizzo**:
```typescript
// Claude può automaticamente:
// 1. Cercare componente esistente
// 2. Installarlo nel progetto
// 3. Applicare customizzazioni

"Claude, usa shadcn per creare un form di login"
// → mcp__shadcn-ui__list_components → cerca "form"
// → mcp__shadcn-ui__get_component → recupera source
// → Compone il form con validazione
```

#### Playwright MCP
```bash
# Verifica disponibilità
claude-code "check playwright tools"
```

**Tools disponibili**:
- `mcp__playwright__browser_navigate` - Naviga URL
- `mcp__playwright__browser_click` - Click elemento
- `mcp__playwright__browser_fill_form` - Compila form
- `mcp__playwright__browser_take_screenshot` - Screenshot
- `mcp__playwright__browser_wait_for` - Aspetta elemento
- `mcp__playwright__browser_evaluate` - Esegui JS
- `mcp__playwright__browser_install` - Installa Playwright

**Esempio utilizzo**:
```typescript
"Claude, testa il login flow con Playwright"
// → mcp__playwright__browser_navigate → apre app
// → mcp__playwright__browser_fill_form → compila credenziali
// → mcp__playwright__browser_click → submit
// → mcp__playwright__browser_wait_for → verifica redirect
// → mcp__playwright__browser_take_screenshot → cattura risultato
```

---

### Step 2: Configurare MCP Custom (es. Supabase)

#### Esempio: Supabase MCP

**1. Ottieni credenziali progetto Supabase**:
```bash
# Dashboard Supabase → Settings → API
PROJECT_REF=dlozxirsmrbriuklgcxq
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**2. Aggiungi a managed-mcp.json**:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"
      },
      "params": {
        "project_ref": "YOUR_PROJECT_REF"
      }
    }
  }
}
```

**3. Riavvia Claude Code**:
```bash
# Claude Code rileverà automaticamente la nuova config
```

**4. Verifica tools disponibili**:
```bash
# Nel prompt Claude
"list supabase tools"
```

Tools Supabase:
- `mcp__supabase__execute_sql`
- `mcp__supabase__list_tables`
- `mcp__supabase__get_project`
- `mcp__supabase__apply_migration`
- etc.

---

### Step 3: Template Progetto Nuovo

#### 1. Crea CLAUDE.md con regole MCP

```markdown
# Project Name

## MCP Server Configuration

### UI Components (shadcn/ui)
- **REGOLA OBBLIGATORIA**: Usa SEMPRE shadcn/ui MCP per componenti UI
- **Workflow**:
  1. `mcp__shadcn-ui__list_components` → cerca componente
  2. `mcp__shadcn-ui__get_component` → recupera source
  3. Componi e customizza solo behavior, non styling
- **NO custom components** se esiste equivalente shadcn

### E2E Testing (Playwright)
- **REGOLA OBBLIGATORIA**: Usa SEMPRE Playwright MCP per test E2E
- **Workflow**:
  1. `mcp__playwright__browser_install` → setup iniziale
  2. Scrivi test con MCP tools invece di codice
  3. `mcp__playwright__browser_take_screenshot` → debug visivo

### Database (Supabase)
- **Tools**: `mcp__supabase__*`
- **Configured**: Yes ✓
- **Project**: YOUR_PROJECT_REF
```

#### 2. Aggiungi Skills per MCP

`.claude/skills/ui-components/SKILL.md`:
```markdown
# UI Components with shadcn/ui MCP

## Rules
1. SEMPRE cerca componente esistente prima di crearne uno custom
2. Usa `mcp__shadcn-ui__list_blocks` per pattern complessi
3. Applica theme consistente con `mcp__shadcn-ui__apply_theme`

## Workflow
1. Planning → identifica componenti necessari
2. Search → `mcp__shadcn-ui__list_components`
3. Fetch → `mcp__shadcn-ui__get_component`
4. Compose → integra nel progetto
5. Customize → solo behavior, mantieni styling shadcn
```

`.claude/skills/e2e-testing/SKILL.md`:
```markdown
# E2E Testing with Playwright MCP

## Rules
1. SEMPRE testa manualmente prima con Playwright MCP
2. Screenshot dopo ogni step critico
3. Verifica elementi visibili prima di interagire

## Workflow
1. `browser_navigate` → apri app
2. `browser_wait_for` → aspetta caricamento
3. `browser_click` / `browser_fill_form` → interazioni
4. `browser_take_screenshot` → cattura stato
5. `browser_evaluate` → asserzioni custom
```

---

## Workflow Completo: Setup Nuovo Progetto

### Checklist MCP

- [ ] **Verifica shadcn/ui MCP disponibile**
  ```bash
  "Claude, list shadcn components"
  ```

- [ ] **Verifica Playwright MCP disponibile**
  ```bash
  "Claude, check playwright tools"
  ```

- [ ] **Configura Supabase MCP** (se serve database)
  1. Ottieni credenziali da Supabase Dashboard
  2. Aggiungi a `managed-mcp.json`
  3. Riavvia Claude Code

- [ ] **Aggiungi regole MCP a CLAUDE.md**
  ```markdown
  ## MCP Server Rules
  - UI: shadcn/ui MCP OBBLIGATORIO
  - Testing: Playwright MCP per E2E
  - DB: Supabase MCP se PostgreSQL
  ```

- [ ] **Crea skills MCP**
  - `.claude/skills/ui-components/SKILL.md`
  - `.claude/skills/e2e-testing/SKILL.md`

- [ ] **Test iniziale**
  ```bash
  "Claude, usa shadcn per creare un button"
  "Claude, testa il button con Playwright"
  ```

---

## Esempi Pratici

### Esempio 1: Creare Dashboard con shadcn MCP

```typescript
// Invece di scrivere codice manualmente:

// ❌ OLD WAY
import { Card } from "@/components/ui/card"
// ... scrivi tutto il boilerplate

// ✅ NEW WAY (con MCP)
"Claude, usa shadcn blocks per creare un dashboard"
// → mcp__shadcn-ui__list_blocks → trova "dashboard-01"
// → mcp__shadcn-ui__get_block → recupera blocco completo
// → Claude compone dashboard con KPI cards, charts, etc.
```

### Esempio 2: Test E2E con Playwright MCP

```typescript
// Invece di scrivere test manualmente:

// ❌ OLD WAY
test('login flow', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.fill('[name="email"]', 'test@example.com')
  // ... 20 righe di boilerplate

// ✅ NEW WAY (con MCP)
"Claude, testa il login flow"
// → Claude usa Playwright MCP tools automaticamente
// → browser_navigate, fill_form, click, screenshot
// → Genera test completo con assertions
```

### Esempio 3: Query Database con Supabase MCP

```typescript
// Invece di scrivere query manualmente:

// ❌ OLD WAY
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active')

// ✅ NEW WAY (con MCP)
"Claude, mostra tutti gli utenti attivi"
// → mcp__supabase__execute_sql → esegue query
// → Restituisce risultati formattati
```

---

## Troubleshooting

### shadcn MCP non disponibile
```bash
# Verifica lista MCP server
"Claude, list all MCP servers"

# Se manca, potrebbe essere versione Claude Code vecchia
# Aggiorna Claude Code all'ultima versione
```

### Playwright MCP non funziona
```bash
# Installa Playwright browser
"Claude, run: mcp__playwright__browser_install"

# Verifica tools disponibili
"Claude, list playwright tools"
```

### Supabase MCP non si connette
```bash
# Verifica credenziali in managed-mcp.json
cat ~/Library/Application\ Support/ClaudeCode/managed-mcp.json

# Testa connessione manuale
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://mcp.supabase.com/mcp
```

---

## Best Practices

### 1. Sempre usa MCP per operazioni ripetitive
- ✅ Componenti UI → shadcn MCP
- ✅ Test E2E → Playwright MCP
- ✅ DB queries → Supabase MCP
- ❌ Non scrivere codice boilerplate manualmente

### 2. Documenta MCP usage in CLAUDE.md
```markdown
## MCP Configuration
- shadcn: Tutti i componenti UI
- Playwright: Test E2E + manual testing
- Supabase: Database operations
```

### 3. Crea skills per workflow MCP
- Documenta pattern comuni
- Definisci regole obbligatorie
- Esempi concreti

### 4. Testa MCP tools prima di usarli in produzione
```bash
"Claude, list [mcp-name] tools"  # Vedi cosa è disponibile
"Claude, test [tool-name]"       # Testa singolo tool
```

---

## MCP Server Registry

### Built-in (Nessuna config richiesta)
| Server | Tools | Uso |
|--------|-------|-----|
| shadcn/ui | `mcp__shadcn-ui__*` | Componenti UI React |
| Playwright | `mcp__playwright__*` | E2E testing browser |
| Sequential Thinking | `mcp__sequential-thinking__*` | Reasoning avanzato |

### Cloud (Config via claude.ai)
| Server | Tools | Dove configurare |
|--------|-------|------------------|
| Notion | `mcp__claude_ai_Notion__*` | claude.ai/settings |
| Mermaid | `mcp__claude_ai_Mermaid_Chart__*` | claude.ai/settings |

### Custom (Config in managed-mcp.json)
| Server | Endpoint | Docs |
|--------|----------|------|
| Supabase | https://mcp.supabase.com/mcp | supabase.com/docs/mcp |
| n8n | Custom | n8n.io/docs |

---

## Next Steps

1. **Verifica MCP disponibili**: `"Claude, list all MCP servers"`
2. **Configura Supabase** (se serve): Aggiungi a `managed-mcp.json`
3. **Aggiorna CLAUDE.md**: Aggiungi regole MCP
4. **Crea skills**: `.claude/skills/ui-components/`, `e2e-testing/`
5. **Test workflow**: `"Claude, usa shadcn per creare un form + testa con Playwright"`

---

## Reference

- **MCP Spec**: https://modelcontextprotocol.io
- **shadcn/ui**: https://ui.shadcn.com
- **Playwright**: https://playwright.dev
- **Supabase MCP**: https://supabase.com/docs/guides/ai/mcp
- **Claude Code MCP Docs**: https://docs.anthropic.com/claude-code/mcp
