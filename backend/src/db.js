const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || process.env.PGHOST,
      port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
      database: process.env.DB_NAME || process.env.PGDATABASE,
      user: process.env.DB_USER || process.env.PGUSER,
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false },
    };

const missingFields = ['host', 'port', 'database', 'user', 'password'].filter((field) => !poolConfig[field]);

if (!connectionString && missingFields.length > 0) {
  throw new Error(
    `Faltan variables de entorno para la base de datos: ${missingFields.join(', ')}. ` +
    'Configura DATABASE_URL o DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD en backend/.env.'
  );
}

const pool = new Pool({
  ...poolConfig,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function ensureRaffleImageColumns() {
  try {
    await pool.query(`
      ALTER TABLE raffles
      ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb
    `);

    await pool.query(`
      UPDATE raffles
         SET image_urls = CASE
           WHEN image_url IS NULL OR image_url = '' THEN '[]'::jsonb
           ELSE jsonb_build_array(image_url)
         END
       WHERE image_urls IS NULL
          OR image_urls = '[]'::jsonb
    `);
  } catch (err) {
    console.error('No se pudo preparar la columna image_urls en raffles:', err.message);
  }
}

ensureRaffleImageColumns();

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

module.exports = pool;
