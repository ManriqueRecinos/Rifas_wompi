import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './ValidateWinner.css';

export default function ValidateWinner() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await api.post('/raffles/validate-winner', { code: code.trim() });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo validar el ganador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="winner-validate-page">
      <div className="winner-validate-card">
        <div className="winner-validate-header">
          <span className="winner-validate-icon">🏆</span>
          <h1>Validar ganador</h1>
          <p>Ingresa el código que te compartió el supuesto ganador.</p>
        </div>

        {!result && (
          <form className="winner-validate-form" onSubmit={handleSubmit}>
            <label>Código del ticket ganador
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Pega aquí el código"
                required
              />
            </label>

            {error && <div className="winner-validate-error">{error}</div>}

            <button type="submit" className="winner-validate-btn" disabled={loading}>
              {loading ? 'Validando...' : 'Validar ganador'}
            </button>
          </form>
        )}

        {result && (
          <div className="winner-validate-result">
            <div className="winner-validate-ok">✓ Ticket canjeado</div>
            <h2>El ticket sí era ganador</h2>
            <div className="winner-validate-grid">
              <div><span>Rifa</span><strong>{result.ticket.raffle_title}</strong></div>
              <div><span>Ticket</span><strong>#{result.ticket.ticket_number}</strong></div>
              <div><span>Ganador</span><strong>{result.ticket.buyer_name || 'N/A'}</strong></div>
              <div><span>Organizador</span><strong>{result.ticket.organizer_name || 'N/A'}</strong></div>
              <div><span>Teléfono</span><strong>{result.ticket.organizer_phone || 'No disponible'}</strong></div>
            </div>
            <p className="winner-validate-note">
              El correo de confirmación fue enviado al ganador y el ticket quedó marcado como canjeado.
            </p>
            <Link to="/dashboard" className="winner-validate-btn secondary">Volver al panel</Link>
          </div>
        )}
      </div>
    </div>
  );
}