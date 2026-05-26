-- ============================================================
--  RIFAS APP — Migración completa
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USUARIOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  avatar_url  VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── RIFAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raffles (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title                 VARCHAR(500) NOT NULL,
  description           TEXT,
  image_url             VARCHAR(500),
  ticket_price          DECIMAL(10,2) NOT NULL,
  total_tickets         INTEGER NOT NULL,
  sold_tickets          INTEGER DEFAULT 0,
  draw_date             TIMESTAMP,
  status                VARCHAR(50) DEFAULT 'draft',   -- draft | active | completed | cancelled
  -- Wompi
  wompi_enlace_id       INTEGER,
  wompi_url_enlace      VARCHAR(500),
  wompi_url_qr          VARCHAR(500),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ── TICKETS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raffle_tickets (
  id                        SERIAL PRIMARY KEY,
  raffle_id                 INTEGER REFERENCES raffles(id) ON DELETE CASCADE,
  ticket_number             VARCHAR(50) NOT NULL,
  buyer_name                VARCHAR(255),
  buyer_email               VARCHAR(255),
  wompi_transaction_id      VARCHAR(255) UNIQUE,
  wompi_authorization_code  VARCHAR(255),
  amount_paid               DECIMAL(10,2),
  status                    VARCHAR(50) DEFAULT 'pending',  -- pending | confirmed | cancelled
  ticket_pdf_url            VARCHAR(500),
  purchased_at              TIMESTAMP DEFAULT NOW()
);

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_raffles_user   ON raffles(user_id);
CREATE INDEX IF NOT EXISTS idx_raffles_status ON raffles(status);
CREATE INDEX IF NOT EXISTS idx_tickets_raffle ON raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_tickets_email  ON raffle_tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_wompi  ON raffle_tickets(wompi_transaction_id);
