import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { raffleService, paymentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, CreditCard, ShoppingBag, ShieldCheck, Info, X, ChevronLeft, ChevronRight, 
  Gauge, Settings, Maximize, Cpu, Zap, Box, Layers, HardDrive, Calendar, Database, UserPlus
} from 'lucide-react';

const ICON_MAP = {
  cc: <Gauge size={20} />,
  año: <Calendar size={20} />,
  motor: <Settings size={20} />,
  procesador: <Cpu size={20} />,
  ram: <Database size={20} />,
  almacenamiento: <HardDrive size={20} />,
  voltaje: <Zap size={20} />,
  material: <Layers size={20} />,
  frenos: <ShieldCheck size={20} />,
  default: <Box size={20} />
};

const RifaDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cantidad, setCantidad] = useState(1);
  const [metodoPago, setMetodoPago] = useState('wompi');
  const [isOrdering, setIsOrdering] = useState(false);
  const [participantData, setParticipantData] = useState({ nombre: '', correo: '', telefono: '' });
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  const { data: rifa, isLoading } = useQuery({
    queryKey: ['rifa', id],
    queryFn: () => raffleService.getOne(id).then(res => res.data)
  });

  const isCreator = user && rifa && user.id === rifa.usuario_id;

  const handlePurchase = async (e) => {
    e.preventDefault();
    setIsOrdering(true);
    try {
      const payload = {
        rifa_id: id,
        cantidad,
        metodo_pago: metodoPago,
        // Si es contraentrega o no hay usuario, mandamos los datos del participante
        user_info: (metodoPago === 'contraentrega' || !user) ? participantData : null
      };
      const res = await paymentService.createOrder(payload);
      
      if (res.data.checkout_url) {
        setCheckoutUrl(res.data.checkout_url);
        setShowPaymentModal(true);
      } else {
        alert('Tickets asignados exitosamente vía Contraentrega.');
        navigate('/dashboard');
      }
    } catch (error) {
      alert('Error al procesar: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsOrdering(false);
    }
  };

  const nextImage = () => {
    if (rifa?.imagenes?.length) {
      setCurrentImageIndex((prev) => (prev + 1) % rifa.imagenes.length);
    }
  };

  const prevImage = () => {
    if (rifa?.imagenes?.length) {
      setCurrentImageIndex((prev) => (prev - 1 + rifa.imagenes.length) % rifa.imagenes.length);
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-b-2 border-primary-500 rounded-full"></div></div>;

  const total = rifa.precio * cantidad;
  const especificaciones = rifa.especificaciones || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Gallery & Specs */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="relative aspect-video bg-dark-800 rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl group border border-white/5">
             {rifa.imagenes && rifa.imagenes.length > 0 ? (
               <>
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentImageIndex}
                    src={rifa.imagenes[currentImageIndex]} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full object-cover" 
                  />
                </AnimatePresence>
                {rifa.imagenes.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-dark-950/50 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-500">
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextImage} className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-dark-950/50 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-500">
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
               </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Ticket className="text-primary-500/20" size={120} />
                </div>
              )}
          </div>
          
          <h1 className="text-5xl font-black mb-6 tracking-tight">{rifa.nombre}</h1>
          <p className="text-gray-400 leading-relaxed mb-10 text-xl font-medium">{rifa.descripcion}</p>
          
          {/* Detailed Specifications */}
          {Object.keys(especificaciones).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {Object.entries(especificaciones).map(([key, value]) => (
                <div key={key} className="glass-card p-4 flex flex-col gap-2 border-primary-500/5 hover:border-primary-500/20 transition-colors">
                  <div className="p-2 bg-primary-600/10 rounded-xl text-primary-400 w-fit">
                    {ICON_MAP[key] || ICON_MAP.default}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{key.replace('_', ' ')}</p>
                    <p className="font-bold text-white text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Purchase Box */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:sticky lg:top-24 h-fit">
          <div className="glass-card p-10 border-primary-500/10 shadow-2xl shadow-primary-500/5 rounded-[3rem]">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
              <ShoppingBag size={32} className="text-primary-500" /> 
              {isCreator && metodoPago === 'contraentrega' ? 'Asignar Tickets' : '¡Participa Ahora!'}
            </h2>
            
            <form onSubmit={handlePurchase} className="space-y-8">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 block">1. Cantidad de Tickets</label>
                <div className="flex items-center gap-6 p-2 bg-dark-800 rounded-3xl">
                  <button type="button" onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="w-14 h-14 flex items-center justify-center bg-dark-700 rounded-2xl hover:bg-primary-500 transition-all font-black text-2xl">-</button>
                  <input type="number" value={cantidad} readOnly className="flex-1 bg-transparent border-none rounded-xl text-center font-black text-3xl outline-none" />
                  <button type="button" onClick={() => setCantidad(Math.min(rifa.cantidad_tickets - rifa.vendidos, cantidad + 1))} className="w-14 h-14 flex items-center justify-center bg-dark-700 rounded-2xl hover:bg-primary-500 transition-all font-black text-2xl">+</button>
                </div>
              </div>

              {/* Formulario de Datos del Participante */}
              {( (!user) || (isCreator && metodoPago === 'contraentrega') ) && (
                <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <label className="text-xs font-black text-primary-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <UserPlus size={16}/> Datos del Participante
                  </label>
                  <input className="input-field py-4 px-6 rounded-2xl" placeholder="Nombre completo" required value={participantData.nombre} onChange={e => setParticipantData({...participantData, nombre: e.target.value})} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="input-field py-4 px-6 rounded-2xl" type="email" placeholder="Correo" required value={participantData.correo} onChange={e => setParticipantData({...participantData, correo: e.target.value})} />
                    <input className="input-field py-4 px-6 rounded-2xl" placeholder="Teléfono" required value={participantData.telefono} onChange={e => setParticipantData({...participantData, telefono: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                 <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">2. Método de Pago</label>
                 <div className={`grid gap-4 ${isCreator ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button type="button" onClick={() => setMetodoPago('wompi')} className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${metodoPago === 'wompi' ? 'bg-primary-600/10 border-primary-500 text-white' : 'bg-white/5 border-transparent text-gray-500'}`}>
                    <CreditCard size={28} /> <span className="text-xs font-black uppercase">Tarjeta / Wompi</span>
                  </button>
                  
                  {/* SOLO EL CREADOR VE CONTRAENTREGA */}
                  {isCreator && (
                    <button type="button" onClick={() => setMetodoPago('contraentrega')} className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${metodoPago === 'contraentrega' ? 'bg-primary-600/10 border-primary-500 text-white' : 'bg-white/5 border-transparent text-gray-500'}`}>
                      <ShoppingBag size={28} /> <span className="text-xs font-black uppercase">Contraentrega (Efectivo)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Inversión Total</p>
                    <p className="text-5xl font-black text-white">$ {total.toFixed(2)}</p>
                  </div>
                </div>
                <button disabled={isOrdering} className="btn-primary w-full py-6 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-500/30">
                  {isOrdering ? 'Procesando...' : (isCreator && metodoPago === 'contraentrega' ? 'Asignar Tickets Manualmente' : 'Confirmar Participación')}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal(false)} className="absolute inset-0 bg-dark-950/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }} className="relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl h-[85vh] flex flex-col">
              <div className="bg-white border-b p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20"><ShieldCheck className="text-white" size={24} /></div>
                  <span className="font-black text-dark-950 uppercase tracking-tighter text-lg">Pago Blindado Wompi</span>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={28} /></button>
              </div>
              <div className="flex-1 bg-gray-50 relative"><iframe src={checkoutUrl} className="w-full h-full border-none" title="Wompi Checkout" /></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RifaDetail;
