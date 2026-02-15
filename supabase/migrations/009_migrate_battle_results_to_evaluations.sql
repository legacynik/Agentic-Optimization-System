-- Migration: Populate battle_evaluations from existing battle_results
-- Purpose: Extract evaluation data from battle_results.evaluation_details JSONB
--          and create battle_evaluations records linked to evaluations table
-- Created: 2026-01-29
-- Part of: Evaluator Multi-Prompt Architecture (Phase 3: Data Migration)

-- =============================================================================
-- MIGRATION LOGIC
-- =============================================================================

-- Insert battle_evaluations from battle_results with evaluation_details
INSERT INTO battle_evaluations (
  evaluation_id,
  battle_result_id,
  score,
  criteria_scores,
  outcome,
  summary,
  strengths,
  weaknesses,
  raw_response,
  evaluated_at,
  evaluator_version
)
SELECT
  e.id as evaluation_id,
  br.id as battle_result_id,

  -- Extract score (use battle_results.score as primary, fallback to evaluation_details)
  COALESCE(br.score, (br.evaluation_details->>'overall_score')::numeric) as score,

  -- Extract criteria_scores JSONB
  br.evaluation_details->'criteria_scores' as criteria_scores,

  -- Extract outcome (use battle_results.outcome as primary)
  COALESCE(br.outcome, br.evaluation_details->>'conversation_outcome') as outcome,

  -- Extract summary
  br.evaluation_details->>'summary' as summary,

  -- Extract strengths (convert top_strength to array if exists)
  CASE
    WHEN br.evaluation_details->>'top_strength' IS NOT NULL THEN
      jsonb_build_array(br.evaluation_details->>'top_strength')
    ELSE
      COALESCE(br.evaluation_details->'strengths', '[]'::jsonb)
  END as strengths,

  -- Extract weaknesses (convert main_weakness to array if exists)
  CASE
    WHEN br.evaluation_details->>'main_weakness' IS NOT NULL THEN
      jsonb_build_array(br.evaluation_details->>'main_weakness')
    ELSE
      COALESCE(br.evaluation_details->'weaknesses', '[]'::jsonb)
  END as weaknesses,

  -- Store entire evaluation_details as raw_response for debugging
  br.evaluation_details as raw_response,

  -- Use battle_results.created_at as evaluated_at
  br.created_at as evaluated_at,

  -- Extract evaluator_version if available
  br.evaluation_details->>'evaluator_version' as evaluator_version

FROM battle_results br
INNER JOIN evaluations e ON e.test_run_id = br.test_run_id

WHERE
  -- Only migrate battle_results that have evaluation_details
  br.evaluation_details IS NOT NULL

  -- Only link to promoted evaluations (the legacy evaluator)
  AND e.is_promoted = true

-- Make idempotent: skip if battle_evaluation already exists
ON CONFLICT (evaluation_id, battle_result_id) DO NOTHING;


-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  battle_results_with_eval INT;
  battle_evaluations_created INT;
  evaluations_count INT;
  mismatch_count INT;
  null_evaluations INT;
BEGIN
  -- Count battle_results with evaluation_details
  SELECT COUNT(*) INTO battle_results_with_eval
  FROM battle_results
  WHERE evaluation_details IS NOT NULL;

  -- Count battle_evaluations created
  SELECT COUNT(*) INTO battle_evaluations_created
  FROM battle_evaluations be
  JOIN evaluations e ON e.id = be.evaluation_id
  WHERE e.triggered_by = 'migration';

  -- Count promoted evaluations
  SELECT COUNT(*) INTO evaluations_count
  FROM evaluations
  WHERE is_promoted = true;

  -- Count battle_results with evaluation_details but no battle_evaluation
  SELECT COUNT(*) INTO null_evaluations
  FROM battle_results br
  LEFT JOIN battle_evaluations be ON be.battle_result_id = br.id
  WHERE br.evaluation_details IS NOT NULL
    AND be.id IS NULL;

  -- Report results
  RAISE NOTICE '=== Battle Evaluations Migration Results ===';
  RAISE NOTICE 'battle_results with evaluation_details: %', battle_results_with_eval;
  RAISE NOTICE 'battle_evaluations created: %', battle_evaluations_created;
  RAISE NOTICE 'Promoted evaluations (legacy): %', evaluations_count;
  RAISE NOTICE 'battle_results missing battle_evaluation: %', null_evaluations;

  -- Validation: every battle_result with evaluation_details should have a battle_evaluation
  IF null_evaluations > 0 THEN
    RAISE WARNING 'Some battle_results with evaluation_details do not have battle_evaluations!';
    RAISE WARNING 'This may be expected if those battle_results are from test_runs without evaluations.';
  END IF;

  -- Success message
  IF battle_evaluations_created > 0 THEN
    RAISE NOTICE 'Migration completed successfully. Created % battle_evaluation records.', battle_evaluations_created;
  ELSE
    RAISE WARNING 'No battle_evaluations created. This may indicate:';
    RAISE WARNING '  1. Migration already run (idempotent check)';
    RAISE WARNING '  2. No battle_results with evaluation_details exist';
    RAISE WARNING '  3. No promoted evaluations exist';
  END IF;
END $$;


-- =============================================================================
-- DATA VALIDATION VIEW
-- =============================================================================

-- View to compare battle_results.evaluation_details with battle_evaluations
CREATE OR REPLACE VIEW battle_evaluation_migration_check AS
SELECT
  br.id as battle_result_id,
  br.test_run_id,
  tr.test_run_code,

  -- Source data from battle_results
  br.score as br_score,
  br.outcome as br_outcome,
  br.evaluation_details->>'overall_score' as br_eval_overall_score,
  br.evaluation_details->>'conversation_outcome' as br_eval_outcome,
  (br.evaluation_details IS NOT NULL) as has_evaluation_details,

  -- Migrated data from battle_evaluations
  be.id as battle_evaluation_id,
  be.score as be_score,
  be.outcome as be_outcome,
  jsonb_object_keys(be.criteria_scores) as be_criteria_count,
  jsonb_array_length(be.strengths) as be_strengths_count,
  jsonb_array_length(be.weaknesses) as be_weaknesses_count,

  -- Evaluation link
  be.evaluation_id,
  e.is_promoted,
  e.triggered_by,

  -- Validation status
  CASE
    WHEN br.evaluation_details IS NULL THEN 'NO_EVAL_DETAILS'
    WHEN be.id IS NULL THEN 'NOT_MIGRATED'
    WHEN be.score IS NULL THEN 'SCORE_NULL'
    WHEN be.criteria_scores IS NULL THEN 'CRITERIA_NULL'
    ELSE 'MIGRATED'
  END as migration_status

FROM battle_results br
LEFT JOIN battle_evaluations be ON be.battle_result_id = br.id
LEFT JOIN evaluations e ON e.id = be.evaluation_id
LEFT JOIN test_runs tr ON tr.id = br.test_run_id

ORDER BY br.created_at DESC;

COMMENT ON VIEW battle_evaluation_migration_check IS
'Validation view to verify battle_results → battle_evaluations migration. Use to identify missing or incomplete migrations.';


-- =============================================================================
-- SUMMARY STATS
-- =============================================================================

-- Quick summary query to verify migration
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Migration Status Summary ===';

  FOR rec IN
    SELECT
      migration_status,
      COUNT(*) as count
    FROM battle_evaluation_migration_check
    GROUP BY migration_status
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  %: %', rec.migration_status, rec.count;
  END LOOP;
END $$;
