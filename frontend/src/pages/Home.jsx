import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { raffleService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Users, ArrowRight, Ticket } from 'lucide-react';

const RaffleCard = ({ rifa }) => {
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    if (rifa.imagenes && rifa.imagenes.length > 1) {
      const interval = setInterval(() => {
        setCurrentImg((prev) => (prev + 1) % rifa.imagenes.length);
      }, 7000); // Cambio cada 7 segundos
      return () => clearInterval(interval);
    }
  }, [rifa.imagenes]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card group overflow-hidden flex flex-col h-full border-primary-500/10 hover:border-primary-500/30 transition-all duration-500"
    >
      {/* Mini-Carousel Automático */}
      <div className="relative aspect-video overflow-hidden">
        <AnimatePresence mode="wait">
          {rifa.imagenes && rifa.imagenes.length > 0 ? (
            <motion.img 
              key={currentImg}
              src={rifa.imagenes[currentImg]} 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
          ) : (
            <div className="w-full h-full bg-dark-800 flex items-center justify-center">
              <Ticket className="text-primary-500/20" size={64} />
            </div>
          )}
        </AnimatePresence>
        
        {/* Indicadores de progreso (opcional para estética) */}
        {rifa.imagenes?.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-dark-950/20 backdrop-blur-sm rounded-full">
            {rifa.imagenes.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${i === currentImg ? 'w-4 bg-primary-500' : 'w-1 bg-white/30'}`} 
              />
            ))}
          </div>
        )}

        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
            ${rifa.precio} / Ticket
          </span>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-black mb-2 group-hover:text-primary-400 transition-colors">{rifa.nombre}</h3>
        <p className="text-gray-400 text-sm line-clamp-2 mb-6 flex-1">{rifa.descripcion}</p>
        
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-gray-500 font-bold">
              <Calendar size={14} className="text-primary-500" />
              <span>{new Date(rifa.fecha_sorteo).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 font-bold">
              <Users size={14} className="text-primary-500" />
              <span>{rifa.vendidos} vendidos</span>
            </div>
          </div>
          
          <Link 
            to={`/rifa/${rifa.id}`}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-xs tracking-widest"
          >
            PARTICIPAR <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const Home = () => {
  const { data: rifas, isLoading } = useQuery({
    queryKey: ['rifas'],
    queryFn: () => raffleService.getAll().then(res => res.data)
  });

  if (isLoading) return (
    <div className="flex justify-center p-20">
      <div className="animate-spin h-10 w-10 border-b-2 border-primary-500 rounded-full"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black mb-4 tracking-tighter"
        >
          Sorteos <span className="text-gradient">Activos</span>
        </motion.h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Participa en nuestras rifas premium y gana premios espectaculares con la mayor seguridad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rifas?.map((rifa) => (
          <RaffleCard key={rifa.id} rifa={rifa} />
        ))}
      </div>
    </div>
  );
};

export default Home;
