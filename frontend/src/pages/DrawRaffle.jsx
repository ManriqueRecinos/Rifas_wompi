import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './DrawRaffle.css';

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DrawRaffle() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [raffle, setRaffle] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [drawSize, setDrawSize] = useState(5);
  const [winnerCount, setWinnerCount] = useState(1);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [winnerTicketIds, setWinnerTicketIds] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`/raffles/${id}`),
      api.get(`/raffles/${id}/tickets`),
    ])
      .then(([raffleRes, ticketsRes]) => {
        if (!mounted) return;
        setRaffle(raffleRes.data);
        setTickets(ticketsRes.data || []);
        const persistedWinners = Array.isArray(raffleRes.data.winning_ticket_ids)
          ? raffleRes.data.winning_ticket_ids
          : raffleRes.data.winning_ticket_id
            ? [raffleRes.data.winning_ticket_id]
            : [];
        setWinnerTicketIds(persistedWinners);
      })
      .catch((err) => {
        if (mounted) setStatusMessage(err.response?.data?.error || 'No se pudo cargar la rifa');
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [id]);

  const raffleOwner = user && raffle && user.id === raffle.user_id;
  const remainingTickets = useMemo(
    () => tickets.filter((ticket) => !['eliminated', 'winner'].includes(ticket.status)),
    [tickets],
  );
  const eliminatedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'eliminated'),
    [tickets],
  );
  const winnerTickets = useMemo(
    () => tickets.filter((ticket) => winnerTicketIds.includes(ticket.id) || ticket.status === 'winner'),
    [tickets, winnerTicketIds],
  );

  const primaryWinnerTicket = winnerTickets[0] || tickets.find((ticket) => ticket.status === 'winner') || null;

  const persistRound = async (eliminatedIds, currentWinnerIds = []) => {
    const response = await api.post(`/raffles/${id}/manual-draw`, {
      eliminated_ticket_ids: eliminatedIds,
      winner_ticket_ids: currentWinnerIds,
    });

    const [raffleRes, ticketsRes] = await Promise.all([
      api.get(`/raffles/${id}`),
      api.get(`/raffles/${id}/tickets`),
    ]);

    setRaffle(raffleRes.data);
    setTickets(ticketsRes.data || []);
    const persistedWinners = Array.isArray(raffleRes.data.winning_ticket_ids)
      ? raffleRes.data.winning_ticket_ids
      : raffleRes.data.winning_ticket_id
        ? [raffleRes.data.winning_ticket_id]
        : [];
    setWinnerTicketIds(response.data.winnerTicketIds || persistedWinners);
  };

  const runSpin = async () => {
    if (drawing || !raffleOwner) return;
    if (raffle?.status === 'completed' || winnerTicketIds.length) return;
    if (remainingTickets.length === 0) {
      setStatusMessage('No hay participantes disponibles.');
      return;
    }

    const normalizedWinnerCount = Math.max(1, Math.min(parseInt(winnerCount || '1', 10), remainingTickets.length));

    if (remainingTickets.length <= normalizedWinnerCount) {
      const finalWinners = shuffle(remainingTickets).slice(0, normalizedWinnerCount);
      setDrawing(true);
      setStatusMessage('Giro final para revelar los ganadores...');

      for (let index = 0; index < 12; index += 1) {
        setActiveTicketId(finalWinners[index % finalWinners.length]?.id || null);
        setWheelRotation((value) => value + 90);
        // eslint-disable-next-line no-await-in-loop
        await sleep(90);
      }

      try {
        await persistRound(selectedTicketIds, finalWinners.map((ticket) => ticket.id));
        setWinnerTicketIds(finalWinners.map((ticket) => ticket.id));
        setStatusMessage(`${finalWinners.length} ganador${finalWinners.length > 1 ? 'es' : ''} definido${finalWinners.length > 1 ? 's' : ''} y guardado${finalWinners.length > 1 ? 's' : ''}.`);
      } catch (err) {
        setStatusMessage(err.response?.data?.error || 'No se pudieron guardar los ganadores.');
      } finally {
        setDrawing(false);
      }
      return;
    }

    const maxEliminations = Math.max(1, remainingTickets.length - normalizedWinnerCount);
    const roundSize = Math.min(Math.max(parseInt(drawSize || '1', 10), 1), maxEliminations);
    const roundTickets = shuffle(remainingTickets);
    const eliminatedRound = roundTickets.slice(0, roundSize);
    const survivorPool = roundTickets.slice(roundSize);

    setDrawing(true);
    setStatusMessage('Girando la ruleta...');

    const animationSequence = shuffle(roundTickets);
    for (let index = 0; index < 14; index += 1) {
      const ticket = animationSequence[index % animationSequence.length];
      setActiveTicketId(ticket?.id || null);
      setWheelRotation((value) => value + 60);
      // Intencionalmente no usamos timers largos para mantener la interacción fluida.
      // Este sleep da tiempo a que la ruleta marque el recorrido antes de resolver.
      // eslint-disable-next-line no-await-in-loop
      await sleep(90);
    }

    eliminatedRound.forEach((ticket) => {
      setSelectedTicketIds((current) => [...new Set([...current, ticket.id])]);
    });

    try {
      await persistRound(eliminatedRound.map((ticket) => ticket.id));
      setStatusMessage(`${eliminatedRound.length} participante${eliminatedRound.length > 1 ? 's' : ''} eliminado${eliminatedRound.length > 1 ? 's' : ''}.`);

      if (survivorPool.length <= normalizedWinnerCount) {
        const finalWinners = shuffle(survivorPool).slice(0, normalizedWinnerCount);
        setStatusMessage('Giro final para revelar los ganadores...');
        for (let index = 0; index < 10; index += 1) {
          setActiveTicketId(finalWinners[index % finalWinners.length]?.id || null);
          setWheelRotation((value) => value + 72);
          // eslint-disable-next-line no-await-in-loop
          await sleep(100);
        }
        await persistRound([...selectedTicketIds, ...eliminatedRound.map((ticket) => ticket.id)], finalWinners.map((ticket) => ticket.id));
        setWinnerTicketIds(finalWinners.map((ticket) => ticket.id));
        setStatusMessage(`${finalWinners.length} ganador${finalWinners.length > 1 ? 'es' : ''} definido${finalWinners.length > 1 ? 's' : ''} y guardado${finalWinners.length > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      setStatusMessage(err.response?.data?.error || 'No se pudo guardar el sorteo.');
    } finally {
      setDrawing(false);
    }
  };

  if (loading) {
    return <div className="draw-page container"><div className="draw-loading">Cargando sorteo...</div></div>;
  }

  if (!raffle) {
    return <div className="draw-page container"><div className="draw-loading">Rifa no encontrada.</div></div>;
  }

  const wheelTickets = remainingTickets.length > 0 ? remainingTickets : tickets;

  return (
    <div className="draw-page container">
      <div className="draw-header">
        <div>
          <Link to={`/raffle/${id}`} className="draw-back">← Volver a la rifa</Link>
          <h1 className="draw-title">Sorteo Manual</h1>
          <p className="draw-sub">{raffle.title}</p>
        </div>
        <div className="draw-badges">
          <span className={`draw-badge ${raffle.status}`}>{raffle.status}</span>
          <span className="draw-badge">Restan {remainingTickets.length}</span>
        </div>
      </div>

      <div className="draw-layout">
        <section className="draw-wheel-panel">
          <div className="draw-wheel-wrap">
            <div className="draw-pointer" />
            <div className="draw-wheel" style={{ transform: `rotate(${wheelRotation}deg)` }}>
              {wheelTickets.map((ticket, index) => {
                const angle = (360 / Math.max(wheelTickets.length, 1)) * index;
                const isActive = ticket.id === activeTicketId;
                const isEliminated = ticket.status === 'eliminated' || selectedTicketIds.includes(ticket.id);
                const radius = Math.min(150, 95 + Math.max(0, wheelTickets.length - 8) * 2);
                return (
                  <div
                    key={ticket.id}
                    className={`draw-slice ${isActive ? 'active' : ''} ${isEliminated ? 'eliminated' : ''}`}
                    style={{ transform: `rotate(${angle}deg) translateY(-${radius}px)` }}
                  >
                    <span>#{ticket.ticket_number}</span>
                    <small>{ticket.buyer_name || 'Desconocido'}</small>
                  </div>
                );
              })}
            </div>
            <div className="draw-center-card">
              {winnerTickets.length > 0 ? (
                <>
                  <span className="draw-center-label">Ganadores</span>
                  <strong>{winnerTickets.length}</strong>
                  <small>ticket{winnerTickets.length > 1 ? 's' : ''} seleccionado{winnerTickets.length > 1 ? 's' : ''}</small>
                </>
              ) : activeTicketId ? (
                <>
                  <span className="draw-center-label">Ruleta girando</span>
                  <strong>
                    {tickets.find((ticket) => ticket.id === activeTicketId)?.buyer_name || 'Participante'}
                  </strong>
                </>
              ) : (
                <>
                  <span className="draw-center-label">Listo para sortear</span>
                  <strong>{raffle.title}</strong>
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="draw-side">
          <div className="draw-card">
            <label>Cantidad de descalificados por giro</label>
            <input
              type="number"
              min="1"
              max={Math.max(1, remainingTickets.length - Math.max(1, parseInt(winnerCount || '1', 10)))}
              value={drawSize}
              onChange={(e) => setDrawSize(Math.max(1, parseInt(e.target.value || '1', 10)))}
              disabled={drawing || raffle.status === 'completed'}
            />
            <label>Cantidad de ganadores</label>
            <input
              type="number"
              min="1"
              max={Math.max(1, tickets.length)}
              value={winnerCount}
              onChange={(e) => {
                const nextValue = parseInt(e.target.value || '1', 10);
                setWinnerCount(Number.isNaN(nextValue) ? 1 : Math.max(1, nextValue));
              }}
              disabled={drawing || raffle.status === 'completed'}
            />
            <button
              type="button"
              className="draw-btn"
              onClick={runSpin}
              disabled={drawing || raffle.status === 'completed' || remainingTickets.length === 0}
            >
              {drawing ? 'Girando...' : remainingTickets.length === 0 ? 'Sin participantes' : 'Girar ruleta'}
            </button>
            {statusMessage && <p className="draw-message">{statusMessage}</p>}
          </div>

          <div className="draw-card">
            <h3>Eliminados</h3>
            {eliminatedTickets.length === 0 ? (
              <p className="draw-empty">Todavía no hay eliminados.</p>
            ) : (
              <ul className="draw-list">
                {eliminatedTickets.map((ticket) => (
                  <li key={ticket.id}>Ticket #{ticket.ticket_number} - {ticket.buyer_name || 'Desconocido'}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="draw-card winner-card">
            <h3>Ganadores</h3>
            {winnerTickets.length > 0 ? (
              <div className="winner-list">
                {winnerTickets.map((ticket) => (
                  <div key={ticket.id} className="winner-pill">
                    <strong>#{ticket.ticket_number}</strong>
                    <p>{ticket.buyer_name || 'Desconocido'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="draw-empty">Aún no definido.</p>
            )}
          </div>

          {primaryWinnerTicket && (
            <div className="draw-card winner-focus">
              <h3>Ganador principal</h3>
              <strong>#{primaryWinnerTicket.ticket_number}</strong>
              <p>{primaryWinnerTicket.buyer_name || 'Desconocido'}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}