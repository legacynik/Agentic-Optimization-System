-- Migration 011: Update personas_performance view to read from battle_evaluations
-- Applied: 2026-02-16
--
-- The new evaluator (E3) writes scores to battle_evaluations table instead of
-- battle_results.score/evaluation_details. This view now prefers battle_evaluations
-- (promoted evaluation) and falls back to battle_results for legacy data.
-- Also changed conversationid from bigint to text (UUID compatibility).

DROP VIEW IF EXISTS personas_performance;

CREATE VIEW personas_performance AS
SELECT
  br.id::text AS conversationid,
  p.personaid AS personaid,
  COALESCE(p.description, p.name, p.personaid) AS persona_description,
  COALESCE(p.category, 'uncategorized') AS persona_category,
  tr.test_run_code AS testrunid,
  pv.id::text AS promptversionid,
  COALESCE(pv.version, '1.0') AS agentversion,
  COALESCE(tr.stopped_reason, '') AS testrun_notes,
  COALESCE(be.score, br.score, 0)::numeric AS avg_score,
  COALESCE(br.turns, 0) AS avg_turns,
  COALESCE(tr.started_at, NOW())::date::text AS test_date,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'criteria_name', key,
          'score', COALESCE((value->>'score')::numeric, 0),
          'conversation_id', br.id
        )
      )
      FROM jsonb_each(be.criteria_scores)
      WHERE value ? 'score'
    ),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'criteria_name', key,
          'score', COALESCE((value->>'score')::numeric, 0),
          'conversation_id', br.id
        )
      )
      FROM jsonb_each(COALESCE(br.evaluation_details, '{}'::jsonb))
      WHERE value ? 'score'
    ),
    '[]'::jsonb
  ) AS all_criteria_details,
  jsonb_build_array(
    jsonb_build_object(
      'conversationid', br.id,
      'outcome', COALESCE(be.outcome, br.outcome, 'unknown'),
      'score', COALESCE(be.score, br.score, 0),
      'summary', COALESCE(be.summary, br.evaluation_details->>'summary', ''),
      'human_notes', '',
      'turns', COALESCE(br.turns, 0),
      'appointment_booked', COALESCE((br.tool_session_state->>'appointment_booked')::boolean, false)
    )
  ) AS conversations_summary,
  COALESCE(br.transcript::text, '[]') AS conversations_transcripts
FROM battle_results br
JOIN test_runs tr ON br.test_run_id = tr.id
JOIN personas p ON br.persona_id = p.id
JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
LEFT JOIN LATERAL (
  SELECT be_inner.score, be_inner.criteria_scores, be_inner.outcome, be_inner.summary
  FROM battle_evaluations be_inner
  JOIN evaluations e ON be_inner.evaluation_id = e.id
  WHERE be_inner.battle_result_id = br.id
    AND e.is_promoted = true
  ORDER BY be_inner.evaluated_at DESC
  LIMIT 1
) be ON true
ORDER BY tr.started_at DESC, br.created_at DESC;

COMMENT ON VIEW personas_performance IS 'Dashboard view — prefers battle_evaluations (promoted) scores, falls back to battle_results for legacy data';

GRANT SELECT ON personas_performance TO anon, authenticated;
