import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, UserPlus } from 'lucide-react';

const Register = () => {
  const { register, handleSubmit } = useForm();
  const { login: saveAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authService.register(data);
      saveAuth(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert('Error en el registro: ' + (err.response?.data?.error || err.message));
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
            <UserPlus className="text-primary-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
          <p className="text-gray-400 text-sm">Únete a RifaPremium y comienza a participar</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input {...register('nombre', { required: true })} className="input-field pl-12" placeholder="Nombre completo" />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input {...register('correo', { required: true })} className="input-field pl-12" type="email" placeholder="Correo electrónico" />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input {...register('telefono', { required: true })} className="input-field pl-12" placeholder="Teléfono" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input {...register('contrasenia', { required: true })} className="input-field pl-12" type="password" placeholder="Contraseña" />
          </div>

          <button disabled={loading} className="btn-primary w-full py-4 mt-4">
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-gray-400">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary-500 hover:underline">Inicia sesión</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
