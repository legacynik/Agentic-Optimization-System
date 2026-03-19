# n8n Workflow Specifications

Questa cartella contiene tutte le specifiche e modifiche per i workflow n8n del sistema di testing.

## Struttura

```
_project_specs/n8n/
├── README.md                    # Questo file
├── CHANGELOG.md                 # Log delle modifiche fatte
└── workflows/                   # Export JSON dei workflow (canonical location)
    ├── test-runner-battle.json        # Test Runner (20 nodes)
    ├── test-battle-agent-v1.json      # Battle Agent (23 nodes)
    ├── battles-evaluator.json         # Evaluator + Analyzer (36 nodes)
    ├── prompt-optimizer.json          # Optimizer (11 nodes)
    ├── personas-generator-v2.json     # Personas Generator (14 nodes)
    └── personas-validator.json        # Personas Validator (12 nodes)
```

## Workflow Attuali

| Workflow | ID n8n | Stato | Nodes | LLM Models |
|----------|--------|-------|-------|------------|
| Test RUNNER Battle | `XmpBhcUxsRpxAYPN` | Active | 20 | — (orchestration) |
| Test Battle Agent | `Z35cpvwXt7Xy4Mgi` | Active | 23 | GPT-5-mini, GPT-4.1-mini |
| Battles Evaluator | `202JEX5zm3VlrUT8` | Active | 36 | Gemini 3 Flash, Claude Sonnet 4.5 |
| Prompt Optimizer | `honcSigslEtpoVqy` | Active | 11 | Claude Sonnet 4.5 |
| Personas Generator v2 | `HltftwB9Bm8LNQsO` | Active | 14 | Claude Sonnet 4.5, GPT-4.1-mini |
| Personas Validator | `aGlmWu7SPHw17eYQ` | Active | 12 | Gemini 2.5 Flash |

## Ambiente n8n

- **Host**: Railway
- **URL Base**: `https://primary-production-1d87.up.railway.app`
- **Webhook Base**: `https://primary-production-1d87.up.railway.app/webhook/`

## Come Usare Questa Documentazione

1. **Per modifiche**: Apri workflow in n8n editor
2. **Dopo modifiche**: Esporta workflow JSON in `workflows/`
3. **Aggiorna**: `CHANGELOG.md` con cosa hai fatto
4. **Prompts reference**: Vedi `docs/prompts-reference.md` per testo completo di tutti i prompt LLM

## Sincronizzazione con Dashboard

Quando modifichi workflow n8n:
1. Esporta JSON aggiornato in `workflows/`
2. Aggiorna `CHANGELOG.md`
3. Se cambiano prompt LLM, aggiorna `docs/prompts-reference.md`
4. Segnala nella sessione dashboard per aggiornare API/UI se necessario

## Last Sync

- **Date**: 2026-02-25
- **Method**: n8n MCP `n8n_get_workflow` (mode=full)
- **All 6 workflows**: Fresh export from live instance
