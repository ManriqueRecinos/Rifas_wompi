import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import './ValidateTicket.css';

export default function ValidateTicket() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    api.get(`/raffles/validate-ticket/${code}`)
      .then((response) => {
        if (mounted) setData(response.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.error || 'No se pudo validar el ticket');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [code]);

  const ticket = data?.ticket;

  return (
    <div className="validate-page">
      <div className="validate-card">
        {loading && (
          <>
            <div className="validate-spinner" />
            <p>Validando ticket...</p>
          </>
        )}

        {!loading && error && (
          <>
            <div className="validate-icon invalid">✕</div>
            <h1>Ticket no válido</h1>
            <p>{error}</p>
            <Link to="/" className="validate-btn">Volver al inicio</Link>
          </>
        )}

        {!loading && data && ticket && (
          <>
            <div className={`validate-icon ${data.isWinner ? 'winner' : 'valid'}`}>
              {data.isWinner ? '🏆' : '✓'}
            </div>
            <h1>{data.isWinner ? 'Ticket ganador' : 'Ticket válido'}</h1>
            <p className="validate-subtitle">
              {data.isWinner
                ? 'Este ticket fue el seleccionado como ganador.'
                : 'Este ticket es auténtico, pero no fue el ganador del sorteo.'}
            </p>

            <div className="validate-grid">
              <div><span>Rifa</span><strong>{ticket.raffle_title}</strong></div>
              <div><span>Ticket</span><strong>#{ticket.ticket_number}</strong></div>
              <div><span>Comprador</span><strong>{ticket.buyer_name || 'N/A'}</strong></div>
              <div><span>Correo</span><strong>{ticket.buyer_email || 'N/A'}</strong></div>
              <div><span>Organizador</span><strong>{ticket.organizer_name}</strong></div>
              <div><span>Estado</span><strong>{ticket.raffle_status}</strong></div>
            </div>

            <div className="validate-note">
              {data.isWinner
                ? 'El portador puede presentar este PDF y el código escaneado para reclamar el premio.'
                : 'El código es válido y corresponde a un ticket emitido correctamente.'}
            </div>

            <Link to="/" className="validate-btn">Ir al inicio</Link>
          </>
        )}
      </div>
    </div>
  );
}