-- Migration 010: Fix evaluator_configs FK and add missing indexes
-- Problem: Migration 006 references non-existent `prompts` table.
--          The project uses `prompt_versions` as the prompt entity.
-- Fix:     Rename prompt_id → prompt_version_id, FK → prompt_versions(id)
-- Also:    Add missing performance indexes on evaluations and battle_evaluations

-- =============================================================================
-- 1. FIX evaluator_configs: prompt_id → prompt_version_id referencing prompt_versions
-- =============================================================================

-- Drop the broken FK constraint (may not exist if 006 failed)
ALTER TABLE evaluator_configs
  DROP CONSTRAINT IF EXISTS evaluator_configs_prompt_id_fkey CASCADE;

-- Drop dependent index and unique constraint before renaming
DROP INDEX IF EXISTS idx_evaluator_promoted;
ALTER TABLE evaluator_configs
  DROP CONSTRAINT IF EXISTS evaluator_configs_prompt_id_version_key CASCADE;

-- Rename column for consistency with test_runs.prompt_version_id
ALTER TABLE evaluator_configs
  RENAME COLUMN prompt_id TO prompt_version_id;

-- Add correct FK to prompt_versions
ALTER TABLE evaluator_configs
  ADD CONSTRAINT evaluator_configs_prompt_version_id_fkey
  FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id);

-- Recreate unique constraint with new column name
ALTER TABLE evaluator_configs
  ADD CONSTRAINT evaluator_configs_prompt_version_id_version_key
  UNIQUE (prompt_version_id, version);

-- Recreate promoted index with new column name
CREATE INDEX IF NOT EXISTS idx_evaluator_promoted
  ON evaluator_configs(prompt_version_id, is_promoted)
  WHERE is_promoted = true;

-- =============================================================================
-- 2. FIX legacy evaluator data (from migration 007)
--    If evaluator_configs has rows with NULL/invalid prompt_version_id,
--    point them to the first prompt_version
-- =============================================================================

UPDATE evaluator_configs
SET prompt_version_id = (
  SELECT id FROM prompt_versions ORDER BY created_at ASC LIMIT 1
)
WHERE prompt_version_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM prompt_versions WHERE id = evaluator_configs.prompt_version_id
   );

-- =============================================================================
-- 3. ADD MISSING INDEXES for query performance
-- =============================================================================

-- evaluations(test_run_id) - for joins from test_runs
-- Note: idx_evaluation_promoted is partial, this covers general lookups
CREATE INDEX IF NOT EXISTS idx_evaluations_test_run_id
  ON evaluations(test_run_id);

-- evaluations(created_at DESC) - for ordering by recency
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at
  ON evaluations(created_at DESC);

-- battle_evaluations(created_at DESC) - for ordering by recency
-- Note: battle_evaluations uses evaluated_at, not created_at
CREATE INDEX IF NOT EXISTS idx_battle_evaluations_evaluated_at
  ON battle_evaluations(evaluated_at DESC);

-- =============================================================================
-- 4. VERIFY
-- =============================================================================

DO $$
DECLARE
  fk_exists BOOLEAN;
  orphan_count INT;
BEGIN
  -- Check FK constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'evaluator_configs_prompt_version_id_fkey'
      AND table_name = 'evaluator_configs'
  ) INTO fk_exists;

  IF NOT fk_exists THEN
    RAISE EXCEPTION 'FK constraint evaluator_configs_prompt_version_id_fkey not created';
  END IF;

  -- Check no orphaned references
  SELECT COUNT(*) INTO orphan_count
  FROM evaluator_configs ec
  WHERE NOT EXISTS (
    SELECT 1 FROM prompt_versions pv WHERE pv.id = ec.prompt_version_id
  );

  IF orphan_count > 0 THEN
    RAISE WARNING '% evaluator_configs rows have orphaned prompt_version_id', orphan_count;
  END IF;

  RAISE NOTICE 'Migration 010 completed: evaluator_configs.prompt_version_id now references prompt_versions(id)';
END $$;
