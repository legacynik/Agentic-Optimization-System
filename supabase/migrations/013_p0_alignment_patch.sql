-- Migration 013: P0 Alignment Patch
-- Purpose: Adds missing columns from updated spec:
--   REQ-T2.8: criteria_legacy backup column for rollback safety
--   REQ-T3.6: tokens_used for budget tracking
-- Created: 2026-02-19

-- =============================================================================
-- UP
-- =============================================================================

-- REQ-T2.8: Backup legacy criteria format before taxonomy migration
-- Preserves original flat array for rollback safety (drop after 2 weeks)
ALTER TABLE evaluator_configs
  ADD COLUMN IF NOT EXISTS criteria_legacy JSONB;

-- Backfill: copy current criteria into legacy for any configs that were migrated
-- (Only the sales-evaluator v1.0 was migrated from flat → taxonomy in 012)
-- We stored the original flat array in 007, so reconstruct from known data
UPDATE evaluator_configs
SET criteria_legacy = '[
  {"name":"italiano_autentico","weight":0.11,"description":"La lingua suona come un vero consulente italiano o come un robot che traduce dall''inglese?","scoring_guide":"Valuta naturalezza, evita anglicismi. Un agente medio ottiene 6-7."},
  {"name":"apertura_cornice","weight":0.11,"description":"L''inizio è stato professionale e ha impostato correttamente la chiamata?","scoring_guide":"Verifica se l''apertura è chiara, professionale e imposta correttamente il contesto della chiamata."},
  {"name":"discovery_socratica","weight":0.11,"description":"L''agente ha scavato a fondo nel problema con domande intelligenti e quantificate?","scoring_guide":"CRITICO: Fa UNA domanda per turno (penalizza fortemente se fa 2+ domande consecutive). Valuta la qualità e profondità delle domande."},
  {"name":"ascolto_attivo","weight":0.11,"description":"L''agente ha usato le risposte del cliente per guidare la conversazione o ha seguito uno script rigido?","scoring_guide":"Verifica se l''agente dimostra di ascoltare e adattare le sue risposte al cliente."},
  {"name":"recap_strategico","weight":0.11,"description":"C''è stato un momento in cui l''agente ha riassunto i problemi per creare urgenza prima del pitch?","scoring_guide":"Cerca un riassunto strategico che crei urgenza e prepari il terreno per la proposta."},
  {"name":"pitch_audit","weight":0.11,"description":"La proposta dell''audit è stata presentata come la soluzione logica ai problemi emersi?","scoring_guide":"Valuta se il pitch è collegato ai problemi emersi e presentato come soluzione naturale."},
  {"name":"gestione_obiezioni","weight":0.12,"description":"Le obiezioni sono state gestite con strategie efficaci o ignorate?","scoring_guide":"Verifica tecniche di gestione delle obiezioni: riconoscimento, empatia, risposta efficace."},
  {"name":"chiusura_prenotazione","weight":0.11,"description":"La fase finale è stata gestita in modo chiaro e professionale?","scoring_guide":"Valuta chiarezza nella chiusura, conferma appuntamento, gestione dettagli pratici."},
  {"name":"adattamento_persona","weight":0.11,"description":"L''agente ha adattato il suo stile al comportamento del cliente (es. fretta, scetticismo, loquacità)?","scoring_guide":"CRITICO: Verifica se l''agente raggiunge l''obiettivo specifico della persona. Penalizza se total_turns > 35."}
]'::jsonb
WHERE name = 'sales-evaluator' AND version = '1.0'
  AND criteria_legacy IS NULL;

-- REQ-T3.6: Token usage tracking for budget monitoring
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

-- =============================================================================
-- DOWN (rollback)
-- =============================================================================
-- To rollback this migration:
--   ALTER TABLE evaluator_configs DROP COLUMN IF EXISTS criteria_legacy;
--   ALTER TABLE evaluations DROP COLUMN IF EXISTS tokens_used;

-- =============================================================================
-- DOWN for migration 012 (reference only — apply manually if needed):
-- =============================================================================
-- -- Restore legacy criteria format from backup
-- UPDATE evaluator_configs SET criteria = criteria_legacy WHERE criteria_legacy IS NOT NULL;
-- -- Drop new columns
-- ALTER TABLE evaluator_configs DROP COLUMN IF EXISTS llm_config;
-- ALTER TABLE evaluator_configs DROP COLUMN IF EXISTS criteria_legacy;
-- ALTER TABLE evaluations DROP COLUMN IF EXISTS model_used;
-- ALTER TABLE evaluations DROP COLUMN IF EXISTS tokens_used;
-- ALTER TABLE evaluations DROP COLUMN IF EXISTS criteria_snapshot;
-- ALTER TABLE evaluations DROP COLUMN IF EXISTS llm_config_snapshot;
-- -- Drop criteria_definitions table
-- DROP TABLE IF EXISTS criteria_definitions;

-- =============================================================================
-- VERIFY
-- =============================================================================

DO $$
DECLARE
  legacy_exists BOOLEAN;
  tokens_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluator_configs' AND column_name = 'criteria_legacy'
  ) INTO legacy_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluations' AND column_name = 'tokens_used'
  ) INTO tokens_exists;

  IF NOT legacy_exists THEN
    RAISE EXCEPTION 'criteria_legacy column not added';
  END IF;

  IF NOT tokens_exists THEN
    RAISE EXCEPTION 'tokens_used column not added';
  END IF;

  RAISE NOTICE 'Migration 013 completed: criteria_legacy + tokens_used added';
END $$;
