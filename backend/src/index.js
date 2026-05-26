require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── Middlewares ────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/raffles',  require('./routes/raffles'));
app.use('/api/webhooks', require('./routes/webhooks'));

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── 404 ────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = parseInt(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
