# n8n Workflow Integration

## Workflows

| Workflow | ID | Status | Nodes | LLM Models | Purpose |
|----------|-----|--------|-------|------------|---------|
| Test RUNNER | `XmpBhcUxsRpxAYPN` | Active | 20 | — | Orchestrates test runs — triggers Battle Agent per persona, manages iterations |
| Battle Agent | `Z35cpvwXt7Xy4Mgi` | Active | 23 | GPT-5-mini (agent), GPT-4.1-mini (persona) | Agent-persona conversations — chat memory, tool mocking |
| Evaluator | `202JEX5zm3VlrUT8` | Active | 36 | Gemini 3 Flash (judge), Claude Sonnet 4.5 (analyzer) | Judges conversation quality + post-loop analysis |
| Optimizer | `honcSigslEtpoVqy` | Active | 11 | Claude Sonnet 4.5 | Generates prompt improvements (surgical/full rewrite) |
| Personas Generator | `HltftwB9Bm8LNQsO` | Active | 14 | Claude Sonnet 4.5 + GPT-4.1-mini (parser) | Generates test personas from prompt analysis |
| Personas Validator | `aGlmWu7SPHw17eYQ` | Active | 12 | Gemini 2.5 Flash | Validates persona quality (naturalness/coherence/testability) |

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

## Recent Fixes (Feb 2026)

| Fix | Date | Details |
|-----|------|---------|
| Max turns cap | Feb 17 | Configurable via `workflow_configs.config.max_turns` (default 50). Passed through API → RUNNER → Battle Agent |
| Evaluator parser | Feb 17 | Robust parser: handles markdown fences, trailing commas, type coercion. 0 fallback rate |
| Gemini Flash 3 | Feb 17 | Judge Agent upgraded from Gemini 2.0 Flash for larger context windows |
| Post-loop Analyzer | Feb 17 | Rewritten: PG Aggregate + LLM Analyzer with Playbook-driven prompt |
| REQ-5.9 status completed | Feb 17 | Test RUNNER sets status='completed' after all battles + evaluation |

## Deferred Items (intentionally not implemented)

| Item | Rationale |
|------|-----------|
| Check Abort #2 (REQ-5.6) | Abort #1 already works, this is a responsiveness optimization |
| x-n8n-secret on callbacks (REQ-5.7) | Single-user internal tool, dev mode sufficient |
| Tool Mocking (REQ-5.8) | Tools tested live, mocking doesn't reflect real behavior |

## Detailed Documentation

For implementation details, modification requirements, and changelog:

- **Changelog**: [`_project_specs/n8n/CHANGELOG.md`](./../_project_specs/n8n/CHANGELOG.md) (v2.0 → v2.4 Lean → Feb 2026 fixes)
- **Modification requirements (archived)**: [`_project_specs/archive/n8n-MODIFICATIONS-REQUIRED-v2.4.md`](./../_project_specs/archive/n8n-MODIFICATIONS-REQUIRED-v2.4.md) — historical reference
- **Workflow JSON exports**: `_project_specs/n8n/workflows/` (6 workflow snapshots, synced 2026-02-25)
- **LLM Prompts Reference**: [`docs/prompts-reference.md`](./prompts-reference.md) — full text of all LLM prompts extracted from workflows
