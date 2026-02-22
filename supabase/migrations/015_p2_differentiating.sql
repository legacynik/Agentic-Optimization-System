-- P2: Differentiating Features

-- T10: Optimizer dual mode — create optimization_history table
CREATE TABLE IF NOT EXISTS optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES test_runs(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  new_prompt_version_id UUID REFERENCES prompt_versions(id),
  selected_suggestions JSONB DEFAULT '[]'::jsonb,
  human_feedback TEXT,
  optimizer_mode VARCHAR(20) DEFAULT 'full',
  optimization_round INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- T11: Latency metrics (structured transcript)
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS transcript_structured JSONB;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS avg_agent_latency_ms INTEGER;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS max_agent_latency_ms INTEGER;
ALTER TABLE battle_evaluations ADD COLUMN IF NOT EXISTS latency_context JSONB;

-- T12: Quote verification
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS insights_verification JSONB;
