require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';

// ── Middlewares ────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/raffles',  require('./routes/raffles'));
app.use('/api/webhooks', require('./routes/webhooks'));

app.get('/payment/result', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://10.10.15.6:5173';
  const targetUrl = new URL('/payment/result', frontendUrl);

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      targetUrl.searchParams.set(key, value);
    }
  }

  return res.redirect(302, targetUrl.toString());
});

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── 404 ────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = parseInt(process.env.PORT) || 3001;
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend corriendo en http://10.10.15.6:${PORT}`);
});
