# n8n Workflow Integration

## Workflows

| Workflow | ID | Status | Purpose |
|----------|-----|--------|---------|
| Test RUNNER | `XmpBhcUxsRpxAYPN` | Active | Orchestrates test runs — triggers Battle Agent per persona, manages iterations |
| Battle Agent | `Z35cpvwXt7Xy4Mgi` | Partial | Agent-persona conversations — chat memory, tool mocking |
| Evaluator | `202JEX5zm3VlrUT8` | Active | Judges conversation quality — scores against criteria |
| Personas Generator | `HltftwB9Bm8LNQsO` | Active | Generates test personas from prompt analysis |

## Architecture

```
Dashboard (Next.js)
    │
    ├── POST /api/n8n/trigger ──→ n8n Test RUNNER webhook
    │                                 │
    │                                 ├── Triggers Battle Agent (per persona)
    │                                 │       │
    │                                 │       └── Writes battle_results to Supabase
    │                                 │
    │                                 ├── Triggers Evaluator (after battles)
    │                                 │       │
    │                                 │       └── Writes evaluations to Supabase
    │                                 │
    │                                 └── POST /api/n8n/webhook ──→ Dashboard callback
    │
    └── Reads results from Supabase
```

## Dashboard API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/n8n/trigger` | Generic workflow trigger (sends `workflow_type` + `test_run_id`) |
| `POST /api/n8n/trigger-test` | Legacy trigger (Test RUNNER only) |
| `POST /api/n8n/webhook` | Callback from n8n — receives status updates |

## Environment

| Variable | Value | Location |
|----------|-------|----------|
| n8n Host | Railway | Cloud deployment |
| Webhook Base URL | Configured in `workflow_configs` table | Per-workflow |
| Security | `x-n8n-secret` header | Shared secret validation |

Webhook URLs are configured per-workflow in the Settings page (`/settings`), stored in the `workflow_configs` Supabase table.

## Pending Items (Phase 5)

1. Check Abort #2 in Battle Agent (after LLM call)
2. `x-n8n-secret` header validation on HTTP callbacks
3. Tool Mocking implementation in Battle Agent
4. Update `test_run` status to 'completed' at workflow end

## Detailed Documentation

For implementation details, modification requirements, and changelog:

- **Modification requirements**: [`_project_specs/n8n/MODIFICATIONS-REQUIRED.md`](./../_project_specs/n8n/MODIFICATIONS-REQUIRED.md) (842 lines — security, kill switch, evaluator fixes, tool mocking)
- **Changelog**: [`_project_specs/n8n/CHANGELOG.md`](./../_project_specs/n8n/CHANGELOG.md) (v2.0 → v2.4 Lean history)
- **Workflow JSON exports**: `_project_specs/n8n/workflows/` (3 workflow snapshots)
