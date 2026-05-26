import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import './RaffleDetail.css';

export default function RaffleDetail() {
  const { id }  = useParams();
  const [raffle, setRaffle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying,  setBuying]  = useState(false);

  useEffect(() => {
    api.get(`/raffles/${id}`)
      .then(r => setRaffle(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = () => {
    if (!raffle?.wompi_url_enlace) return;
    setBuying(true);
    // Redirige a la interfaz de pago de Wompi (mismo enlace reutilizable)
    window.location.href = raffle.wompi_url_enlace;
  };

  if (loading) return <div className="detail-loading">Cargando...</div>;
  if (!raffle)  return <div className="detail-loading">Rifa no encontrada.</div>;

  const pct       = Math.round((raffle.sold_tickets / raffle.total_tickets) * 100);
  const available = raffle.total_tickets - raffle.sold_tickets;
  const soldOut   = available === 0;

  return (
    <div className="detail-page container">
      <Link to="/" className="back-link">← Volver al listado</Link>

      <div className="detail-grid">
        {/* Imagen */}
        <div className="detail-img-wrap">
          {raffle.image_url
            ? <img src={raffle.image_url} alt={raffle.title} className="detail-img" />
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

          {/* Botón de compra — redirige a Wompi */}
          {raffle.status === 'active' && !soldOut ? (
            <button
              className={`buy-btn ${buying ? 'loading' : ''}`}
              onClick={handleBuy}
              disabled={buying || !raffle.wompi_url_enlace}
            >
              {buying ? (
                <span>Redirigiendo a Wompi...</span>
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
    </div>
  );
}
