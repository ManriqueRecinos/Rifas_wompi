const axios = require('axios');
require('dotenv').config();

const WOMPI_AUTH_URL = 'https://id.wompi.sv/connect/token';
const WOMPI_API_URL  = 'https://api.wompi.sv';

// ── Token cache ───────────────────────────────────────────────
let _token  = null;
let _expiry = null;

async function getAccessToken() {
  if (_token && Date.now() < _expiry) return _token;

  const params = new URLSearchParams({
    grant_type:    'client_credentials',
    audience:      'wompi_api',
    client_id:     process.env.WOMPI_APP_ID,
    client_secret: process.env.WOMPI_SECRET,
  });

  const { data } = await axios.post(WOMPI_AUTH_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in - 60) * 1000; // 60s de margen
  return _token;
}

// ── Crear enlace de pago ──────────────────────────────────────
async function createPaymentLink(raffle) {
  const token    = await getAccessToken();
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
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
      urlImagenProducto:   raffle.image_url || null,
    },
    configuracion: {
      urlRedirect:               `${frontendUrl}/payment/result`,
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
async function getPaymentLink(id) {
  const token = await getAccessToken();
  const { data } = await axios.get(`${WOMPI_API_URL}/EnlacePago/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return data;
}

module.exports = { getAccessToken, createPaymentLink, getPaymentLink };
