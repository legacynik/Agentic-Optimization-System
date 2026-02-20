-- Migration 012: P0 Pipeline Foundations
-- Purpose: Schema changes for T1 (hybrid webhook), T2 (criteria taxonomy),
--          T3 (LLM model rotation), T4 (criteria snapshot)
-- Created: 2026-02-19
-- Source: _project_specs/specs/pipeline-p0-foundations.md

-- =============================================================================
-- T2: Criteria Definitions Catalog Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS criteria_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  scoring_guide TEXT,
  category VARCHAR(20) NOT NULL CHECK (category IN ('core', 'domain')),
  domain_type VARCHAR(50), -- e.g. 'outbound_sales', 'outbound_cold', NULL for core
  weight_default NUMERIC(4,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by category/domain
CREATE INDEX IF NOT EXISTS idx_criteria_definitions_category
  ON criteria_definitions(category, domain_type);

-- Seed: 6 core criteria (universal across all prompt types)
INSERT INTO criteria_definitions (name, description, scoring_guide, category, domain_type, weight_default) VALUES
  ('brevita_risposte', 'Le risposte dell''agente sono concise e mirate, senza divagazioni inutili?', 'Valuta se le risposte sono brevi e dirette. Penalizza risposte verbose o ridondanti. Un agente medio ottiene 6-7.', 'core', NULL, 1.0),
  ('una_domanda_per_turno', 'L''agente fa UNA sola domanda per turno, senza accumulare più domande?', 'CRITICO: Penalizza fortemente se fa 2+ domande nello stesso turno. Verifica ogni turno dell''agente.', 'core', NULL, 1.0),
  ('mantenimento_flusso', 'L''agente mantiene il flusso naturale della conversazione, adattandosi alle risposte?', 'Valuta se l''agente segue il filo logico delle risposte del cliente o segue uno script rigido.', 'core', NULL, 1.0),
  ('tono_naturale', 'La lingua suona come un vero consulente italiano o come un robot?', 'Valuta naturalezza, evita anglicismi. Un agente medio ottiene 6-7.', 'core', NULL, 1.0),
  ('gestione_chiusura', 'La fase di chiusura è gestita in modo chiaro e professionale?', 'Valuta chiarezza nella chiusura, gestione dettagli pratici, conferma azioni successive.', 'core', NULL, 1.0),
  ('adattamento_persona', 'L''agente ha adattato il suo stile al comportamento del cliente?', 'CRITICO: Verifica se l''agente raggiunge l''obiettivo specifico della persona. Penalizza se total_turns > 35.', 'core', NULL, 1.0)
ON CONFLICT (name) DO NOTHING;

-- Seed: 5 domain criteria for outbound_sales
INSERT INTO criteria_definitions (name, description, scoring_guide, category, domain_type, weight_default) VALUES
  ('apertura_cornice', 'L''inizio è stato professionale e ha impostato correttamente la chiamata?', 'Verifica se l''apertura è chiara, professionale e imposta correttamente il contesto della chiamata.', 'domain', 'outbound_sales', 1.0),
  ('discovery_socratica', 'L''agente ha scavato a fondo nel problema con domande intelligenti e quantificate?', 'Valuta la qualità e profondità delle domande. L''agente deve dimostrare genuina curiosità verso i problemi del cliente.', 'domain', 'outbound_sales', 1.5),
  ('pitch_proposta', 'La proposta è stata presentata come la soluzione logica ai problemi emersi?', 'Valuta se il pitch è collegato ai problemi emersi e presentato come soluzione naturale. Include recap strategico.', 'domain', 'outbound_sales', 1.0),
  ('gestione_obiezioni', 'Le obiezioni sono state gestite con strategie efficaci o ignorate?', 'Verifica tecniche di gestione: riconoscimento, empatia, risposta efficace. Penalizza risposte dismissive.', 'domain', 'outbound_sales', 1.5),
  ('chiusura_appuntamento', 'La prenotazione dell''appuntamento è stata gestita in modo chiaro?', 'Valuta chiarezza nella chiusura, conferma appuntamento, gestione dettagli pratici.', 'domain', 'outbound_sales', 1.0)
ON CONFLICT (name) DO NOTHING;

-- Seed: 4 domain criteria for outbound_cold
INSERT INTO criteria_definitions (name, description, scoring_guide, category, domain_type, weight_default) VALUES
  ('hook_iniziale', 'L''apertura cattura l''attenzione in meno di 10 secondi?', 'Valuta se il primo messaggio è incisivo e crea curiosità. Penalizza aperture generiche o troppo lunghe.', 'domain', 'outbound_cold', 1.0),
  ('qualificazione_rapida', 'L''agente qualifica rapidamente se il lead è in target?', 'Verifica se l''agente identifica velocemente se il prospect ha il profilo giusto. Max 3-4 domande di qualifica.', 'domain', 'outbound_cold', 1.5),
  ('creazione_urgenza', 'L''agente crea un senso di urgenza legittimo?', 'Valuta se l''urgenza è collegata a dati reali del prospect, non a tattiche manipolative generiche.', 'domain', 'outbound_cold', 1.0),
  ('gestione_gatekeeper', 'L''agente gestisce efficacemente il gatekeeper per raggiungere il decisore?', 'Valuta strategie per superare segretarie/assistenti: professionalità, credibilità, persistenza educata.', 'domain', 'outbound_cold', 1.0)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- T2: Migrate existing evaluator_configs.criteria to new format
-- =============================================================================
-- Legacy format: flat array [{name, weight, description, scoring_guide}, ...]
-- New format: { core: string[], domain: string[], weights: Record<string, number> }
--
-- Mapping for legacy sales-evaluator v1.0 (9 criteria → 6 core + 5 domain):
--   italiano_autentico → tono_naturale (core)
--   apertura_cornice → apertura_cornice (domain)
--   discovery_socratica → discovery_socratica (domain)
--   ascolto_attivo → mantenimento_flusso (core)
--   recap_strategico → pitch_proposta (domain, merged)
--   pitch_audit → pitch_proposta (domain, merged)
--   gestione_obiezioni → gestione_obiezioni (domain)
--   chiusura_prenotazione → chiusura_appuntamento (domain)
--   adattamento_persona → adattamento_persona (core)

UPDATE evaluator_configs
SET criteria = jsonb_build_object(
  'core', jsonb_build_array(
    'brevita_risposte',
    'una_domanda_per_turno',
    'mantenimento_flusso',
    'tono_naturale',
    'gestione_chiusura',
    'adattamento_persona'
  ),
  'domain', jsonb_build_array(
    'apertura_cornice',
    'discovery_socratica',
    'pitch_proposta',
    'gestione_obiezioni',
    'chiusura_appuntamento'
  ),
  'weights', jsonb_build_object(
    'discovery_socratica', 1.5,
    'gestione_obiezioni', 1.5
  )
),
updated_at = now()
WHERE name = 'sales-evaluator' AND version = '1.0';

-- =============================================================================
-- T3: LLM Config on evaluator_configs
-- =============================================================================

ALTER TABLE evaluator_configs
  ADD COLUMN IF NOT EXISTS llm_config JSONB DEFAULT '{
    "judge": {
      "model": "gemini-2.5-flash",
      "provider": "google",
      "fallback": "gemini-2.0-flash"
    },
    "analyzer": {
      "model": "gemini-2.5-flash",
      "provider": "google",
      "fallback": "gemini-2.0-flash"
    }
  }'::jsonb;

-- T3: Record which model was actually used per evaluation
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS model_used VARCHAR(100);

-- =============================================================================
-- T4: Criteria + LLM Config Snapshots on evaluations
-- =============================================================================

ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS criteria_snapshot JSONB;

ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS llm_config_snapshot JSONB;

-- =============================================================================
-- Backfill: Snapshot current criteria/llm_config for existing evaluations
-- =============================================================================

UPDATE evaluations e
SET
  criteria_snapshot = ec.criteria,
  llm_config_snapshot = ec.llm_config
FROM evaluator_configs ec
WHERE e.evaluator_config_id = ec.id
  AND e.criteria_snapshot IS NULL;

-- =============================================================================
-- VERIFY
-- =============================================================================

DO $$
DECLARE
  cd_count INT;
  new_format_ok BOOLEAN;
  llm_col_exists BOOLEAN;
  snapshot_col_exists BOOLEAN;
BEGIN
  -- Check criteria_definitions seeded
  SELECT COUNT(*) INTO cd_count FROM criteria_definitions;
  IF cd_count < 15 THEN
    RAISE WARNING 'Expected >= 15 criteria_definitions, got %', cd_count;
  END IF;

  -- Check legacy config migrated to new format
  SELECT (criteria ? 'core' AND criteria ? 'domain' AND criteria ? 'weights')
  INTO new_format_ok
  FROM evaluator_configs
  WHERE name = 'sales-evaluator' AND version = '1.0';

  IF NOT new_format_ok THEN
    RAISE EXCEPTION 'Legacy evaluator config not migrated to new criteria format';
  END IF;

  -- Check llm_config column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluator_configs' AND column_name = 'llm_config'
  ) INTO llm_col_exists;

  IF NOT llm_col_exists THEN
    RAISE EXCEPTION 'llm_config column not added to evaluator_configs';
  END IF;

  -- Check snapshot columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluations' AND column_name = 'criteria_snapshot'
  ) INTO snapshot_col_exists;

  IF NOT snapshot_col_exists THEN
    RAISE EXCEPTION 'criteria_snapshot column not added to evaluations';
  END IF;

  RAISE NOTICE 'Migration 012 completed: P0 pipeline foundations schema ready';
  RAISE NOTICE '  - criteria_definitions: % rows', cd_count;
  RAISE NOTICE '  - evaluator_configs.criteria: migrated to core/domain/weights format';
  RAISE NOTICE '  - evaluator_configs.llm_config: added with Gemini defaults';
  RAISE NOTICE '  - evaluations: model_used, criteria_snapshot, llm_config_snapshot added';
END $$;
