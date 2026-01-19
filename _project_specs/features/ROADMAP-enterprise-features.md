# Enterprise Features Roadmap

> Questo documento contiene le feature "enterprise-grade" rimosse dal PRD v2.3 per semplificare l'MVP single-user.
> Queste feature possono essere implementate in futuro quando il sistema scala.

---

## 1. Distributed Rate Limiting (Upstash)

**Rimosso in**: PRD v2.3
**Motivo**: Single-user non richiede rate limiting distribuito

### Quando Implementare
- Quando il sistema diventa multi-tenant
- Quando ci sono più utenti concorrenti
- Quando si espone l'API pubblicamente

### Implementazione

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
});

// Usage in API route
const { success, limit, remaining, reset } = await rateLimiter.limit(identifier);
if (!success) {
  return Response.json(
    { error: 'Rate limit exceeded', retry_after: reset },
    { status: 429 }
  );
}
```

### Environment Variables
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 2. Timing-Safe HMAC Comparison

**Rimosso in**: PRD v2.3
**Motivo**: Per tool interno, confronto stringa semplice è sufficiente

### Quando Implementare
- Quando l'API è esposta su internet pubblico
- Quando ci sono requisiti di security compliance
- Quando si gestiscono dati sensibili di terzi

### Implementazione

```typescript
import crypto, { timingSafeEqual } from 'crypto';

function verifySignature(signature: string, expected: string): boolean {
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
```

---

## 3. Replay Attack Protection (Nonce Storage)

**Rimosso in**: PRD v2.3
**Motivo**: Richiede storage Redis, overkill per single-user

### Quando Implementare
- Ambiente multi-tenant
- API pubblica
- Requisiti security avanzati

### Implementazione

```typescript
// Nonce storage con TTL
const NONCE_TTL = 5 * 60 * 1000; // 5 minuti
const usedNonces = new Map<string, number>(); // Per MVP in-memory

// Con Redis (enterprise)
await redis.set(`nonce:${nonce}`, '1', { ex: 300 }); // 5 min TTL
const exists = await redis.exists(`nonce:${nonce}`);
if (exists) {
  return Response.json({ error: 'Replay attack detected' }, { status: 401 });
}
```

---

## 4. Tool Mock Scenarios su Database

**Rimosso in**: PRD v2.3
**Motivo**: Per 3-5 scenari, hardcoded è sufficiente

### Quando Implementare
- Più di 10 scenari diversi
- Necessità di editing da parte di non-dev
- Scenari condivisi tra team

### Schema Database

```sql
CREATE TABLE tool_mock_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  mock_responses JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO tool_mock_scenarios (name, description, mock_responses, is_default) VALUES
('happy_path', 'Tutto funziona correttamente', '{...}', true),
('calendar_full', 'Nessuno slot disponibile', '{...}', false),
('booking_fails', 'Errore durante prenotazione', '{...}', false);
```

### API Endpoints
- `GET /api/tool-scenarios` - Lista scenari
- `POST /api/tool-scenarios` - Crea scenario
- `PUT /api/tool-scenarios/:id` - Aggiorna scenario
- `DELETE /api/tool-scenarios/:id` - Elimina scenario

---

## 5. Autonomous Optimization Loop

**Rimosso in**: PRD v2.3
**Motivo**: Rischio overfitting, token burn, modifiche non controllate

### Quando Implementare
- Sistema maturo e testato
- Guardrails robusti (diff limits, rollback automatico)
- Budget API dedicato per sperimentazione

### Flow Automatico (Future)

```
[Test Complete]
    ↓
[Analyzer] → Identifica patterns
    ↓
[Optimizer] → Genera nuovo prompt
    ↓
[Guardrails Check]
    ├── Diff > 30%? → STOP, require human review
    ├── Score peggiorato 2x? → ROLLBACK
    └── OK → Auto-save draft
    ↓
[Auto Rerun] → iteration++
    ↓
[Loop until max_iterations OR target_score]
```

### Guardrails Necessari
1. **Diff Limit**: Se le modifiche > 30% del prompt, STOP
2. **Score Regression**: Se score peggiora 2 volte consecutive, ROLLBACK
3. **Token Budget**: Max $X per ciclo completo
4. **Time Limit**: Max 1 ora per ciclo
5. **Human Checkpoint**: Ogni N iterazioni, richiedi review

---

## 6. Database Triggers

**Rimosso in**: PRD v2.3
**Motivo**: Gestibile in application code, semplifica migrazioni

### Trigger: feedback_updated_at

```sql
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.feedback_notes IS DISTINCT FROM OLD.feedback_notes THEN
    NEW.feedback_updated_at = NOW();
    NEW.validation_status = 'needs_revision';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_update
BEFORE UPDATE ON personas
FOR EACH ROW
EXECUTE FUNCTION update_feedback_timestamp();
```

### Trigger: version_metrics_update

```sql
CREATE OR REPLACE FUNCTION update_version_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE prompt_versions
    SET
      avg_success_rate = (
        SELECT ROUND(COUNT(*) FILTER (WHERE outcome = 'success') * 100.0 / COUNT(*), 2)
        FROM battle_results WHERE test_run_id = NEW.id
      ),
      avg_score = (SELECT ROUND(AVG(score), 1) FROM battle_results WHERE test_run_id = NEW.id),
      total_test_runs = total_test_runs + 1,
      updated_at = NOW()
    WHERE id = NEW.prompt_version_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Advanced Analytics

### Performance Trends Over Time
```sql
CREATE VIEW prompt_performance_trend AS
SELECT
  pv.prompt_name,
  DATE_TRUNC('day', tr.completed_at) as day,
  AVG(tr.overall_score) as avg_score,
  COUNT(*) as test_count
FROM test_runs tr
JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
WHERE tr.status = 'completed'
GROUP BY pv.prompt_name, DATE_TRUNC('day', tr.completed_at)
ORDER BY day;
```

### Persona Difficulty Analysis
```sql
CREATE VIEW persona_difficulty_analysis AS
SELECT
  p.difficulty,
  COUNT(*) as total_battles,
  AVG(br.score) as avg_score,
  COUNT(*) FILTER (WHERE br.outcome = 'success') * 100.0 / COUNT(*) as success_rate
FROM battle_results br
JOIN personas p ON br.persona_id = p.id
GROUP BY p.difficulty;
```

---

## Migration Path

Quando decidi di implementare una feature enterprise:

1. **Leggi questa sezione** per i dettagli implementativi
2. **Crea migration SQL** se necessario
3. **Aggiungi al PRD** come nuova Phase
4. **Testa in staging** prima di produzione
5. **Aggiorna questo documento** segnando come "Implementato"

---

## Status Tracking

| Feature | Status | Implementato in |
|---------|--------|-----------------|
| Upstash Rate Limiting | Deferred | - |
| Timing-Safe HMAC | Deferred | - |
| Nonce Storage | Deferred | - |
| Tool Scenarios DB | Deferred | - |
| Auto Optimization | Deferred | - |
| DB Triggers | Deferred | - |
| Advanced Analytics | Deferred | - |

---

*Last Updated: 2026-01-19*
*PRD Version: v2.3 Lean*
