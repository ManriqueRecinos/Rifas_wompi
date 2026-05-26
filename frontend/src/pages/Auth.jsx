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
  const [form, setF]  = useState({ name: '', email: '', password: '' });
  const [err,  setE]  = useState('');
  const [busy, setB]  = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setE(''); setB(true);
    try {
      await register(form.name, form.email, form.password);
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
