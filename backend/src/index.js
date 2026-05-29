require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

// ── Middlewares ────────────────────────────────────────────────
const allowedOrigins = [process.env.FRONTEND_URL, process.env.BACKEND_URL].filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/raffles',  require('./routes/raffles'));
app.use('/api/webhooks', require('./routes/webhooks'));

app.get('/payment/result', (req, res) => {
  if (hasFrontendBuild) {
    return res.sendFile(frontendIndexPath);
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://10.10.15.6:5173';
  const targetUrl = new URL('/payment/result', frontendUrl);
  Object.entries(req.query).forEach(([key, value]) => {
    if (typeof value === 'string') targetUrl.searchParams.set(key, value);
  });
  return res.redirect(302, targetUrl.toString());
});

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
  app.get(/^\/(?!api|health).*/, (_, res) => {
    res.sendFile(frontendIndexPath);
  });
}

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── 404 ────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = parseInt(process.env.PORT) || 3001;
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend corriendo en http://${HOST}:${PORT}`);
  if (hasFrontendBuild) {
    console.log('🌐 Frontend estático servido desde backend/frontend/dist');
  }
});
