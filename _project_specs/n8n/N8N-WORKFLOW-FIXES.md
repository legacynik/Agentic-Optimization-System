# n8n Workflow Fixes — Istruzioni Operative

**Data**: 2026-02-16
**Contesto**: Test run `RUN-20260216123046-02J` completato 10/10 battles ma l'Evaluator non si e' attivato. Status rimasto a `battles_completed`.

---

## Root Cause Analysis

### Flusso attuale (dal webhook):
```
Dashboard API (crea test_run)
  → n8n Webhook (passa test_run_id)
    → Validate Input → Get Prompt Testing → Set Test Run
      → Get Validated Personas → Loop battles
        → Update testrun status (→ 'battles_completed')
          → Run Evaluator ← BUG QUI
```

### BUG CRITICO: `Run Evaluator` node referenzia nodo sbagliato

Nel nodo **"Run Evaluator"** (Execute Workflow), il campo `test_run_id` usa:
```
={{ $('Create Test Run').item.json.id }}
```

Ma **`Create Test Run` non viene eseguito nel flusso webhook!** Viene eseguito solo nel flusso manuale (Manual Trigger → Edit Fields → get prompt from id → Create Test Run).

Quando il test e' lanciato dalla dashboard:
1. La dashboard crea il `test_run` nel DB
2. Passa il `test_run_id` nel body del webhook
3. Il nodo `Set Test Run` lo salva come `test_run_id` (da `$('Webhook').item.json.body.test_run_id`)
4. Ma `Run Evaluator` cerca `$('Create Test Run')` che non esiste → **ERRORE SILENZIOSO**

---

## FIX 1 (CRITICO): Test RUNNER — Nodo "Run Evaluator"

**Workflow**: Test RUNNER Battle (`XmpBhcUxsRpxAYPN`)
**Nodo**: `Run Evaluator` (ID: `4a9af6b9-c76e-4ee4-955c-466b0689deb1`)

### Cosa cambiare:

Apri il nodo "Run Evaluator" → Workflow Input Mapping:

| Campo | VALORE ATTUALE (SBAGLIATO) | VALORE CORRETTO |
|-------|---------------------------|-----------------|
| `test_run_id` | `={{ $('Create Test Run').item.json.id }}` | `={{ $('Set Test Run').item.json.test_run_id }}` |
| `test_run_code` | `={{ $('Set Test Run').item.json.test_run_code }}` | OK, non cambiare |

### Passi:
1. Apri workflow "Test RUNNER Battle" in n8n
2. Doppio click su nodo **"Run Evaluator"**
3. Nella sezione "Workflow Input", cambia il campo `test_run_id`:
   - **DA**: `={{ $('Create Test Run').item.json.id }}`
   - **A**: `={{ $('Set Test Run').item.json.test_run_id }}`
4. Salva il nodo
5. Salva il workflow
6. **Attiva** il workflow (se era disattivato durante modifica)

---

## FIX 2 (IMPORTANTE): Test RUNNER — Webhook non accetta `test_run_id` dalla dashboard

Il nodo `Validate Input` del RUNNER non passa `test_run_id` dal body del webhook al flusso. Verifica che il `Set Test Run` effettivamente legga `$('Webhook').item.json.body.test_run_id`.

**Verifica**: Il nodo `Set Test Run` ha gia':
```
test_run_id: ={{ $('Webhook').item.json.body.test_run_id }}
```

Questo e' corretto. Ma c'e' un problema: quando il RUNNER crea ANCHE un test_run (nel manual path), il `Create Test Run` INSERT avviene:
```sql
INSERT INTO test_runs (test_run_code, prompt_version_id, ..., status)
VALUES ('RUN-...', '...'::uuid, ..., 'running')
RETURNING id, test_run_code
```

Questo e' solo per il path manuale. Dal webhook, il test_run e' gia' creato dalla dashboard. **Nessun fix necessario qui**, ma attenzione a non usare il path manuale per test reali (creerebbe test_run duplicati senza le stesse relazioni).

---

## FIX 3 (VERIFICA): Evaluator — Nodo "Set Status Evaluating"

**Workflow**: Battles Evaluator (`202JEX5zm3VlrUT8`)
**Nodo**: `Set Status Evaluating`

SQL attuale:
```sql
UPDATE test_runs
SET status = 'evaluating', last_heartbeat_at = NOW()
WHERE id = (
  SELECT id FROM test_runs
  WHERE status = 'battles_completed'
    AND (
      '{{ $json.test_run_id }}' = ''
      OR id::text = '{{ $json.test_run_id }}'
    )
  ORDER BY started_at ASC
  LIMIT 1
)
RETURNING id as test_run_id, test_run_code, status
```

Questo e' CORRETTO: cerca test_run con `status = 'battles_completed'` e matcha per `test_run_id`. Ma se il FIX 1 non passa il test_run_id corretto, questo nodo non troverebbe nessun record.

**Nessun fix necessario** — basta che il FIX 1 sia applicato.

---

## FIX 4 (OPZIONALE): Aggiungere callback alla dashboard

Attualmente sia il RUNNER che l'Evaluator scrivono direttamente nel DB senza inviare callback alla dashboard. La dashboard ha un handler webhook completo (`/api/n8n/webhook`) ma non riceve mai callbacks.

Il sistema funziona comunque perche' la dashboard legge il DB direttamente. Ma per una migliore tracciabilita', si potrebbe aggiungere un nodo HTTP Request alla fine dell'Evaluator.

### Se vuoi implementarlo:

**Dopo** il nodo `Save Report` nell'Evaluator, aggiungi un nodo **HTTP Request**:

| Campo | Valore |
|-------|--------|
| Method | POST |
| URL | `{{ $('Extract Test Run Info').item.json.callback_url || 'https://YOUR-APP-URL/api/n8n/webhook' }}` |
| Headers | `x-n8n-secret`: `{{ $env.N8N_SECRET }}` |
| Body (JSON) | Vedi sotto |

```json
{
  "workflow_type": "evaluator",
  "test_run_id": "{{ $('Set Status Evaluating').item.json.test_run_id }}",
  "status": "completed",
  "result": {
    "average_score": {{ $json.overall_score || 0 }},
    "battles_completed": {{ $json.total_battles || 0 }}
  },
  "timestamp": {{ Date.now() }}
}
```

**NON E' NECESSARIO** per far funzionare il sistema base. E' un improvement.

---

## FIX 5 (VERIFICA): Evaluator — Nodo "Analyze Conversation" DISABILITATO

Il nodo `Analyze Conversation` (ID: `c21a11d7-...`) e' **disabled**. In n8n, un nodo Code disabilitato passa i dati invariati al nodo successivo. Questo e' OK se il `Judge Agent` riceve comunque i dati corretti.

**Verifica**: Apri l'Evaluator → controlla che il flusso da `Process Each Conversation` (output 1) → `Analyze Conversation` (disabled) → `Judge Agent` funzioni. Se il Judge Agent non riceve i campi necessari dal batch, potrebbe fallire silenziosamente.

---

## Checklist di Fix (in ordine di priorita')

- [ ] **FIX 1**: Cambia `Run Evaluator` → `test_run_id` da `$('Create Test Run')` a `$('Set Test Run')`
- [ ] **FIX 3**: Verifica `Set Status Evaluating` (dovrebbe gia' essere OK dopo FIX 1)
- [ ] **FIX 5**: Verifica che `Analyze Conversation` disabled non blocchi il flusso
- [ ] **FIX 4**: (Opzionale) Aggiungi callback HTTP all'Evaluator
- [ ] **TEST**: Rilancia un test dalla dashboard e verifica che lo status passi da `running` → `battles_completed` → `evaluating` → `completed`

---

## Come testare dopo i fix

### Test rapido (1 persona):
```bash
# Dalla dashboard, lancia un test con 1 persona
curl -X POST http://localhost:3000/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_version_id": "INSERISCI-UUID",
    "mode": "single",
    "tool_scenario_id": "happy_path"
  }'
```

### Monitorare il progresso:
1. Dashboard → Test Launcher → Monitor
2. Oppure: `SELECT id, status, overall_score FROM test_runs ORDER BY created_at DESC LIMIT 1;`
3. n8n Executions tab → verifica che Evaluator si attivi dopo le battles

### Status attesi:
```
pending → running → battles_completed → evaluating → completed
                                                      ↑
                                       (con overall_score != null)
```

---

## Riferimenti

| Risorsa | ID/Path |
|---------|---------|
| Test RUNNER | `XmpBhcUxsRpxAYPN` |
| Battle Agent | `Z35cpvwXt7Xy4Mgi` |
| Evaluator | `202JEX5zm3VlrUT8` |
| Dashboard webhook handler | `app/api/n8n/webhook/route.ts` |
| Dashboard test launcher | `app/api/test-runs/route.ts` |
| n8n URL | `https://primary-production-1d87.up.railway.app` |
