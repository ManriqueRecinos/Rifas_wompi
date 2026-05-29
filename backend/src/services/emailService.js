const nodemailer = require('nodemailer');
require('dotenv').config();

// Configura con tu proveedor SMTP. Aquí usamos Gmail como ejemplo.
// Cambia host/port/auth según tu proveedor.
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envía el ticket por correo al comprador.
 * @param {Object} opts
 * @param {string} opts.to           - Email del comprador
 * @param {string} opts.buyerName    - Nombre del comprador
 * @param {string} opts.buyerEmail   - Correo del comprador
 * @param {string} opts.raffleTitle  - Nombre de la rifa
 * @param {string} opts.ticketNumber - Número del ticket
 * @param {Buffer} opts.pdfBuffer    - PDF generado
 */
function getDisplayName(buyerName, buyerEmail) {
  const cleanName = typeof buyerName === 'string' ? buyerName.trim() : '';
  if (cleanName) return cleanName;

  const localPart = typeof buyerEmail === 'string' && buyerEmail.includes('@')
    ? buyerEmail.split('@')[0].trim()
    : '';

  if (!localPart) return 'participante';

  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

async function sendTicketEmail({ to, buyerName, buyerEmail, raffleTitle, ticketNumber, pdfBuffer }) {
  if (!process.env.SMTP_USER) {
    console.warn('[Email] SMTP no configurado — omitiendo envío de correo.');
    return;
  }

  const displayName = getDisplayName(buyerName, buyerEmail);

  const mailOptions = {
    from:    process.env.SMTP_FROM || `"Rifas Premium" <${process.env.SMTP_USER}>`,
    to,
    subject: `🎟️ ${displayName}, tu ticket #${ticketNumber} para: ${raffleTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:40px 32px;text-align:center;">
          <h1 style="font-size:32px;color:#e8c840;margin:0;letter-spacing:2px;">¡TICKET CONFIRMADO!</h1>
          <p style="color:#aaa;margin-top:8px;">Tu participación ha sido registrada exitosamente.</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#ccc;font-size:16px;">Hola <strong style="color:#e8c840">${displayName}</strong>,</p>
          <p style="color:#999;margin-top:8px;line-height:1.6;">
            Adjunto encontrarás tu ticket para la rifa <strong style="color:#fff">${raffleTitle}</strong>.
            Tu número de ticket es el <strong style="color:#e8c840;font-size:20px;">#${ticketNumber}</strong>.
          </p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
            <p style="color:#888;font-size:12px;letter-spacing:3px;margin:0;">NÚMERO DE TICKET</p>
            <p style="color:#e8c840;font-size:48px;font-weight:900;margin:8px 0;">#${ticketNumber}</p>
            <p style="color:#666;font-size:12px;">${raffleTitle}</p>
          </div>
          <p style="color:#666;font-size:13px;margin-top:24px;">Guarda bien tu ticket. ¡Mucha suerte! 🍀</p>
        </div>
        <div style="background:#050505;padding:20px;text-align:center;">
          <p style="color:#444;font-size:11px;margin:0;">Este correo fue generado automáticamente por Rifas App.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename:    `ticket-${ticketNumber}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Email] Ticket enviado a ${to}`);
}

async function sendWinnerValidationEmail({
  to,
  buyerName,
  buyerEmail,
  raffleTitle,
  ticketNumber,
  organizerName,
  organizerPhone,
}) {
  if (!process.env.SMTP_USER) {
    console.warn('[Email] SMTP no configurado — omitiendo correo de validación.');
    return;
  }

  const displayName = getDisplayName(buyerName, buyerEmail);
  const contactPhone = organizerPhone || 'No disponible';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Rifas Premium" <${process.env.SMTP_USER}>`,
    to,
    subject: `🏆 ${displayName}, tu ticket #${ticketNumber} fue validado`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:40px 32px;text-align:center;">
          <h1 style="font-size:32px;color:#e8c840;margin:0;letter-spacing:2px;">¡TICKET VALIDADO!</h1>
          <p style="color:#aaa;margin-top:8px;">El organizador confirmó que tu ticket es el ganador.</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#ccc;font-size:16px;">Hola <strong style="color:#e8c840">${displayName}</strong>,</p>
          <p style="color:#999;margin-top:8px;line-height:1.6;">
            Tu ticket <strong style="color:#fff">#${ticketNumber}</strong> de la rifa <strong style="color:#fff">${raffleTitle}</strong>
            ha sido validado correctamente por el organizador.
          </p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;">
            <p style="color:#888;font-size:12px;letter-spacing:3px;margin:0 0 8px;">CONTACTO DEL ORGANIZADOR</p>
            <p style="color:#e8c840;font-size:20px;font-weight:700;margin:0;">${organizerName || 'Organizador'}${contactPhone !== 'No disponible' ? ` · ${contactPhone}` : ''}</p>
            <p style="color:#666;font-size:13px;margin-top:8px;">Guarda este correo como comprobante para reclamar tu premio.</p>
          </div>
          <p style="color:#666;font-size:13px;margin-top:24px;">Ahora puedes contactar al organizador para coordinar la entrega de tu premio.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendTicketEmail, sendWinnerValidationEmail };
