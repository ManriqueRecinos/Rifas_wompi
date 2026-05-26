-- ============================================================
--  Migración: múltiples ganadores
-- ============================================================

ALTER TABLE raffles ADD COLUMN IF NOT EXISTS winning_ticket_ids JSONB DEFAULT '[]'::jsonb;

UPDATE raffles
   SET winning_ticket_ids = CASE
     WHEN winning_ticket_id IS NULL THEN '[]'::jsonb
     ELSE jsonb_build_array(winning_ticket_id)
   END
 WHERE winning_ticket_ids IS NULL
    OR winning_ticket_ids = '[]'::jsonb;