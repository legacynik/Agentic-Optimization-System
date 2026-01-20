-- =============================================================================
-- SEED DATA FOR TESTING - AI Agent Dashboard
-- =============================================================================
-- Run this to populate the database with test data for UI testing
-- Execute via: Supabase Dashboard > SQL Editor > Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROMPT VERSIONS (required first - referenced by test_runs)
-- -----------------------------------------------------------------------------
INSERT INTO prompt_versions (id, prompt_name, version, content, status, business_type, optimization_notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Medical Receptionist', 'v1.0',
   'You are a friendly medical receptionist for Dr. Smith clinic...',
   'production', 'healthcare', 'Initial production version'),

  ('22222222-2222-2222-2222-222222222222', 'Medical Receptionist', 'v1.1',
   'You are a professional and empathetic medical receptionist...',
   'testing', 'healthcare', 'Added empathy guidelines'),

  ('33333333-3333-3333-3333-333333333333', 'Dental Clinic Assistant', 'v1.0',
   'You are a helpful dental clinic assistant...',
   'draft', 'dental', 'First draft for dental use case')
ON CONFLICT (id) DO UPDATE SET
  prompt_name = EXCLUDED.prompt_name,
  version = EXCLUDED.version,
  status = EXCLUDED.status;

-- -----------------------------------------------------------------------------
-- 2. PERSONAS (with UUID id for battle_results FK)
-- -----------------------------------------------------------------------------
INSERT INTO personas (id, personaid, name, description, personaprompt, category,
                      validation_status, difficulty, psychological_profile, behaviors, created_by)
VALUES
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anxious-maria', 'Maria Ansiosa',
   'Paziente ansiosa che ha paura del dentista e chiede molte rassicurazioni',
   'Sei Maria, 45 anni, molto ansiosa per le visite mediche. Fai molte domande, chiedi rassicurazioni continue...',
   'anxious', 'validated', 'hard',
   'High anxiety, needs reassurance, may cancel appointments',
   '["asks_many_questions", "needs_reassurance", "may_cancel"]'::jsonb,
   'human'),

  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'busy-paolo', 'Paolo Manager',
   'Manager impegnato che vuole risposte rapide e dirette',
   'Sei Paolo, 38 anni, manager con poco tempo. Vuoi risposte concise e veloci...',
   'busy', 'validated', 'medium',
   'Time-constrained, direct communication style',
   '["wants_quick_answers", "may_interrupt", "schedule_focused"]'::jsonb,
   'human'),

  ('cccc3333-cccc-cccc-cccc-cccccccccccc', 'elderly-giuseppe', 'Giuseppe Anziano',
   'Paziente anziano che ha difficoltà tecnologiche e preferisce chiamare',
   'Sei Giuseppe, 72 anni, non usi molto il telefono. Preferisci parlare con una persona...',
   'elderly', 'validated', 'medium',
   'Technology challenged, prefers human interaction',
   '["slow_responses", "repeats_questions", "prefers_phone_calls"]'::jsonb,
   'ai'),

  ('dddd4444-dddd-dddd-dddd-dddddddddddd', 'confused-lucia', 'Lucia Confusa',
   'Paziente confusa sui sintomi e non sa spiegare bene il problema',
   'Sei Lucia, 55 anni, hai vari sintomi ma non sai descriverli bene...',
   'confused', 'validated', 'hard',
   'Vague about symptoms, needs guidance',
   '["unclear_symptoms", "changes_topic", "needs_clarification"]'::jsonb,
   'ai'),

  ('eeee5555-eeee-eeee-eeee-eeeeeeeeeeee', 'friendly-marco', 'Marco Amichevole',
   'Paziente collaborativo e gentile, facile da gestire',
   'Sei Marco, 30 anni, gentile e collaborativo. Rispondi alle domande in modo chiaro...',
   'friendly', 'validated', 'easy',
   'Cooperative, clear communicator',
   '["cooperative", "clear_answers", "patient"]'::jsonb,
   'human'),

  ('ffff6666-ffff-ffff-ffff-ffffffffffff', 'urgent-anna', 'Anna Urgente',
   'Paziente con urgenza medica che ha bisogno di un appuntamento immediato',
   'Sei Anna, 28 anni, hai un dolore forte e hai bisogno di un appuntamento urgente oggi...',
   'urgent', 'pending', 'hard',
   'Medical urgency, needs immediate attention',
   '["urgent_need", "pain_description", "demands_immediate"]'::jsonb,
   'ai')
ON CONFLICT (personaid) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  validation_status = EXCLUDED.validation_status;

-- -----------------------------------------------------------------------------
-- 3. PROMPT_PERSONAS (junction table - link personas to prompts)
-- -----------------------------------------------------------------------------
INSERT INTO prompt_personas (persona_id, prompt_name, is_active, priority)
VALUES
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Medical Receptionist', true, 1),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Medical Receptionist', true, 2),
  ('cccc3333-cccc-cccc-cccc-cccccccccccc', 'Medical Receptionist', true, 3),
  ('dddd4444-dddd-dddd-dddd-dddddddddddd', 'Medical Receptionist', true, 4),
  ('eeee5555-eeee-eeee-eeee-eeeeeeeeeeee', 'Medical Receptionist', true, 5),
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dental Clinic Assistant', true, 1),
  ('eeee5555-eeee-eeee-eeee-eeeeeeeeeeee', 'Dental Clinic Assistant', true, 2)
ON CONFLICT (persona_id, prompt_name) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- 4. TEST RUNS (with various statuses)
-- -----------------------------------------------------------------------------
INSERT INTO test_runs (id, test_run_code, prompt_version_id, mode, status,
                       tool_scenario_id, current_iteration, max_iterations,
                       success_count, failure_count, timeout_count, overall_score,
                       started_at, completed_at, stopped_reason)
VALUES
  -- Completed successful run
  ('11110000-0000-0000-0000-000000000001', 'RUN-20260115-001',
   '11111111-1111-1111-1111-111111111111', 'full_cycle_with_review', 'completed',
   'happy_path', 1, 1, 4, 1, 0, 8.2,
   '2026-01-15 10:00:00+00', '2026-01-15 10:45:00+00', NULL),

  -- Completed with mixed results
  ('11110000-0000-0000-0000-000000000002', 'RUN-20260117-002',
   '22222222-2222-2222-2222-222222222222', 'single', 'completed',
   'calendar_full', 1, 1, 2, 2, 1, 6.5,
   '2026-01-17 14:30:00+00', '2026-01-17 15:00:00+00', NULL),

  -- Currently running
  ('11110000-0000-0000-0000-000000000003', 'RUN-20260120-003',
   '11111111-1111-1111-1111-111111111111', 'full_cycle_with_review', 'running',
   'happy_path', 1, 3, 1, 0, 0, NULL,
   '2026-01-20 09:00:00+00', NULL, NULL),

  -- Aborted run
  ('11110000-0000-0000-0000-000000000004', 'RUN-20260118-004',
   '22222222-2222-2222-2222-222222222222', 'single', 'aborted',
   'booking_fails', 1, 1, 0, 1, 0, 3.0,
   '2026-01-18 11:00:00+00', '2026-01-18 11:15:00+00', 'human_stop')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  overall_score = EXCLUDED.overall_score;

-- -----------------------------------------------------------------------------
-- 5. BATTLE RESULTS (the core data for personas_performance VIEW)
-- -----------------------------------------------------------------------------
INSERT INTO battle_results (id, test_run_id, persona_id, conversation_id,
                            outcome, score, turns, duration_seconds,
                            transcript, evaluation_details, tool_session_state)
VALUES
  -- Run 1: Completed - 5 battles
  ('ba110001-0000-0000-0000-000000000001',
   '11110000-0000-0000-0000-000000000001',
   'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   1001, 'success', 8.5, 12, 180,
   '[{"role":"user","content":"Buongiorno, vorrei prenotare..."},{"role":"assistant","content":"Buongiorno! Certamente..."}]'::jsonb,
   '{"summary":"Conversazione gestita con empatia","empathy":{"score":9},"task_completion":{"score":8},"clarity":{"score":8}}'::jsonb,
   '{"appointment_booked":true,"date":"2026-01-22","time":"10:00"}'::jsonb),

  ('ba110001-0000-0000-0000-000000000002',
   '11110000-0000-0000-0000-000000000001',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   1002, 'success', 9.0, 6, 90,
   '[{"role":"user","content":"Ho bisogno di un appuntamento veloce"},{"role":"assistant","content":"Certo, ho disponibilità..."}]'::jsonb,
   '{"summary":"Risposta rapida e efficiente","efficiency":{"score":10},"task_completion":{"score":9},"clarity":{"score":8}}'::jsonb,
   '{"appointment_booked":true,"date":"2026-01-21","time":"14:30"}'::jsonb),

  ('ba110001-0000-0000-0000-000000000003',
   '11110000-0000-0000-0000-000000000001',
   'cccc3333-cccc-cccc-cccc-cccccccccccc',
   1003, 'success', 7.5, 18, 300,
   '[{"role":"user","content":"Ehm... come si fa a prenotare?"},{"role":"assistant","content":"Buongiorno! La aiuto io..."}]'::jsonb,
   '{"summary":"Pazienza con utente anziano","patience":{"score":9},"clarity":{"score":7},"task_completion":{"score":7}}'::jsonb,
   '{"appointment_booked":true,"date":"2026-01-23","time":"09:00"}'::jsonb),

  ('ba110001-0000-0000-0000-000000000004',
   '11110000-0000-0000-0000-000000000001',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   1004, 'partial', 6.5, 22, 360,
   '[{"role":"user","content":"Ho un problema... non so bene..."},{"role":"assistant","content":"Mi può descrivere..."}]'::jsonb,
   '{"summary":"Difficoltà a capire i sintomi","empathy":{"score":8},"clarity":{"score":5},"task_completion":{"score":6}}'::jsonb,
   '{"appointment_booked":true,"date":"2026-01-24","time":"11:00"}'::jsonb),

  ('ba110001-0000-0000-0000-000000000005',
   '11110000-0000-0000-0000-000000000001',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   1005, 'failure', 4.0, 8, 120,
   '[{"role":"user","content":"Ciao! Vorrei un controllo"},{"role":"assistant","content":"Errore di sistema..."}]'::jsonb,
   '{"summary":"Sistema crashato durante la conversazione","error":{"score":2},"task_completion":{"score":3}}'::jsonb,
   '{"appointment_booked":false,"error":"timeout"}'::jsonb),

  -- Run 2: Mixed results - 5 battles
  ('ba110002-0000-0000-0000-000000000001',
   '11110000-0000-0000-0000-000000000002',
   'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   2001, 'partial', 6.0, 15, 240,
   '[{"role":"user","content":"Ho molta ansia..."},{"role":"assistant","content":"Capisco la sua preoccupazione..."}]'::jsonb,
   '{"summary":"Calendario pieno, proposta alternativa","empathy":{"score":8},"task_completion":{"score":5},"alternatives":{"score":5}}'::jsonb,
   '{"appointment_booked":false,"reason":"calendar_full"}'::jsonb),

  ('ba110002-0000-0000-0000-000000000002',
   '11110000-0000-0000-0000-000000000002',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   2002, 'success', 8.0, 8, 100,
   '[{"role":"user","content":"Serve appuntamento urgente"},{"role":"assistant","content":"Verifico le urgenze..."}]'::jsonb,
   '{"summary":"Trovato slot urgenza","urgency_handling":{"score":9},"task_completion":{"score":8}}'::jsonb,
   '{"appointment_booked":true,"date":"2026-01-17","time":"16:00","urgent":true}'::jsonb),

  ('ba110002-0000-0000-0000-000000000003',
   '11110000-0000-0000-0000-000000000002',
   'cccc3333-cccc-cccc-cccc-cccccccccccc',
   2003, 'failure', 4.5, 25, 420,
   '[{"role":"user","content":"Non capisco..."},{"role":"assistant","content":"..."}]'::jsonb,
   '{"summary":"Paziente confuso, conversazione troppo lunga","patience":{"score":5},"clarity":{"score":4}}'::jsonb,
   '{"appointment_booked":false,"reason":"user_abandoned"}'::jsonb),

  ('ba110002-0000-0000-0000-000000000004',
   '11110000-0000-0000-0000-000000000002',
   'dddd4444-dddd-dddd-dddd-dddddddddddd',
   2004, 'timeout', 3.0, 30, 600,
   '[{"role":"user","content":"..."}]'::jsonb,
   '{"summary":"Timeout raggiunto","timeout":{"score":1}}'::jsonb,
   '{"appointment_booked":false,"reason":"timeout"}'::jsonb),

  ('ba110002-0000-0000-0000-000000000005',
   '11110000-0000-0000-0000-000000000002',
   'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
   2005, 'success', 9.5, 5, 60,
   '[{"role":"user","content":"Vorrei prenotare per settimana prossima"},{"role":"assistant","content":"Perfetto! Ho questi slot..."}]'::jsonb,
   '{"summary":"Prenotazione rapida e efficiente","efficiency":{"score":10},"task_completion":{"score":10},"friendliness":{"score":9}}'::jsonb,
   '{"appointment_booked":true,"date":"2026-01-25","time":"15:00"}'::jsonb),

  -- Run 3: Currently running - 1 completed battle
  ('ba110003-0000-0000-0000-000000000001',
   '11110000-0000-0000-0000-000000000003',
   'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   3001, 'success', 8.0, 10, 150,
   '[{"role":"user","content":"Buongiorno..."}]'::jsonb,
   '{"summary":"Prima battaglia completata","empathy":{"score":8},"task_completion":{"score":8}}'::jsonb,
   '{"appointment_booked":true}'::jsonb),

  -- Run 4: Aborted - 1 failed battle
  ('ba110004-0000-0000-0000-000000000001',
   '11110000-0000-0000-0000-000000000004',
   'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   4001, 'failure', 3.0, 4, 60,
   '[{"role":"user","content":"Urgente!"},{"role":"assistant","content":"Errore..."}]'::jsonb,
   '{"summary":"Test abortato per errore sistema","error":{"score":2}}'::jsonb,
   '{"appointment_booked":false,"error":"system_error"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  score = EXCLUDED.score,
  outcome = EXCLUDED.outcome;

-- -----------------------------------------------------------------------------
-- 6. WORKFLOW CONFIGS (ensure test_runner webhook is set)
-- -----------------------------------------------------------------------------
INSERT INTO workflow_configs (workflow_type, webhook_url, is_active, config)
VALUES
  ('test_runner', 'https://primary-production-1d87.up.railway.app/webhook/5877058c-19fd-4f26-add4-66b3526c4a96', true, '{}'),
  ('persona_generator', 'https://primary-production-1d87.up.railway.app/webhook/persona-gen', true, '{}'),
  ('prompt_optimizer', 'https://primary-production-1d87.up.railway.app/webhook/optimizer', false, '{}')
ON CONFLICT (workflow_type) DO UPDATE SET
  webhook_url = EXCLUDED.webhook_url,
  is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- VERIFY: Check the personas_performance VIEW now has data
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) as total_rows FROM personas_performance;
-- Expected: 12 rows (from battle_results)
