require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

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
    `Faltan variables de entorno para la base de datos: ${missingFields.join(', ')}.`
  );
}

const pool = new Pool({
  ...poolConfig,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function run() {
  const client = await pool.connect();
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log('[DB Reset] Borrando tablas existentes...');
    await client.query(`
      DROP TABLE IF EXISTS raffle_tickets CASCADE;
      DROP TABLE IF EXISTS raffles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `).catch(async () => {
      await client.query('DROP TABLE IF EXISTS raffle_tickets CASCADE');
      await client.query('DROP TABLE IF EXISTS raffles CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
    });

    console.log('[DB Reset] Reaplicando migraciones...');
    for (const file of migrationFiles) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`[DB Reset] OK ${file}`);
    }

    console.log('[DB Reset] Base de datos reconstruida correctamente.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[DB Reset] Error:', err);
  process.exitCode = 1;
});