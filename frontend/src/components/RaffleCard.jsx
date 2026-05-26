import { Link } from 'react-router-dom';
import './RaffleCard.css';

export default function RaffleCard({ raffle }) {
  const pct = Math.round((raffle.sold_tickets / raffle.total_tickets) * 100);
  const available = raffle.total_tickets - raffle.sold_tickets;
  const coverImage = Array.isArray(raffle.image_urls) && raffle.image_urls.length > 0
    ? raffle.image_urls[0]
    : raffle.image_url;

  return (
    <Link to={`/raffle/${raffle.id}`} className="raffle-card">
      <div className="card-img-wrap">
        {coverImage
          ? <img src={coverImage} alt={raffle.title} className="card-img" />
          : <div className="card-img-placeholder">🎁</div>
        }
        <span className="card-price">${parseFloat(raffle.ticket_price).toFixed(2)}</span>
        {available === 0 && <span className="card-sold-out">AGOTADO</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{raffle.title}</h3>
        {raffle.description && (
          <p className="card-desc">{raffle.description}</p>
        )}
        <div className="card-meta">
          <span>por <strong>{raffle.organizer_name}</strong></span>
          {raffle.draw_date && (
            <span className="card-date">
              📅 {new Date(raffle.draw_date).toLocaleDateString('es-SV')}
            </span>
          )}
        </div>
        <div className="card-progress-wrap">
          <div className="card-progress-bar">
            <div className="card-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="card-progress-labels">
            <span>{raffle.sold_tickets} vendidos</span>
            <span>{available} disponibles</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
