-- Migration: Add analysis_report columns to test_runs
-- Purpose: Store LLM analysis results from Evaluator workflow
-- Spec: agentic-refactor-v2.md Phase 2
-- Applied: 2026-01-24

-- =============================================================================
-- 1. ADD ANALYSIS COLUMNS TO TEST_RUNS
-- =============================================================================

-- JSONB column to store full LLM analysis report
-- Contains: executive_summary, insights, persona_breakdown, strengths, prompt_suggestions
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS analysis_report JSONB DEFAULT NULL;

-- Timestamp when analysis was completed
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for querying analyzed vs non-analyzed test runs
CREATE INDEX IF NOT EXISTS idx_test_runs_analyzed_at ON test_runs(analyzed_at);

-- =============================================================================
-- 2. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN test_runs.analysis_report IS 'LLM-generated analysis report with insights, suggestions, and persona breakdown';
COMMENT ON COLUMN test_runs.analyzed_at IS 'Timestamp when LLM analysis was completed';
