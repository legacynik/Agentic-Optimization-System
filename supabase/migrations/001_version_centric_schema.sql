-- Version-Centric Schema for AI Agent Testing Dashboard
-- This migration creates the new schema focused on prompt versions

-- 1. Prompt Versions table (main entity)
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_from UUID, -- Will add foreign key constraint after table creation
  optimization_notes TEXT,
  business_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft', -- draft, testing, production, archived

  -- Aggregate metrics (updated after each test run)
  avg_success_rate DECIMAL(5,2),
  avg_score DECIMAL(3,1),
  avg_turns DECIMAL(5,1),
  total_test_runs INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(prompt_name, version)
);

-- Add self-referencing foreign key after table creation
ALTER TABLE prompt_versions
ADD CONSTRAINT fk_created_from
FOREIGN KEY (created_from) REFERENCES prompt_versions(id);

-- 2. Personas table (reusable across versions)
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  psychological_profile TEXT,
  category VARCHAR(100),
  difficulty VARCHAR(50), -- easy, medium, hard, extreme
  behaviors JSONB, -- array of behavior strings

  -- Creation metadata
  created_for_prompt VARCHAR(255), -- which prompt it was originally created for
  created_by VARCHAR(50), -- 'ai', 'human', 'template'
  validated_by_human BOOLEAN DEFAULT FALSE,
  validation_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Test Runs table
CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_code VARCHAR(100) UNIQUE NOT NULL, -- e.g., "TEST-2024-001"
  prompt_version_id UUID REFERENCES prompt_versions(id) NOT NULL,

  -- Test configuration
  personas_tested UUID[], -- array of persona IDs
  test_config JSONB, -- any additional config

  -- Aggregate results
  overall_score DECIMAL(3,1),
  success_count INTEGER,
  failure_count INTEGER,
  timeout_count INTEGER,

  -- Analysis
  failure_patterns JSONB, -- array of {pattern, frequency, affected_personas}
  strengths JSONB, -- what worked well
  weaknesses JSONB, -- what needs improvement

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'running' -- running, completed, failed
);

-- 4. Battle Results table (individual conversations)
CREATE TABLE IF NOT EXISTS battle_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES test_runs(id) NOT NULL,
  persona_id UUID REFERENCES personas(id) NOT NULL,
  conversation_id INTEGER, -- legacy ID if needed

  -- Results
  outcome VARCHAR(50), -- success, partial, failure, timeout
  score DECIMAL(3,1),
  turns INTEGER,
  duration_seconds INTEGER,

  -- Detailed data
  transcript JSONB, -- full conversation
  evaluation_details JSONB, -- criteria scores

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Optimization History table
CREATE TABLE IF NOT EXISTS optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id UUID REFERENCES prompt_versions(id),
  to_version_id UUID REFERENCES prompt_versions(id),

  -- Optimization details
  optimization_type VARCHAR(50), -- 'ai_suggested', 'manual', 'a_b_test'
  changes_made JSONB, -- array of {what, why, expected_impact}
  confidence_score DECIMAL(3,2),
  risk_assessment VARCHAR(20), -- low, medium, high

  -- Results after implementation
  performance_delta JSONB, -- {score_change, success_rate_change, etc}
  was_successful BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Persona Validation table (human-in-the-loop)
CREATE TABLE IF NOT EXISTS persona_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),

  validation_status VARCHAR(50), -- pending, approved, rejected, modified
  reviewer_notes TEXT,
  modifications_made JSONB,

  validated_at TIMESTAMPTZ,
  validated_by VARCHAR(255)
);

-- Create indexes for performance
CREATE INDEX idx_prompt_versions_name ON prompt_versions(prompt_name);
CREATE INDEX idx_prompt_versions_status ON prompt_versions(status);
CREATE INDEX idx_test_runs_version ON test_runs(prompt_version_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_battle_results_test_run ON battle_results(test_run_id);
CREATE INDEX idx_battle_results_persona ON battle_results(persona_id);

-- Create views for analytics
CREATE OR REPLACE VIEW version_performance_summary AS
SELECT
  pv.id,
  pv.prompt_name,
  pv.version,
  pv.status,
  pv.avg_success_rate,
  pv.avg_score,
  pv.total_test_runs,
  COUNT(DISTINCT tr.id) as test_count,
  MAX(tr.completed_at) as last_tested
FROM prompt_versions pv
LEFT JOIN test_runs tr ON pv.id = tr.prompt_version_id
GROUP BY pv.id;

CREATE OR REPLACE VIEW persona_performance_by_version AS
SELECT
  pv.prompt_name,
  pv.version,
  p.name as persona_name,
  p.category as persona_category,
  AVG(br.score) as avg_score,
  COUNT(br.id) as battle_count,
  SUM(CASE WHEN br.outcome = 'success' THEN 1 ELSE 0 END)::FLOAT / COUNT(br.id) * 100 as success_rate
FROM battle_results br
JOIN test_runs tr ON br.test_run_id = tr.id
JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
JOIN personas p ON br.persona_id = p.id
GROUP BY pv.prompt_name, pv.version, p.name, p.category;

-- Function to update version metrics after test run
CREATE OR REPLACE FUNCTION update_version_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE prompt_versions
    SET
      avg_success_rate = (
        SELECT AVG(
          CASE
            WHEN success_count + failure_count > 0
            THEN success_count::FLOAT / (success_count + failure_count) * 100
            ELSE 0
          END
        )
        FROM test_runs
        WHERE prompt_version_id = NEW.prompt_version_id
        AND status = 'completed'
      ),
      avg_score = (
        SELECT AVG(overall_score)
        FROM test_runs
        WHERE prompt_version_id = NEW.prompt_version_id
        AND status = 'completed'
      ),
      total_test_runs = (
        SELECT COUNT(*)
        FROM test_runs
        WHERE prompt_version_id = NEW.prompt_version_id
        AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.prompt_version_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_version_metrics_trigger
AFTER UPDATE OF status ON test_runs
FOR EACH ROW
EXECUTE FUNCTION update_version_metrics();