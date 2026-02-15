-- Migration: Populate evaluations table from existing test_runs
-- Purpose: Create evaluation records for all completed test_runs using legacy evaluator
-- Created: 2026-01-29

-- Insert evaluations for all completed test_runs
-- Uses legacy sales-evaluator v1.0 for all historical data
-- Calculates aggregates from battle_results

INSERT INTO evaluations (
  test_run_id,
  evaluator_config_id,
  status,
  is_promoted,
  overall_score,
  success_count,
  failure_count,
  partial_count,
  started_at,
  completed_at,
  triggered_by
)
SELECT
  tr.id as test_run_id,
  ec.id as evaluator_config_id,
  'completed' as status,
  true as is_promoted,

  -- Calculate aggregates from battle_results
  COALESCE(ROUND(AVG(br.score)::numeric, 2), 0) as overall_score,
  COUNT(*) FILTER (WHERE br.outcome = 'success') as success_count,
  COUNT(*) FILTER (WHERE br.outcome IN ('timeout', 'error', 'failure')) as failure_count,
  COUNT(*) FILTER (WHERE br.outcome = 'partial') as partial_count,

  -- Copy timestamps from test_runs
  tr.started_at,
  tr.completed_at,

  'migration' as triggered_by

FROM test_runs tr
CROSS JOIN evaluator_configs ec
LEFT JOIN battle_results br ON br.test_run_id = tr.id

WHERE
  tr.status = 'completed'
  AND ec.name = 'sales-evaluator'
  AND ec.version = '1.0'

GROUP BY tr.id, ec.id, tr.started_at, tr.completed_at

-- Make idempotent: skip if evaluation already exists
ON CONFLICT (test_run_id, evaluator_config_id) DO NOTHING;


-- Verify the migration results
DO $$
DECLARE
  completed_test_runs INT;
  created_evaluations INT;
  evaluations_with_battles INT;
  evaluations_without_battles INT;
BEGIN
  -- Count completed test_runs
  SELECT COUNT(*) INTO completed_test_runs
  FROM test_runs
  WHERE status = 'completed';

  -- Count created evaluations
  SELECT COUNT(*) INTO created_evaluations
  FROM evaluations
  WHERE triggered_by = 'migration';

  -- Count evaluations with battle results
  SELECT COUNT(DISTINCT e.id) INTO evaluations_with_battles
  FROM evaluations e
  JOIN battle_results br ON br.test_run_id = e.test_run_id
  WHERE e.triggered_by = 'migration';

  -- Count evaluations without battle results
  SELECT COUNT(DISTINCT e.id) INTO evaluations_without_battles
  FROM evaluations e
  LEFT JOIN battle_results br ON br.test_run_id = e.test_run_id
  WHERE e.triggered_by = 'migration' AND br.id IS NULL;

  -- Report results
  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Completed test_runs: %', completed_test_runs;
  RAISE NOTICE 'Created evaluations: %', created_evaluations;
  RAISE NOTICE 'Evaluations with battles: %', evaluations_with_battles;
  RAISE NOTICE 'Evaluations without battles: %', evaluations_without_battles;

  -- Validate: every completed test_run should have an evaluation
  IF created_evaluations < completed_test_runs THEN
    RAISE WARNING 'Some test_runs are missing evaluations! Expected: %, Got: %',
      completed_test_runs, created_evaluations;
  END IF;

  -- Warn about evaluations without battles
  IF evaluations_without_battles > 0 THEN
    RAISE WARNING '% evaluations have no battle_results', evaluations_without_battles;
  END IF;

  RAISE NOTICE 'Migration completed successfully';
END $$;


-- Create helper view to validate evaluations
CREATE OR REPLACE VIEW evaluation_validation AS
SELECT
  e.id as evaluation_id,
  e.test_run_id,
  tr.test_run_code,
  e.is_promoted,
  e.status,
  e.overall_score,
  e.success_count,
  e.failure_count,
  e.partial_count,
  e.triggered_by,

  -- Verify aggregates against actual battle_results
  COUNT(br.id) as actual_battle_count,
  ROUND(AVG(br.score)::numeric, 2) as actual_avg_score,
  COUNT(*) FILTER (WHERE br.outcome = 'success') as actual_success,
  COUNT(*) FILTER (WHERE br.outcome IN ('timeout', 'error', 'failure')) as actual_failure,
  COUNT(*) FILTER (WHERE br.outcome = 'partial') as actual_partial,

  -- Check for mismatches
  CASE
    WHEN e.overall_score != COALESCE(ROUND(AVG(br.score)::numeric, 2), 0) THEN 'SCORE_MISMATCH'
    WHEN e.success_count != COUNT(*) FILTER (WHERE br.outcome = 'success') THEN 'SUCCESS_COUNT_MISMATCH'
    WHEN e.failure_count != COUNT(*) FILTER (WHERE br.outcome IN ('timeout', 'error', 'failure')) THEN 'FAILURE_COUNT_MISMATCH'
    ELSE 'OK'
  END as validation_status

FROM evaluations e
JOIN test_runs tr ON tr.id = e.test_run_id
LEFT JOIN battle_results br ON br.test_run_id = e.test_run_id
WHERE e.triggered_by = 'migration'
GROUP BY e.id, tr.id, tr.test_run_code, e.is_promoted, e.status,
         e.overall_score, e.success_count, e.failure_count, e.partial_count, e.triggered_by;

COMMENT ON VIEW evaluation_validation IS 'Helper view to validate migrated evaluations against battle_results';
