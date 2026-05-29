import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

export function Login() {
  const { login }    = useAuth();
  const nav          = useNavigate();
  const [form, setF] = useState({ email: '', password: '' });
  const [err,  setE] = useState('');
  const [busy, setB] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setE(''); setB(true);
    try {
      await login(form.email, form.password);
      nav('/dashboard');
    } catch (ex) {
      setE(ex.response?.data?.error || 'Error al iniciar sesión');
    } finally { setB(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🎟️</span>
          <h1>Iniciar sesión</h1>
          <p>Bienvenido de vuelta</p>
        </div>
        {err && <div className="auth-error">{err}</div>}
        <form onSubmit={handle} className="auth-form">
          <label>Correo electrónico
            <input type="email" value={form.email}
              onChange={e => setF(f => ({...f, email: e.target.value}))} required />
          </label>
          <label>Contraseña
            <input type="password" value={form.password}
              onChange={e => setF(f => ({...f, password: e.target.value}))} required />
          </label>
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav           = useNavigate();
  const [form, setF]  = useState({
    name: '', email: '', password: '', phone: '',
    wompi_app_id: '', wompi_secret: '',
  });
  const [err,  setE]       = useState('');
  const [busy, setB]       = useState(false);
  const [showWompi, setShowWompi] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setE(''); setB(true);
    try {
      await register(
        form.name, form.email, form.password,
        form.phone || undefined,
        form.wompi_app_id || undefined,
        form.wompi_secret || undefined,
      );
      nav('/dashboard');
    } catch (ex) {
      setE(ex.response?.data?.error || 'Error al registrarse');
    } finally { setB(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🎟️</span>
          <h1>Crear cuenta</h1>
          <p>Empieza a crear tus rifas</p>
        </div>
        {err && <div className="auth-error">{err}</div>}
        <form onSubmit={handle} className="auth-form">
          <label>Nombre completo
            <input type="text" value={form.name}
              onChange={e => setF(f => ({...f, name: e.target.value}))} required />
          </label>
          <label>Correo electrónico
            <input type="email" value={form.email}
              onChange={e => setF(f => ({...f, email: e.target.value}))} required />
          </label>
          <label>Contraseña
            <input type="password" value={form.password} minLength={6}
              onChange={e => setF(f => ({...f, password: e.target.value}))} required />
          </label>
          <label>Teléfono de contacto (opcional)
            <input type="text" value={form.phone}
              onChange={e => setF(f => ({...f, phone: e.target.value}))} />
          </label>

          {/* Sección de Wompi colapsable */}
          <div className="wompi-section">
            <button
              type="button"
              className="wompi-toggle"
              onClick={() => setShowWompi(!showWompi)}
            >
              <span>{showWompi ? '▾' : '▸'}</span>
              <span>🏦 Vincular cuenta de Wompi</span>
              <span className="wompi-optional">(opcional)</span>
            </button>

            {showWompi && (
              <div className="wompi-fields">
                <p className="wompi-hint">
                  Ingresa tus credenciales de Wompi para que los pagos de tus rifas lleguen directamente a tu cuenta.
                  Las puedes encontrar en tu <a href="https://wompi.sv" target="_blank" rel="noreferrer">panel de Wompi</a>.
                </p>
                <label>App ID (Client ID)
                  <input
                    type="text"
                    placeholder="Ej: 71897286-a920-4f0b-..."
                    value={form.wompi_app_id}
                    onChange={e => setF(f => ({...f, wompi_app_id: e.target.value}))}
                  />
                </label>
                <label>Secret (Client Secret)
                  <input
                    type="password"
                    placeholder="Ej: f592ffa3-1b6c-..."
                    value={form.wompi_secret}
                    onChange={e => setF(f => ({...f, wompi_secret: e.target.value}))}
                  />
                </label>
              </div>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Entra aquí</Link>
        </p>
      </div>
    </div>
  );
}
