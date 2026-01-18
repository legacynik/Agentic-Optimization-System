-- Insert sample data for testing the dashboard
-- You can delete this file once you have real data

-- Insert sample test runs
INSERT INTO test_runs (testrunid, agentversion, promptversionid, test_date) VALUES
  ('run-001', 'v1.2.0', 'prompt-v3', '2025-01-15 10:00:00'),
  ('run-002', 'v1.2.0', 'prompt-v4', '2025-01-16 14:30:00'),
  ('run-003', 'v1.3.0', 'prompt-v4', '2025-01-17 09:15:00')
ON CONFLICT DO NOTHING;

-- Insert sample personas
INSERT INTO personas (personaid, persona_description) VALUES
  ('persona-001', 'Technical user seeking detailed API documentation'),
  ('persona-002', 'Non-technical user needing simple step-by-step guidance'),
  ('persona-003', 'Frustrated user with a billing issue'),
  ('persona-004', 'Developer looking for code examples')
ON CONFLICT DO NOTHING;

-- Insert sample conversations
INSERT INTO conversations (conversationid, testrunid, personaid, transcript, outcome, score, summary, human_notes, turns) VALUES
  ('conv-001', 'run-001', 'persona-001', 'Agent: How can I help you today?\n\nPersona: I need API documentation.\n\nAgent: Here is the API documentation link...', 'success', 9.2, 'User successfully found API docs', 'Good response time', 3),
  ('conv-002', 'run-001', 'persona-002', 'Agent: Hello! What can I assist with?\n\nPersona: How do I reset my password?\n\nAgent: Let me guide you through the steps...', 'success', 8.5, 'Clear password reset instructions provided', NULL, 4),
  ('conv-003', 'run-001', 'persona-003', 'Agent: Hi there!\n\nPersona: My billing is wrong!\n\nAgent: I understand your concern...', 'partial', 6.8, 'Issue acknowledged but not fully resolved', 'Needs escalation path', 5),
  ('conv-004', 'run-002', 'persona-001', 'Agent: Welcome! How may I help?\n\nPersona: Show me code examples.\n\nAgent: Here are some examples...', 'success', 9.5, 'Excellent code examples provided', 'Very helpful', 2),
  ('conv-005', 'run-002', 'persona-004', 'Agent: Hello!\n\nPersona: I need React examples.\n\nAgent: Here is a React component...', 'success', 9.0, 'Good React examples', NULL, 3),
  ('conv-006', 'run-003', 'persona-002', 'Agent: Hi!\n\nPersona: Help me get started.\n\nAgent: Let me help you...', 'failure', 4.2, 'Instructions were too complex', 'Needs simplification', 6)
ON CONFLICT DO NOTHING;

-- Insert sample evaluation criteria
INSERT INTO evaluation_criteria (conversationid, criteria_name, score) VALUES
  ('conv-001', 'Accuracy', 9.5),
  ('conv-001', 'Helpfulness', 9.0),
  ('conv-001', 'Clarity', 9.0),
  ('conv-002', 'Accuracy', 8.5),
  ('conv-002', 'Helpfulness', 8.5),
  ('conv-002', 'Clarity', 8.5),
  ('conv-003', 'Accuracy', 7.0),
  ('conv-003', 'Helpfulness', 6.5),
  ('conv-003', 'Clarity', 7.0),
  ('conv-004', 'Accuracy', 9.5),
  ('conv-004', 'Helpfulness', 9.5),
  ('conv-004', 'Clarity', 9.5),
  ('conv-005', 'Accuracy', 9.0),
  ('conv-005', 'Helpfulness', 9.0),
  ('conv-005', 'Clarity', 9.0),
  ('conv-006', 'Accuracy', 5.0),
  ('conv-006', 'Helpfulness', 4.0),
  ('conv-006', 'Clarity', 3.5);
