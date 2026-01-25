-- =============================================================================
-- FIX URGENTE: Crea tabella prompt_personas e associazioni
-- ESEGUI QUESTO FILE NEL SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/dlozxirsmrbriuklgcxq/sql/new
-- =============================================================================

-- 1. Crea la tabella prompt_personas (se non esiste)
CREATE TABLE IF NOT EXISTS prompt_personas (
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  prompt_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (persona_id, prompt_name)
);

-- 2. Crea gli indici
CREATE INDEX IF NOT EXISTS idx_prompt_personas_prompt_name ON prompt_personas(prompt_name);
CREATE INDEX IF NOT EXISTS idx_prompt_personas_persona_id ON prompt_personas(persona_id);

-- 3. Abilita RLS
ALTER TABLE prompt_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for prompt_personas" ON prompt_personas;
CREATE POLICY "Allow all for prompt_personas" ON prompt_personas FOR ALL USING (true);

-- 4. Inserisci le associazioni per TUTTE le personas validate verso qual-audit-sa
INSERT INTO prompt_personas (persona_id, prompt_name, is_active, priority)
SELECT
  id as persona_id,
  'qual-audit-sa' as prompt_name,
  true as is_active,
  ROW_NUMBER() OVER (ORDER BY name)::INTEGER as priority
FROM personas
WHERE validation_status = 'validated'
ON CONFLICT (persona_id, prompt_name) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 5. Verifica risultato
SELECT
  pp.persona_id,
  pp.prompt_name,
  pp.is_active,
  pp.priority,
  p.name as persona_name,
  p.validation_status
FROM prompt_personas pp
JOIN personas p ON p.id = pp.persona_id
WHERE pp.prompt_name = 'qual-audit-sa'
ORDER BY pp.priority;
