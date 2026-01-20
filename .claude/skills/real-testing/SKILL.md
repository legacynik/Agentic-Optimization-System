# Real Testing Skill

## Regola

**Unit test VERDI ≠ Funziona. VERIFICA SEMPRE manualmente.**

---

## Dopo ogni feature

### Backend/API
```bash
# 1. Avvia l'app
# 2. Chiama l'endpoint realmente
curl -X POST http://localhost:3000/api/users -d '{"email":"test@test.com"}'

# 3. Verifica DB
psql -c "SELECT * FROM users WHERE email='test@test.com'"

# 4. Controlla i log
tail -f logs/app.log
```

### Frontend/UI
```
# 1. Apri il browser
# 2. Naviga alla feature
# 3. Screenshot o Playwright MCP per verificare
# 4. Testa edge cases (form vuoto, errori, loading)
```

### DB Migration
```bash
# 1. Applica migration
# 2. Verifica schema
\d table_name

# 3. Testa rollback
```

---

## Checklist Pre-Merge

- [ ] App avviata e testata manualmente
- [ ] Endpoint chiamati con curl/Postman
- [ ] Dati verificati in DB
- [ ] UI verificata visivamente (screenshot se possibile)
- [ ] Edge cases testati (errori, vuoti, limiti)
- [ ] Log controllati per errori/warning

---

## Perché

L'AI scrive test che confermano cosa il codice FA, non cosa DOVREBBE fare.
Test verdi + feature rotta = succede spesso.

**Trova i bug tu, non l'utente.**
