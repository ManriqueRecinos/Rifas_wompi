import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, User, LogOut, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
              <Ticket className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">Rifa<span className="text-primary-500">Premium</span></span>
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary-400 transition-colors">
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Bienvenido</p>
                    <p className="text-sm font-semibold">{user.nombre}</p>
                  </div>
                  <button 
                    onClick={() => { logout(); navigate('/'); }}
                    className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-medium hover:text-primary-400 transition-colors">Iniciar Sesión</Link>
                <Link to="/register" className="btn-primary py-2 text-sm">Crear Cuenta</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
