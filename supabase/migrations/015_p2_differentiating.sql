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
-- C2: execution_id links trigger record to n8n callback — eliminates pending+order race condition
ALTER TABLE optimization_history ADD COLUMN IF NOT EXISTS execution_id UUID;

-- T11: Latency metrics (structured transcript)
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS transcript_structured JSONB;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS avg_agent_latency_ms INTEGER;
ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS max_agent_latency_ms INTEGER;
ALTER TABLE battle_evaluations ADD COLUMN IF NOT EXISTS latency_context JSONB;

-- T12: Quote verification
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS insights_verification JSONB;

-- DOWN (rollback):
-- ALTER TABLE test_runs DROP COLUMN IF EXISTS insights_verification;
-- ALTER TABLE battle_evaluations DROP COLUMN IF EXISTS latency_context;
-- ALTER TABLE battle_results DROP COLUMN IF EXISTS max_agent_latency_ms;
-- ALTER TABLE battle_results DROP COLUMN IF EXISTS avg_agent_latency_ms;
-- ALTER TABLE battle_results DROP COLUMN IF EXISTS transcript_structured;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS execution_id;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS regression_detected;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS completed_at;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS new_prompt_version_id;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS prompt_version_id;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS test_run_id;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS result;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS status;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS human_feedback;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS selected_suggestions;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS optimization_round;
-- ALTER TABLE optimization_history DROP COLUMN IF EXISTS optimizer_mode;
