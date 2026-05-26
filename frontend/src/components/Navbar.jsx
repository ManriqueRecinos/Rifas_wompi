import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/'); };

  return (
    <nav className="navbar">
      <div className="container flex" style={{ justifyContent: 'space-between', height: '64px' }}>
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🎟️</span>
          <span className="logo-text">RIFAS<span>APP</span></span>
        </Link>

        <div className="navbar-links flex gap-2">
          <Link to="/" className="nav-link">Explorar</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Mis Rifas</Link>
              <Link to="/create"    className="nav-btn">+ Nueva Rifa</Link>
              <button onClick={handleLogout} className="nav-link nav-logout">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="nav-link">Entrar</Link>
              <Link to="/register" className="nav-btn">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
