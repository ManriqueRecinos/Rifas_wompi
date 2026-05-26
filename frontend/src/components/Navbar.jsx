import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useIsMobile from '../hooks/useIsMobile';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => { logout(); setMenuOpen(false); nav('/'); };

  const handleNavigate = (path) => {
    setMenuOpen(false);
    nav(path);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-shell flex">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🎟️</span>
          <span className="logo-text">RIFAS<span>APP</span></span>
        </Link>

        {isMobile ? (
          <>
            <button
              type="button"
              className={`nav-burger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>

            {menuOpen && (
              <div className="nav-mobile-panel">
                <button type="button" className="nav-mobile-item" onClick={() => handleNavigate('/')}>Explorar rifas</button>
                <button type="button" className="nav-mobile-item" onClick={() => handleNavigate('/create')}>Crear rifa</button>
                {!user ? (
                  <>
                    <button type="button" className="nav-mobile-item" onClick={() => handleNavigate('/login')}>Entrar</button>
                    <button type="button" className="nav-mobile-item accent" onClick={() => handleNavigate('/register')}>Registrarse</button>
                  </>
                ) : (
                  <button type="button" className="nav-mobile-item danger" onClick={handleLogout}>Salir</button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="navbar-links flex gap-2">
            <Link to="/" className="nav-link">Explorar</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="nav-link">Mis Rifas</Link>
                <Link to="/create" className="nav-btn">+ Nueva Rifa</Link>
                <button onClick={handleLogout} className="nav-link nav-logout">
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Entrar</Link>
                <Link to="/register" className="nav-btn">Registrarse</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
