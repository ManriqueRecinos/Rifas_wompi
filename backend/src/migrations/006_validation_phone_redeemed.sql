-- ============================================================
--  Migración: teléfono del creador y canje del ticket ganador
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE raffle_tickets ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP;