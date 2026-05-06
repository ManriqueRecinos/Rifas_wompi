import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login: saveAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.login(data.correo, data.contrasenia);
      saveAuth(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales inválidas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-primary-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Bienvenido de nuevo</h1>
          <p className="text-gray-400 text-sm">Ingresa tus credenciales para acceder</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                {...register('correo', { required: true })}
                className="input-field pl-12" 
                type="email" 
                placeholder="tu@correo.com" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                {...register('contrasenia', { required: true })}
                className="input-field pl-12" 
                type="password" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button 
            disabled={loading}
            className="btn-primary w-full py-4 mt-4 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-gray-400">
          ¿No tienes una cuenta? <Link to="/register" className="text-primary-500 hover:underline">Regístrate gratis</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
