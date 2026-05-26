-- ============================================================
--  Migración: Agregar credenciales Wompi por usuario
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS wompi_app_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wompi_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wompi_validated BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
