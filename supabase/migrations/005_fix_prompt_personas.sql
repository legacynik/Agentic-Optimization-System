-- =============================================================================
-- FIX: Create prompt_personas associations for qual-audit-sa
-- Applied: 2026-01-24
-- =============================================================================

-- First ensure the table exists (safe migration)
CREATE TABLE IF NOT EXISTS prompt_personas (
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  prompt_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (persona_id, prompt_name)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_prompt_personas_prompt_name ON prompt_personas(prompt_name);
CREATE INDEX IF NOT EXISTS idx_prompt_personas_persona_id ON prompt_personas(persona_id);

-- Enable RLS
ALTER TABLE prompt_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for prompt_personas" ON prompt_personas;
CREATE POLICY "Allow all for prompt_personas" ON prompt_personas FOR ALL USING (true);

-- =============================================================================
-- Insert associations for all personas to qual-audit-sa prompt
-- =============================================================================

-- Get all persona IDs and link them to qual-audit-sa
INSERT INTO prompt_personas (persona_id, prompt_name, is_active, priority)
SELECT
  id as persona_id,
  'qual-audit-sa' as prompt_name,
  true as is_active,
  ROW_NUMBER() OVER (ORDER BY name) as priority
FROM personas
WHERE validation_status = 'validated'
ON CONFLICT (persona_id, prompt_name) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- Verify the result
-- SELECT COUNT(*) as associations_created FROM prompt_personas WHERE prompt_name = 'qual-audit-sa';
