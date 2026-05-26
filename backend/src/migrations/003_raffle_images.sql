-- ============================================================
--  Migración: múltiples imágenes por rifa
-- ============================================================

ALTER TABLE raffles ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

UPDATE raffles
   SET image_urls = CASE
     WHEN image_url IS NULL OR image_url = '' THEN '[]'::jsonb
     ELSE jsonb_build_array(image_url)
   END
 WHERE image_urls IS NULL
    OR image_urls = '[]'::jsonb;