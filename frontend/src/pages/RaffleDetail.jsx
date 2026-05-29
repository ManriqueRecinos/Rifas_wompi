import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ImageCarousel from '../components/ImageCarousel';
import './RaffleDetail.css';

export default function RaffleDetail() {
  const { id }  = useParams();
  const [raffle, setRaffle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying,  setBuying]  = useState(false);
  const [tickets, setTickets] = useState([]);

  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  useEffect(() => {
    api.get(`/raffles/${id}`)
      .then(r => setRaffle(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user) {
      setBuyerName(user.name || '');
      setBuyerEmail(user.email || '');
    }
  }, [user]);

  // Obtener tickets si es el dueño
  const isOwner = user && raffle && user.id === raffle.user_id;

  useEffect(() => {
    if (isOwner) {
      api.get(`/raffles/${id}/tickets`)
        .then(r => setTickets(r.data))
        .catch(console.error);
    }
  }, [id, isOwner]);

  const handleOpenPurchase = () => {
    if (!raffle?.wompi_url_enlace) return;
    setQuantity(1);
    setShowModal(true);
  };

  const normalizedQuantity = Math.max(1, parseInt(quantity || '1', 10));
  const purchaseTotal = (parseFloat(raffle?.ticket_price || '0') * normalizedQuantity).toFixed(2);

  const handleConfirmPurchase = () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      alert('Por favor completa todos los campos.');
      return;
    }
    setBuying(true);

    localStorage.setItem(
      `pending_purchase_${id}`,
      JSON.stringify({
        raffleId: id,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        quantity: normalizedQuantity,
        totalAmount: purchaseTotal,
        createdAt: new Date().toISOString(),
      }),
    );

    // Adjuntar los parámetros de nombre y email en el enlace de Wompi de manera que Wompi los prellene en la pasarela.
    // Wompi acepta los parámetros query `name` y `email` en la URL de enlace para auto-rellenar los datos del cliente.
    const checkoutUrl = new URL(raffle.wompi_url_enlace);
    checkoutUrl.searchParams.set('name', buyerName);
    checkoutUrl.searchParams.set('email', buyerEmail);
    checkoutUrl.searchParams.set('monto', purchaseTotal);

    window.location.href = checkoutUrl.toString();
  };

  const handleConfirmCashPurchase = () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      alert('Por favor completa todos los campos.');
      return;
    }
    setBuying(true);
    api.post(`/raffles/${id}/cash-purchase`, {
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      quantity: normalizedQuantity,
    })
      .then((res) => {
        alert('🎟️ Ticket físico registrado y correo enviado con éxito.');
        setShowModal(false);
        // Recargar datos de la rifa para actualizar la barra de progreso
        api.get(`/raffles/${id}`).then(r => setRaffle(r.data));
        // Recargar tickets
        if (isOwner) {
          api.get(`/raffles/${id}/tickets`).then(r => setTickets(r.data));
        }
      })
      .catch((err) => {
        alert(err.response?.data?.error || 'Error al registrar el pago en efectivo.');
      })
      .finally(() => setBuying(false));
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();

    if (isOwner) {
      handleConfirmCashPurchase();
      return;
    }

    handleConfirmPurchase();
  };

  const handleDownloadTicketPdf = async (ticketId, ticketNumber) => {
    try {
      setDownloadingPdfId(ticketId);
      const response = await api.get(`/raffles/tickets/${ticketId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo generar el PDF del ticket.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  if (loading) return <div className="detail-loading">Cargando...</div>;
  if (!raffle)  return <div className="detail-loading">Rifa no encontrada.</div>;

  const pct       = Math.round((raffle.sold_tickets / raffle.total_tickets) * 100);
  const available = raffle.total_tickets - raffle.sold_tickets;
  const soldOut   = available === 0;
  const raffleImages = Array.isArray(raffle.image_urls) && raffle.image_urls.length > 0
    ? raffle.image_urls
    : raffle.image_url
      ? [raffle.image_url]
      : [];

  // Función para enmascarar correo electrónico (ej: m***s@gmail.com)
  const maskEmail = (email) => {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) {
      return `${local.charAt(0)}***@${domain}`;
    }
    return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
  };

  // Función para enmascarar número telefónico (ej: ****-5678)
  const maskPhone = (phone) => {
    if (!phone) return '****-****';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 4) return '****-****';
    return `****-${clean.slice(-4)}`;
  };

  return (
    <div className="detail-page container">
      <Link to="/" className="back-link">← Volver al listado</Link>

      <div className="detail-grid">
        {/* Imagen */}
        <div className="detail-img-wrap">
          {raffleImages.length > 0
            ? <ImageCarousel images={raffleImages} alt={raffle.title} className="detail-carousel" />
            : <div className="detail-img-placeholder">🎁</div>
          }
          {raffle.wompi_url_qr && (
            <div className="qr-wrap">
              <p>Escanea para pagar</p>
              <img src={raffle.wompi_url_qr} alt="QR de pago" className="qr-img" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="detail-info">
          <span className="detail-tag">{raffle.status === 'active' ? '🟢 Activa' : '🔴 Cerrada'}</span>
          <h1 className="detail-title">{raffle.title}</h1>
          {raffle.description && <p className="detail-desc">{raffle.description}</p>}

          <div className="detail-stats">
            <div className="stat">
              <span className="stat-label">Precio del ticket</span>
              <span className="stat-val accent">${parseFloat(raffle.ticket_price).toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Tickets totales</span>
              <span className="stat-val">{raffle.total_tickets}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Disponibles</span>
              <span className="stat-val">{available}</span>
            </div>
            {raffle.draw_date && (
              <div className="stat">
                <span className="stat-label">Fecha de sorteo</span>
                <span className="stat-val">
                  {new Date(raffle.draw_date).toLocaleDateString('es-SV', { dateStyle: 'long' })}
                </span>
              </div>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="detail-progress">
            <div className="detail-progress-bar">
              <div className="detail-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="detail-progress-labels">
              <span>{raffle.sold_tickets} tickets vendidos</span>
              <span>{pct}%</span>
            </div>
          </div>

          {/* Organizador */}
          <div className="detail-organizer">
            <span>Organizado por <strong>{raffle.organizer_name}</strong></span>
          </div>

          {/* Botón de compra — abre modal */}
          {raffle.status === 'active' && !soldOut ? (
            <button
              className={`buy-btn ${buying ? 'loading' : ''}`}
              onClick={handleOpenPurchase}
              disabled={buying || !raffle.wompi_url_enlace}
            >
              {buying ? (
                <span>Preparando pago...</span>
              ) : (
                <>
                  <span className="buy-btn-icon">💳</span>
                  <span>Comprar Ticket — ${parseFloat(raffle.ticket_price).toFixed(2)}</span>
                </>
              )}
            </button>
          ) : soldOut ? (
            <div className="sold-out-msg">🚫 Esta rifa está agotada</div>
          ) : (
            <div className="sold-out-msg">⛔ Esta rifa ya no está disponible</div>
          )}

          {raffle.wompi_url_enlace && (
            <p className="wompi-note">
              🔒 Pago procesado de forma segura por{' '}
              <a href="https://wompi.sv" target="_blank" rel="noreferrer">Wompi</a>
            </p>
          )}
        </div>
      </div>

      {/* Lista de Compradores (Solo Dueño) */}
      {isOwner && (
        <div className="owner-tickets-section" style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
          <h2 className="detail-title" style={{ fontSize: '28px', marginBottom: '20px' }}>🎟️ Control de Compradores (Dueño)</h2>
          {tickets.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Aún no se han vendido tickets para esta rifa.</p>
          ) : (
            <div className="tickets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {tickets.map(t => (
                <div key={t.id} className="ticket-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: 'var(--accent)' }}>Ticket #{t.ticket_number}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {raffle.winning_ticket_id === t.id && (
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#4ade80', fontWeight: 800 }}>Ganador</span>
                      )}
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text3)' }}>{new Date(t.purchased_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                      <strong>Nombre:</strong> {t.buyer_name || 'Desconocido'}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text2)' }}>
                      <strong>Correo:</strong> <span style={{ fontFamily: 'monospace' }}>{maskEmail(t.buyer_email)}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text2)' }}>
                      <strong>Teléfono:</strong> <span style={{ fontFamily: 'monospace' }}>{maskPhone(t.buyer_phone || t.phone)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Monto: ${parseFloat(t.amount_paid).toFixed(2)}</span>
                      <span>Método: {t.wompi_transaction_id ? 'Wompi' : 'Efectivo'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleDownloadTicketPdf(t.id, t.ticket_number)}
                      disabled={downloadingPdfId === t.id}
                      style={{ background: 'var(--accent)', color: '#111', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {downloadingPdfId === t.id ? 'Generando PDF...' : '📄 Descargar PDF'}
                    </button>
                    {t.ticket_pdf_url && (
                      <a href={t.ticket_pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline', alignSelf: 'center', fontWeight: 'bold' }}>
                        Abrir PDF guardado
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de datos del comprador */}
      {showModal && (
        <div className="purchase-modal-overlay">
          <div className="purchase-modal">
            {buying && (
              <div className="purchase-processing-layer" aria-live="polite" aria-busy="true">
                <div className="purchase-processing-card">
                  <div className="purchase-spinner" />
                  <strong>{isOwner ? 'Registrando pago contra entrega...' : 'Preparando tu pago...'}</strong>
                  <span>{isOwner ? 'Estamos guardando los datos y confirmando la transacción.' : 'Te estamos enviando a Wompi con tus datos listos.'}</span>
                </div>
              </div>
            )}
            <div className="modal-header">
              <div>
                <h2>Confirma tu compra</h2>
                <p className="modal-subtitle">Completa tus datos, revisa el resumen y finaliza en un solo paso.</p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)} disabled={buying}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleModalSubmit}>
              <div className="purchase-steps">
                <span className="purchase-step active">1. Tus datos</span>
                <span className="purchase-step active">2. Cantidad</span>
                <span className="purchase-step">3. Confirmar</span>
              </div>

              <p className="modal-desc">
                Te dejamos el formulario listo con tu información si ya iniciaste sesión. Solo revisa y corrige lo que necesites.
              </p>

              <div className="input-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  disabled={buying}
                  autoComplete="name"
                />
              </div>

              <div className="input-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="Ej. juan@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  disabled={buying}
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <label>Cantidad de tickets</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => {
                    const nextQuantity = parseInt(e.target.value || '1', 10);
                    setQuantity(Number.isNaN(nextQuantity) ? 1 : Math.max(1, nextQuantity));
                  }}
                  disabled={buying}
                />
                <small className="input-hint">Puedes comprar más de uno; el total se actualiza automáticamente.</small>
              </div>

              <div className="purchase-summary">
                <div>
                  <span>Ticket</span>
                  <strong>${parseFloat(raffle.ticket_price).toFixed(2)}</strong>
                </div>
                <div>
                  <span>Cantidad</span>
                  <strong>{normalizedQuantity}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>${purchaseTotal}</strong>
                </div>
              </div>

              {isOwner && (
                <div className="purchase-note owner-note">
                  Estás registrando un pago contra entrega. Al confirmar, guardaremos la transacción y emitiremos el ticket.
                </div>
              )}

              <div className="modal-footer">
                <button className="cancel-modal-btn" type="button" onClick={() => setShowModal(false)} disabled={buying}>
                  Cancelar
                </button>
                <button className="confirm-modal-btn" type="submit" disabled={buying}>
                  {buying
                    ? (isOwner ? 'Registrando...' : 'Redirigiendo a Wompi...')
                    : (isOwner ? 'Registrar pago contra entrega' : 'Proceder al pago con Wompi')}
                </button>
              </div>
              {isOwner && (
                <p className="purchase-note" style={{ marginTop: '6px' }}>
                  El botón principal registra el pago contra entrega cuando eres el dueño de la rifa.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
