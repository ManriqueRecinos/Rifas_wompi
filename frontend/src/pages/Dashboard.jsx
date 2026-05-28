import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './Dashboard.css';

const ADMIN_EMAIL = 'manrique.recinos23@gmail.com';

export default function Dashboard() {
  const { user }     = useAuth();
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === ADMIN_EMAIL;

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
        <div className="dash-header-actions">
          <Link to="/validar-ganador" className="dash-secondary-btn">Validar ganador</Link>
          <Link to="/create" className="dash-create-btn">+ Nueva Rifa</Link>
        </div>
      </div>

      {/* Wompi Connection Card */}
      <WompiConfigCard />

      {isAdmin && <AdminPasswordPanel />}

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

function AdminPasswordPanel() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    api.get('/auth/admin/users')
      .then((response) => {
        if (!mounted) return;
        setUsers(response.data || []);
        if (response.data?.[0]?.id) {
          setSelectedUserId(String(response.data[0].id));
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.error || 'No se pudo cargar la lista de usuarios');
      })
      .finally(() => {
        if (mounted) setLoadingUsers(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.put(`/auth/admin/users/${selectedUserId}/password`, { password });
      setSuccess('Contraseña actualizada correctamente');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wompi-config-card" style={{ marginTop: '22px' }}>
      <div className="wompi-config-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <h3 className="wompi-config-title">Panel Admin de Contraseñas</h3>
            <p className="wompi-config-sub">Solo disponible para el correo administrador autorizado.</p>
          </div>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div className="wompi-success" style={{ marginBottom: '16px', color: '#4ade80', fontSize: '13px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', padding: '10px', borderRadius: '8px' }}>{success}</div>}

      <form onSubmit={handleSubmit} className="wompi-config-form">
        <div className="wompi-form-row">
          <div className="form-group">
            <label>Usuario</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers || users.length === 0}
              required
            >
              {users.length === 0 ? (
                <option value="">No hay usuarios</option>
              ) : (
                users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.email}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
        </div>

        <button type="submit" className="wompi-save-btn" disabled={loading || loadingUsers || users.length === 0}>
          {loading ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}

function WompiConfigCard() {
  const { user, refreshUser } = useAuth();
  const [appId, setAppId] = useState(user?.wompi_app_id || '');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(!user?.wompi_configured);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.put('/auth/wompi-config', { wompi_app_id: appId, wompi_secret: secret });
      setSuccess('¡Cuenta de Wompi vinculada y verificada con éxito!');
      setSecret('');
      await refreshUser();
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con Wompi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wompi-config-card">
      <div className="wompi-config-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🏦</span>
          <div>
            <h3 className="wompi-config-title">Pasarela de Pagos Wompi</h3>
            <p className="wompi-config-sub">
              {user?.wompi_configured 
                ? 'Conectada y lista para recibir pagos de tus rifas' 
                : 'Configura tus credenciales para recibir pagos directos'
              }
            </p>
          </div>
        </div>
        <div>
          <span className={`wompi-status-badge ${user?.wompi_configured ? 'active' : 'inactive'}`}>
            {user?.wompi_configured ? '● Conectada' : '● Sin configurar'}
          </span>
          {user?.wompi_configured && (
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="wompi-edit-btn"
            >
              {showForm ? 'Cancelar' : 'Editar'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="wompi-config-form">
          <div className="wompi-hint" style={{ marginTop: '0', marginBottom: '16px' }}>
            Para recibir el dinero de las rifas directamente en tu cuenta de Wompi (Banco Agrícola El Salvador), introduce tus credenciales del ambiente en producción o sandbox. 
            Las encuentras en <a href="https://wompi.sv" target="_blank" rel="noreferrer">wompi.sv</a> &gt; Desarrolladores.
          </div>

          {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
          {success && <div className="wompi-success" style={{ marginBottom: '16px', color: '#4ade80', fontSize: '13px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', padding: '10px', borderRadius: '8px' }}>{success}</div>}

          <div className="wompi-form-row">
            <div className="form-group">
              <label>App ID (Client ID)</label>
              <input 
                type="text" 
                placeholder="71897286-a920-4f0b-..." 
                value={appId}
                onChange={e => setAppId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Client Secret (Secret Key)</label>
              <input 
                type="password" 
                placeholder={user?.wompi_configured ? '••••••••••••••••••••' : 'f592ffa3-1b6c-...'}
                value={secret}
                onChange={e => setSecret(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="wompi-save-btn" disabled={loading}>
            {loading ? 'Verificando con Wompi...' : 'Validar y Guardar Credenciales'}
          </button>
        </form>
      )}
    </div>
  );
}

function DashRaffleRow({ raffle }) {
  const pct     = Math.round((raffle.sold_tickets / raffle.total_tickets) * 100);
  const revenue = (raffle.sold_tickets * parseFloat(raffle.ticket_price)).toFixed(2);
  const coverImage = Array.isArray(raffle.image_urls) && raffle.image_urls.length > 0
    ? raffle.image_urls[0]
    : raffle.image_url;

  return (
    <div className="dash-row">
      <div className="dash-row-img">
        {coverImage
          ? <img src={coverImage} alt={raffle.title} />
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
        <Link to={`/raffle/${raffle.id}/draw`} className="dash-draw-btn">🎲 Sorteo</Link>
        <Link to="/validar-ganador" className="dash-link-btn">🏆 Validar ganador</Link>
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
