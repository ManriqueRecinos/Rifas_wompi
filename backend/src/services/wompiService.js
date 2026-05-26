const axios = require('axios');
require('dotenv').config();

const WOMPI_AUTH_URL = 'https://id.wompi.sv/connect/token';
const WOMPI_API_URL  = 'https://api.wompi.sv';

// ── Token cache (por appId) ──────────────────────────────────
const _tokenCache = {};

async function getAccessToken(appId, secret) {
  const cacheKey = appId || 'global';
  const cached   = _tokenCache[cacheKey];
  if (cached && Date.now() < cached.expiry) return cached.token;

  const clientId     = appId  || process.env.WOMPI_APP_ID;
  const clientSecret = secret || process.env.WOMPI_SECRET;

  const params = new URLSearchParams({
    grant_type:    'client_credentials',
    audience:      'wompi_api',
    client_id:     clientId,
    client_secret: clientSecret,
  });

  const { data } = await axios.post(WOMPI_AUTH_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  _tokenCache[cacheKey] = {
    token:  data.access_token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

// ── Validar credenciales de Wompi ─────────────────────────────
async function validateCredentials(appId, secret) {
  try {
    await getAccessToken(appId, secret);
    return { valid: true };
  } catch (err) {
    // Limpiar cache de token fallido
    delete _tokenCache[appId];
    return { valid: false, error: err.response?.data?.error_description || err.message };
  }
}

// ── Crear enlace de pago ──────────────────────────────────────
async function createPaymentLink(raffle, userCredentials) {
  const appId  = userCredentials?.appId;
  const secret = userCredentials?.secret;
  const token  = await getAccessToken(appId, secret);

  const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:3001';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const body = {
    identificadorEnlaceComercio: `RIFA-${raffle.id}`,
    monto:          parseFloat(raffle.ticket_price),
    nombreProducto: `Ticket: ${raffle.title}`,
    formaPago: {
      permitirTarjetaCreditoDebido: true,
      permitirPagoConPuntoAgricola: false,
      permitirPagoEnCuotasAgricola: false,
      permitirPagoEnBitcoin:        false,
      permitePagoQuickPay:          false,
    },
    infoProducto: {
      descripcionProducto: raffle.description || raffle.title,
      urlImagenProducto:   (Array.isArray(raffle.image_urls) && raffle.image_urls[0]) || raffle.image_url || null,
    },
    configuracion: {
      urlRedirect:               `${frontendUrl}/payment/result?raffleId=${raffle.id}`,
      esMontoEditable:           false,
      esCantidadEditable:        false,
      cantidadPorDefecto:        1,
      notificarTransaccionCliente: true,
      urlWebhook:                `${backendUrl}/api/webhooks/wompi`,
      emailsNotificacion:        null,
    },
  };

  const { data } = await axios.post(`${WOMPI_API_URL}/EnlacePago`, body, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  return data; // { idEnlace, urlQrCodeEnlace, urlEnlace, estaProductivo }
}

// ── Obtener enlace por ID ─────────────────────────────────────
async function getPaymentLink(id, userCredentials) {
  const appId  = userCredentials?.appId;
  const secret = userCredentials?.secret;
  const token  = await getAccessToken(appId, secret);
  const { data } = await axios.get(`${WOMPI_API_URL}/EnlacePago/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return data;
}

module.exports = { getAccessToken, validateCredentials, createPaymentLink, getPaymentLink };

