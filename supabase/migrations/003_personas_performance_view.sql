-- Migration: Create personas_performance view for dashboard
-- This view joins battle_results with related tables to provide
-- the data structure expected by the dashboard components

CREATE OR REPLACE VIEW personas_performance AS
SELECT
  br.id::bigint AS conversationid,
  p.personaid AS personaid,
  COALESCE(p.description, p.name, p.personaid) AS persona_description,
  COALESCE(p.category, 'uncategorized') AS persona_category,
  tr.test_run_code AS testrunid,
  pv.id::text AS promptversionid,
  COALESCE(pv.version, '1.0') AS agentversion,
  COALESCE(tr.stopped_reason, '') AS testrun_notes,
  COALESCE(br.score, 0)::numeric AS avg_score,
  COALESCE(br.turns, 0) AS avg_turns,
  COALESCE(tr.started_at, NOW())::date::text AS test_date,
  -- Evaluation criteria from battle_results.evaluation_details
  COALESCE(
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
  -- Conversations summary as array
  jsonb_build_array(
    jsonb_build_object(
      'conversationid', br.id,
      'outcome', COALESCE(br.outcome, 'unknown'),
      'score', COALESCE(br.score, 0),
      'summary', COALESCE(br.evaluation_details->>'summary', ''),
      'human_notes', '',
      'turns', COALESCE(br.turns, 0),
      'appointment_booked', COALESCE((br.tool_session_state->>'appointment_booked')::boolean, false)
    )
  ) AS conversations_summary,
  -- Transcript as JSON string
  COALESCE(br.transcript::text, '[]') AS conversations_transcripts
FROM battle_results br
JOIN test_runs tr ON br.test_run_id = tr.id
JOIN personas p ON br.persona_id = p.id
JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
ORDER BY tr.started_at DESC, br.created_at DESC;

-- Add comment
COMMENT ON VIEW personas_performance IS 'Dashboard view joining battle results with personas, test runs, and prompt versions';

-- Grant access
GRANT SELECT ON personas_performance TO anon, authenticated;
