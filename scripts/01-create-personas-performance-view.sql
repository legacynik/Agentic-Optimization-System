-- Create the personas_performance view with all required columns
-- This view aggregates test data for the AI agent dashboard

-- First, let's create sample tables if they don't exist
-- You can modify these based on your actual schema

CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  testrunid TEXT NOT NULL,
  agentversion TEXT,
  promptversionid TEXT,
  test_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personaid TEXT NOT NULL UNIQUE,
  persona_description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversationid TEXT NOT NULL UNIQUE,
  testrunid TEXT NOT NULL,
  personaid TEXT NOT NULL,
  transcript TEXT,
  outcome TEXT CHECK (outcome IN ('success', 'partial', 'failure')),
  score NUMERIC(3,1) CHECK (score >= 0 AND score <= 10),
  summary TEXT,
  human_notes TEXT,
  turns INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversationid TEXT NOT NULL,
  criteria_name TEXT NOT NULL,
  score NUMERIC(3,1) CHECK (score >= 0 AND score <= 10),
  FOREIGN KEY (conversationid) REFERENCES conversations(conversationid)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_testrunid ON conversations(testrunid);
CREATE INDEX IF NOT EXISTS idx_conversations_personaid ON conversations(personaid);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_conversationid ON evaluation_criteria(conversationid);

-- Create the personas_performance view
CREATE OR REPLACE VIEW personas_performance AS
SELECT 
  c.conversationid,
  c.personaid,
  p.persona_description,
  c.testrunid,
  tr.promptversionid,
  tr.agentversion,
  c.score as avg_score,
  c.turns as avg_turns,
  tr.test_date,
  -- Aggregate evaluation criteria as JSONB array
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'criteria_name', ec.criteria_name,
          'score', ec.score
        )
      )
      FROM evaluation_criteria ec
      WHERE ec.conversationid = c.conversationid
    ),
    '[]'::jsonb
  ) as evaluation_criteria,
  -- Build conversations_summary as JSONB object
  jsonb_build_object(
    'conversationid', c.conversationid,
    'outcome', c.outcome,
    'score', c.score,
    'summary', c.summary,
    'human_notes', c.human_notes,
    'turns', c.turns
  ) as conversations_summary,
  c.transcript
FROM conversations c
LEFT JOIN personas p ON c.personaid = p.personaid
LEFT JOIN test_runs tr ON c.testrunid = tr.testrunid;

-- Grant permissions (adjust based on your RLS policies)
GRANT SELECT ON personas_performance TO anon, authenticated;
