-- Migration 014: P1 High Impact Pipeline Improvements
-- Purpose: Schema changes for T5 (analyzer flag), T6 (persona validator), T7 (parse resilience)
-- Created: 2026-02-20
-- Source: _project_specs/specs/pipeline-p1-high-impact.md

-- =============================================================================
-- T5: Analyzer as Optional Flag
-- =============================================================================

-- Track whether an evaluation ran the LLM Analyzer
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS has_analysis BOOLEAN DEFAULT false;

-- =============================================================================
-- T6: Persona Validator — New Columns
-- =============================================================================

-- Validation score (weighted avg of naturalness, coherence, testability)
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS validation_score NUMERIC;

-- Detailed per-criterion scores from LLM validation
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS validation_details JSONB;

-- Human-readable reason when persona is rejected
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update validation_status to support new lifecycle states
-- Current: VARCHAR(50) DEFAULT 'pending' (no CHECK constraint)
-- New values: pending_validation, validated, rejected, approved_override
-- Migrate existing 'pending' → 'pending_validation', 'validated' stays
UPDATE personas
SET validation_status = 'pending_validation'
WHERE validation_status = 'pending';

-- Add CHECK constraint for allowed values
ALTER TABLE personas
  DROP CONSTRAINT IF EXISTS personas_validation_status_check;

ALTER TABLE personas
  ADD CONSTRAINT personas_validation_status_check
  CHECK (validation_status IN ('pending_validation', 'validated', 'rejected', 'approved_override'));

-- =============================================================================
-- T6: Persona Validator — workflow_configs threshold
-- =============================================================================

-- Update personas_validator config to include validation threshold
UPDATE workflow_configs
SET config = config || '{"threshold": 7.0}'::jsonb
WHERE workflow_type = 'personas_validator';

-- =============================================================================
-- T7: Parse Error Resilience — no schema changes needed
-- (outcome='error' is stored in battle_evaluations.outcome which is already TEXT)
-- =============================================================================

-- =============================================================================
-- VERIFY
-- =============================================================================

DO $$
DECLARE
  has_analysis_exists BOOLEAN;
  validation_score_exists BOOLEAN;
  validation_details_exists BOOLEAN;
  rejection_reason_exists BOOLEAN;
  pending_count INT;
  threshold_ok BOOLEAN;
BEGIN
  -- T5: Check has_analysis column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluations' AND column_name = 'has_analysis'
  ) INTO has_analysis_exists;

  IF NOT has_analysis_exists THEN
    RAISE EXCEPTION 'has_analysis column not added to evaluations';
  END IF;

  -- T6: Check new persona columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personas' AND column_name = 'validation_score'
  ) INTO validation_score_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personas' AND column_name = 'validation_details'
  ) INTO validation_details_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personas' AND column_name = 'rejection_reason'
  ) INTO rejection_reason_exists;

  IF NOT (validation_score_exists AND validation_details_exists AND rejection_reason_exists) THEN
    RAISE EXCEPTION 'Missing persona validation columns';
  END IF;

  -- T6: Verify no personas left with old 'pending' status
  SELECT COUNT(*) INTO pending_count
  FROM personas WHERE validation_status = 'pending';

  IF pending_count > 0 THEN
    RAISE WARNING '% personas still have old pending status', pending_count;
  END IF;

  -- T6: Check threshold in workflow_configs
  SELECT (config->>'threshold')::numeric = 7.0
  INTO threshold_ok
  FROM workflow_configs
  WHERE workflow_type = 'personas_validator';

  IF NOT threshold_ok THEN
    RAISE WARNING 'personas_validator threshold not set to 7.0';
  END IF;

  RAISE NOTICE 'Migration 014 completed: P1 high impact schema ready';
  RAISE NOTICE '  - evaluations.has_analysis: added (T5)';
  RAISE NOTICE '  - personas: validation_score, validation_details, rejection_reason added (T6)';
  RAISE NOTICE '  - personas.validation_status: CHECK constraint updated (T6)';
  RAISE NOTICE '  - workflow_configs.personas_validator: threshold=7.0 (T6)';
END $$;
