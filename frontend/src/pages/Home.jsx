import { useState, useEffect } from 'react';
import api from '../services/api';
import RaffleCard from '../components/RaffleCard';
import './Home.css';

export default function Home() {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/raffles')
      .then(r => setRaffles(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container hero-content">
          <span className="hero-tag">🎟️ Plataforma de Rifas</span>
          <h1 className="hero-title">
            Tu próximo<br /><span>gran premio</span><br />te espera
          </h1>
          <p className="hero-sub">
            Participa en rifas transparentes y seguras.<br />
            Paga con tarjeta, recibe tu ticket al instante.
          </p>
        </div>
      </section>

      {/* Listado */}
      <section className="container raffles-section">
        <div className="section-header">
          <h2 className="section-title">Rifas Activas</h2>
          <span className="section-count">{raffles.length} disponibles</span>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : raffles.length === 0 ? (
          <div className="empty-state">
            <span>🎁</span>
            <p>No hay rifas activas por el momento.</p>
          </div>
        ) : (
          <div className="raffles-grid">
            {raffles.map(r => <RaffleCard key={r.id} raffle={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
