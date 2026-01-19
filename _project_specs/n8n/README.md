# n8n Workflow Specifications

Questa cartella contiene tutte le specifiche e modifiche per i workflow n8n del sistema di testing.

## Struttura

```
_project_specs/n8n/
├── README.md                    # Questo file
├── MODIFICATIONS-REQUIRED.md    # Modifiche da fare ai workflow esistenti
├── workflows/                   # Export JSON dei workflow
│   ├── test-runner-v2.json     # Test Runner aggiornato
│   ├── evaluator.json          # Evaluator
│   └── personas-generator.json # Personas Generator (futuro)
└── CHANGELOG.md                # Log delle modifiche fatte
```

## Workflow Attuali

| Workflow | ID n8n | Stato | Webhook |
|----------|--------|-------|---------|
| Test RUNNER Battle | XmpBhcUxsRpxAYPN | Attivo con webhook | `5877058c-19fd-4f26-add4-66b3526c4a96` |
| Test Battle Agent | Z35cpvwXt7Xy4Mgi | Sub-workflow | - |
| Battles Evaluator | ? | Da verificare | - |

## Ambiente n8n

- **Host**: Railway
- **URL Base**: `https://primary-production-1d87.up.railway.app`
- **Webhook Base**: `https://primary-production-1d87.up.railway.app/webhook/`

## Come Usare Questa Documentazione

1. **Per modifiche**: Leggi `MODIFICATIONS-REQUIRED.md`
2. **Dopo modifiche**: Esporta workflow JSON in `workflows/`
3. **Aggiorna**: `CHANGELOG.md` con cosa hai fatto

## Sincronizzazione con Dashboard

Quando modifichi workflow n8n:
1. Aggiorna `MODIFICATIONS-REQUIRED.md` segnando come DONE
2. Esporta JSON aggiornato
3. Segnala nella sessione dashboard per aggiornare API/UI se necessario
