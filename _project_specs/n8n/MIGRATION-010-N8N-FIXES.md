# Migration 010 — Fix n8n dopo rename prompt_id → prompt_version_id

**Status**: DA APPLICARE
**Data**: 2026-02-16
**Tempo stimato**: 5 min

---

## Cosa è cambiato nel DB

La colonna `evaluator_configs.prompt_id` è stata rinominata a `prompt_version_id` e ora punta direttamente a `prompt_versions(id)` invece che a `prompts(id)`.

---

## Nodo da aggiornare: "Fetch Evaluator Config"

**Workflow**: Battles Evaluator (`202JEX5zm3VlrUT8`)
**Nodo**: `Fetch Evaluator Config` (PostgreSQL Query)

### QUERY ATTUALE (DA SOSTITUIRE)

```sql
SELECT
    ec.id,
    ec.name,
    ec.version,
    ec.criteria,
    ec.system_prompt_template,
    ec.success_config
  FROM evaluator_configs ec
  JOIN prompts pr ON ec.prompt_id = pr.id
  JOIN prompt_versions pv ON pv.prompt_id = pr.id
  JOIN test_runs tr ON tr.prompt_version_id = pv.id
  WHERE tr.id = $1::uuid
    AND ec.status = 'active'
  ORDER BY ec.created_at DESC
  LIMIT 1
```

### QUERY NUOVA (DA INCOLLARE)

```sql
SELECT
    ec.id,
    ec.name,
    ec.version,
    ec.criteria,
    ec.system_prompt_template,
    ec.success_config
  FROM evaluator_configs ec
  JOIN test_runs tr ON tr.prompt_version_id = ec.prompt_version_id
  WHERE tr.id = $1::uuid
    AND ec.status = 'active'
  ORDER BY ec.created_at DESC
  LIMIT 1
```

### Cosa cambia

| Prima | Dopo |
|-------|------|
| 3 JOIN (evaluator_configs → prompts → prompt_versions → test_runs) | 1 JOIN diretto (evaluator_configs → test_runs via prompt_version_id) |
| Dipende dalla tabella `prompts` | Non usa più la tabella `prompts` |
| `ec.prompt_id` | `ec.prompt_version_id` |

### Perché è meglio

- **Più semplice**: 1 JOIN invece di 3
- **Più veloce**: meno tabelle da attraversare
- **Più diretto**: evaluator_config punta direttamente alla prompt_version
- **Allineato**: stessa FK che usa `test_runs.prompt_version_id`

---

## Verifica dopo il fix

1. Salva il nodo in n8n
2. Lancia un test run dal dashboard
3. Verifica che il workflow Evaluator completi senza errori
4. Controlla che il nodo "Fetch Evaluator Config" restituisca i criteri corretti

---

## Rollback (se qualcosa va storto)

Se serve tornare indietro, la query originale funziona ancora perché:
- La tabella `prompts` esiste ancora
- La vecchia colonna `prompt_id` è stata rinominata ma i dati sono gli stessi

Per rollback, riesegui su Supabase SQL Editor:
```sql
ALTER TABLE evaluator_configs RENAME COLUMN prompt_version_id TO prompt_id;
ALTER TABLE evaluator_configs DROP CONSTRAINT IF EXISTS evaluator_configs_prompt_version_id_fkey;
ALTER TABLE evaluator_configs ADD CONSTRAINT evaluator_configs_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES prompts(id);
```

E reincolla la query originale nel nodo n8n.

---

**CANCELLA QUESTO FILE dopo aver applicato i fix.**
