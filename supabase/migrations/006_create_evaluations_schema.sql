-- E1: Schema DB + Migration
-- Creates evaluator_configs, evaluations, and battle_evaluations tables
-- Part of evaluator multi-prompt architecture spec

-- Table: evaluator_configs
-- Stores evaluation configurations with dynamic criteria per prompt version
CREATE TABLE IF NOT EXISTS evaluator_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  description TEXT,

  -- Association
  prompt_id UUID NOT NULL REFERENCES prompts(id),

  -- Configuration
  criteria JSONB NOT NULL,
  system_prompt_template TEXT NOT NULL,
  success_config JSONB DEFAULT '{"min_score": 7}'::jsonb,

  -- State
  is_promoted BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, deprecated

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(prompt_id, version)
);

CREATE INDEX IF NOT EXISTS idx_evaluator_promoted
ON evaluator_configs(prompt_id, is_promoted)
WHERE is_promoted = true;

-- Table: evaluations
-- Tracks evaluation runs against test_runs using specific evaluator configs
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  evaluator_config_id UUID NOT NULL REFERENCES evaluator_configs(id),

  -- State
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
  is_promoted BOOLEAN DEFAULT false,

  -- Aggregates (calculated after completion)
  overall_score NUMERIC(4,2),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  partial_count INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  triggered_by VARCHAR(50), -- 'auto', 'manual', 'api'

  UNIQUE(test_run_id, evaluator_config_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_promoted
ON evaluations(test_run_id, is_promoted)
WHERE is_promoted = true;

CREATE INDEX IF NOT EXISTS idx_evaluation_pending
ON evaluations(status)
WHERE status = 'pending';

-- Table: battle_evaluations
-- Individual evaluation scores for each battle result within an evaluation
CREATE TABLE IF NOT EXISTS battle_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  battle_result_id UUID NOT NULL REFERENCES battle_results(id) ON DELETE CASCADE,

  -- Scores
  score NUMERIC(4,2),
  criteria_scores JSONB,
  outcome VARCHAR(30), -- success, partial, failure, timeout, error

  -- LLM Output
  summary TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,

  -- Debug
  raw_response JSONB,

  -- Audit
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  evaluator_version VARCHAR(50),

  UNIQUE(evaluation_id, battle_result_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_eval_evaluation
ON battle_evaluations(evaluation_id);

-- CORRECTION: Fix FK if it was created with wrong reference
-- This addresses spec requirement: prompt_id should reference prompts(id), not prompt_versions(id)
ALTER TABLE evaluator_configs DROP CONSTRAINT IF EXISTS evaluator_configs_prompt_id_fkey CASCADE;
ALTER TABLE evaluator_configs ADD CONSTRAINT evaluator_configs_prompt_id_fkey
  FOREIGN KEY (prompt_id) REFERENCES prompts(id);
