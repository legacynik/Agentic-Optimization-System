-- PRD v2.4 Lean Schema Migration
-- Creates tables and columns needed for n8n integration
-- Applied: 2026-01-19

-- =============================================================================
-- 1. WORKFLOW_CONFIGS TABLE (Settings for n8n workflows)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type VARCHAR(50) UNIQUE NOT NULL,
  webhook_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  total_executions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default workflow configs
INSERT INTO workflow_configs (workflow_type, webhook_url, config) VALUES
('test_runner', 'https://primary-production-1d87.up.railway.app/webhook/5877058c-19fd-4f26-add4-66b3526c4a96',
 '{"max_turns": 35, "timeout_seconds": 300, "auto_trigger_evaluator": true}'),
('evaluator', '', '{"auto_trigger": true}'),
('personas_generator', '', '{"default_count": 5}'),
('analyzer', '', '{"iteration_delay_seconds": 60}'),
('optimizer', '', '{"require_human_approval": true}'),
('personas_validator', '', '{"auto_retest_on_fail": true, "max_improvement_attempts": 3}')
ON CONFLICT (workflow_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_workflow_configs_type ON workflow_configs(workflow_type);
ALTER TABLE workflow_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for workflow_configs" ON workflow_configs;
CREATE POLICY "Allow all for workflow_configs" ON workflow_configs FOR ALL USING (true);

-- =============================================================================
-- 2. PROMPT_PERSONAS TABLE (Junction table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_personas (
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  prompt_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (persona_id, prompt_name)
);

CREATE INDEX IF NOT EXISTS idx_prompt_personas_prompt_name ON prompt_personas(prompt_name);
CREATE INDEX IF NOT EXISTS idx_prompt_personas_persona_id ON prompt_personas(persona_id);
ALTER TABLE prompt_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for prompt_personas" ON prompt_personas;
CREATE POLICY "Allow all for prompt_personas" ON prompt_personas FOR ALL USING (true);

-- Function to validate prompt_name
CREATE OR REPLACE FUNCTION validate_prompt_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM prompt_versions WHERE prompt_name = NEW.prompt_name) THEN
    RAISE EXCEPTION 'prompt_name does not exist in prompt_versions: %', NEW.prompt_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_prompt_name ON prompt_personas;
CREATE TRIGGER trg_validate_prompt_name
  BEFORE INSERT OR UPDATE ON prompt_personas
  FOR EACH ROW
  EXECUTE FUNCTION validate_prompt_name();

-- =============================================================================
-- 3. BATTLE_NOTES TABLE (Human notes on conversations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS battle_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_result_id UUID NOT NULL REFERENCES battle_results(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('issue', 'suggestion', 'positive', 'question')),
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_notes_result ON battle_notes(battle_result_id);
CREATE INDEX IF NOT EXISTS idx_battle_notes_category ON battle_notes(category);
ALTER TABLE battle_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for battle_notes" ON battle_notes;
CREATE POLICY "Allow all for battle_notes" ON battle_notes FOR ALL USING (true);

-- =============================================================================
-- 4. TEST_RUNS TABLE UPDATES
-- =============================================================================

ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS mode VARCHAR(30) DEFAULT 'single';
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS max_iterations INTEGER DEFAULT 1;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS current_iteration INTEGER DEFAULT 1;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS stopped_reason VARCHAR(50);
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS tool_scenario_id VARCHAR(50);
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS awaiting_review BOOLEAN DEFAULT false;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS llm_config JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_test_runs_heartbeat ON test_runs(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_test_runs_awaiting_review ON test_runs(awaiting_review);

-- =============================================================================
-- 5. BATTLE_RESULTS TABLE UPDATES
-- =============================================================================

ALTER TABLE battle_results ADD COLUMN IF NOT EXISTS tool_session_state JSONB DEFAULT '{}';

-- =============================================================================
-- 6. PERSONAS TABLE UPDATES
-- =============================================================================

ALTER TABLE personas ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS feedback_notes JSONB DEFAULT '[]';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS validation_prompt_id UUID;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS personaid TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS personaprompt TEXT;

CREATE INDEX IF NOT EXISTS idx_personas_validation_status ON personas(validation_status);

-- =============================================================================
-- 7. UTILITY FUNCTIONS
-- =============================================================================

-- Function to update workflow_configs.updated_at
CREATE OR REPLACE FUNCTION update_workflow_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_configs_updated ON workflow_configs;
CREATE TRIGGER trg_workflow_configs_updated
  BEFORE UPDATE ON workflow_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_configs_timestamp();

-- Function to update test_runs heartbeat
CREATE OR REPLACE FUNCTION update_test_run_heartbeat(p_test_run_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE test_runs SET last_heartbeat_at = NOW() WHERE id = p_test_run_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE workflow_configs IS 'Configuration for n8n workflow webhooks and settings';
COMMENT ON TABLE prompt_personas IS 'Junction table linking personas to prompts (many-to-many)';
COMMENT ON TABLE battle_notes IS 'Human notes on battle results for analysis feedback';
COMMENT ON COLUMN test_runs.mode IS 'Test mode: single (one run) or full_cycle_with_review';
COMMENT ON COLUMN test_runs.tool_scenario_id IS 'Tool mock scenario ID (hardcoded scenarios)';
COMMENT ON COLUMN test_runs.last_heartbeat_at IS 'Last activity timestamp for stale run detection';
COMMENT ON COLUMN personas.validation_status IS 'Persona validation state: pending or validated';
