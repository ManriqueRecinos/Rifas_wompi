-- ============================================================
--  Migración: validación por QR y ticket ganador
-- ============================================================

ALTER TABLE raffles ADD COLUMN IF NOT EXISTS winning_ticket_id INTEGER;

ALTER TABLE raffle_tickets ADD COLUMN IF NOT EXISTS validation_code VARCHAR(255);

UPDATE raffle_tickets
   SET validation_code = COALESCE(validation_code, replace(uuid_generate_v4()::text, '-', ''))
 WHERE validation_code IS NULL OR validation_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_validation_code
ON raffle_tickets(validation_code);