# Archon Knowledge Base Integration

This project can use Archon for documentation and RAG (when running).

## Setup Status

⚠️ **Archon is not currently running**

To install and start Archon:

```bash
# Clone Archon repository
git clone -b stable https://github.com/coleam00/archon.git ~/archon
cd ~/archon

# Copy environment template
cp .env.example .env

# Configure .env with your Supabase credentials
# Edit .env and add your Supabase URL and keys

# Start with Docker
docker compose up --build -d

# Verify it's running
curl http://localhost:8051/health
```

## Dashboard Access

Once running: http://localhost:3737

## MCP Tools (When Available)

| Tool | Purpose | Example |
|------|---------|---------|
| `archon_search` | Semantic search docs | "How does auth work?" |
| `archon_get_tasks` | List project tasks | Get current sprint |
| `archon_create_task` | Add new task | Create feature ticket |
| `archon_query_docs` | RAG query | "JWT best practices" |

## Adding Documentation

1. **Web Crawl**: Dashboard → Sources → Add URL
2. **PDF Upload**: Dashboard → Documents → Upload
3. **Manual**: Dashboard → Documents → Create
4. **Code**: Dashboard → Repositories → Add repo

## Best Practices

### Before coding, query Archon:
```
"Search Archon for existing patterns for [feature]"
"Query Archon docs for [library] usage examples"
"Find similar implementations in Archon"
```

### After completing features:
```
"Add this implementation to Archon knowledge base"
"Update Archon docs with new API endpoint"
"Index new patterns in Archon"
```

## Reducing Context Usage

Instead of pasting long docs into chat:
```
❌ "Here's the full API documentation... [10000 lines]"
✅ "Query Archon for authentication API reference"
```

Archon returns only relevant chunks (~20-50 lines).

## MCP Configuration

To enable Archon MCP tools, create/update `.claude/settings.json`:

```json
{
  "mcpServers": {
    "archon": {
      "type": "http",
      "url": "http://localhost:8051",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_FROM_DASHBOARD"
      }
    }
  }
}
```

Get your API key from the Archon dashboard at http://localhost:3737.

## Current Project Documentation

For now, project documentation is stored in:
- `/docs/` - Technical documentation
- `/_project_specs/` - Project specifications
- `/CLAUDE.md` - Project overview and instructions

Once Archon is running, these can be indexed for semantic search and RAG capabilities.