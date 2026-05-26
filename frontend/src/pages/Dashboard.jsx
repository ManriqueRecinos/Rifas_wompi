import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user }     = useAuth();
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/raffles/mine')
      .then(r => setRaffles(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalSold     = raffles.reduce((s, r) => s + (r.sold_tickets || 0), 0);
  const totalRevenue  = raffles.reduce((s, r) => s + (r.sold_tickets * parseFloat(r.ticket_price)), 0);
  const activeRaffles = raffles.filter(r => r.status === 'active').length;

  return (
    <div className="dashboard container">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Mis Rifas</h1>
          <p className="dash-sub">Hola, <strong>{user?.name}</strong> 👋</p>
        </div>
        <Link to="/create" className="dash-create-btn">+ Nueva Rifa</Link>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        <div className="dash-stat">
          <span className="ds-label">Rifas activas</span>
          <span className="ds-val">{activeRaffles}</span>
        </div>
        <div className="dash-stat">
          <span className="ds-label">Tickets vendidos</span>
          <span className="ds-val">{totalSold}</span>
        </div>
        <div className="dash-stat">
          <span className="ds-label">Ingresos totales</span>
          <span className="ds-val accent">${totalRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* Lista de rifas */}
      {loading ? (
        <p className="dash-loading">Cargando...</p>
      ) : raffles.length === 0 ? (
        <div className="dash-empty">
          <span>🎟️</span>
          <p>Aún no has creado ninguna rifa.</p>
          <Link to="/create" className="dash-create-btn">Crear mi primera rifa</Link>
        </div>
      ) : (
        <div className="dash-list">
          {raffles.map(r => <DashRaffleRow key={r.id} raffle={r} />)}
        </div>
      )}
    </div>
  );
}

function DashRaffleRow({ raffle }) {
  const pct     = Math.round((raffle.sold_tickets / raffle.total_tickets) * 100);
  const revenue = (raffle.sold_tickets * parseFloat(raffle.ticket_price)).toFixed(2);

  return (
    <div className="dash-row">
      <div className="dash-row-img">
        {raffle.image_url
          ? <img src={raffle.image_url} alt={raffle.title} />
          : <span>🎁</span>}
      </div>
      <div className="dash-row-info">
        <div className="flex gap-2" style={{alignItems:'baseline'}}>
          <h3 className="dash-row-title">{raffle.title}</h3>
          <span className={`dash-badge ${raffle.status}`}>{raffle.status}</span>
        </div>
        <div className="dash-row-progress">
          <div className="mini-bar"><div className="mini-fill" style={{width:`${pct}%`}}/></div>
          <span>{raffle.sold_tickets}/{raffle.total_tickets} tickets · ${revenue} recaudados</span>
        </div>
      </div>
      <div className="dash-row-actions">
        {raffle.wompi_url_enlace && (
          <a href={raffle.wompi_url_enlace} target="_blank" rel="noreferrer" className="dash-link-btn">
            🔗 Enlace Wompi
          </a>
        )}
        <Link to={`/raffle/${raffle.id}`} className="dash-view-btn">Ver rifa</Link>
      </div>
    </div>
  );
}
