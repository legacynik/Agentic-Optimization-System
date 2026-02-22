-- P2: Differentiating Features

-- T10: Optimizer dual mode — extend existing optimization_history table
-- (table already exists from migration 001 with a different schema)
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS optimizer_mode VARCHAR(20) DEFAULT 'full';
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS optimization_round INTEGER DEFAULT 1;
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS selected_suggestions JSONB;
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS human_feedback TEXT;
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS result JSONB;
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS test_run_id UUID REFERENCES test_runs(id);
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS prompt_version_id UUID REFERENCES prompt_versions(id);
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS new_prompt_version_id UUID REFERENCES prompt_versions(id);
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS regression_detected BOOLEAN DEFAULT false;

-- T11: Latency metrics (structured transcript)
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS transcript_structured JSONB;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS avg_agent_latency_ms INTEGER;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS max_agent_latency_ms INTEGER;
ALTER TABLE battle_evaluations ADD COLUMN IF NOT EXISTS latency_context JSONB;

-- T12: Quote verification
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS insights_verification JSONB;
