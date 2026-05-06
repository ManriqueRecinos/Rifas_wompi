import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { raffleService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trophy, Image as ImageIcon, Trash2, Gauge, Settings, Maximize, 
  Car, Bike, Monitor, Smartphone, Cpu, Zap, Calendar, Tag, DollarSign, ListOrdered, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS = {
  motos: { nombre: 'Motocicletas', icono: <Bike />, campos: ['cc', 'año', 'combustible', 'marca'] },
  autos: { nombre: 'Automóviles', icono: <Car />, campos: ['motor', 'año', 'traccion', 'transmision'] },
  gamer: { nombre: 'Tecnología/Gamer', icono: <Monitor />, campos: ['procesador', 'grafica', 'ram', 'almacenamiento'] },
  bicis: { nombre: 'Bicicletas', icono: <Bike />, campos: ['rodada', 'material', 'frenos', 'suspension'] },
  celulares: { nombre: 'Smartphones', icono: <Smartphone />, campos: ['modelo', 'almacenamiento', 'pantalla', 'bateria'] },
  electro: { nombre: 'Electrodomésticos', icono: <Zap />, campos: ['marca', 'modelo', 'garantia', 'eficiencia'] },
  otros: { nombre: 'Otros', icono: <Tag />, campos: ['estado', 'marca', 'modelo'] }
};

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [categoriaSel, setCategoriaSel] = useState('otros');
  const [newRifa, setNewRifa] = useState({
    nombre: '', descripcion: '', precio: 5, cantidad_tickets: 100, fecha_sorteo: '',
    especificaciones: {},
    imagenes: []
  });

  const { data: myRifas, isLoading } = useQuery({
    queryKey: ['my-rifas'],
    queryFn: () => api.get('/dashboard/stats').then(res => res.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => raffleService.create({ ...data, categoria: categoriaSel }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-rifas']);
      setShowCreate(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setNewRifa({
      nombre: '', descripcion: '', precio: 5, cantidad_tickets: 100, fecha_sorteo: '',
      especificaciones: {}, imagenes: []
    });
    setCategoriaSel('otros');
  };

  const openUploadWidget = async () => {
    try {
      // Obtenemos la firma del backend para una subida segura
      const { data: signData } = await api.get('/cloudinary/signature');

      window.cloudinary.openUploadWidget(
        {
          cloudName: signData.cloud_name,
          apiKey: signData.api_key,
          uploadSignatureTimestamp: signData.timestamp,
          uploadSignature: signData.signature,
          uploadPreset: 'ml_default',
          sources: ['local', 'url', 'camera'],
          multiple: true,
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            setNewRifa(prev => ({
              ...prev,
              imagenes: [...prev.imagenes, result.info.secure_url]
            }));
          }
        }
      );
    } catch (err) {
      alert('Error al inicializar la subida: ' + err.message);
    }
  };

  const updateSpec = (campo, valor) => {
    setNewRifa(prev => ({
      ...prev,
      especificaciones: { ...prev.especificaciones, [campo]: valor }
    }));
  };

  if (isLoading) return <div className="p-20 text-center"><div className="animate-spin h-10 w-10 border-b-2 border-primary-500 rounded-full mx-auto"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ... (rest of the dashboard UI remains the same) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
        <div>
          <h1 className="text-4xl font-black mb-2">Panel Maestro</h1>
          <p className="text-gray-400">Control total de tus sorteos y activos.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 py-4 px-8 shadow-lg shadow-primary-500/20">
          <Plus size={20} /> Nueva Rifa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 border-l-4 border-primary-500">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Rifas Activas</p>
          <p className="text-3xl font-black">{myRifas?.filter(r => r.estado === 'activa').length || 0}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-green-500">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Recaudado</p>
          <p className="text-3xl font-black text-green-500">$ {myRifas?.reduce((acc, r) => acc + (r.precio * r.vendidos), 0).toFixed(2)}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-yellow-500">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Tickets Vendidos</p>
          <p className="text-3xl font-black">{myRifas?.reduce((acc, r) => acc + parseInt(r.vendidos), 0)}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Producto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Estado</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Ventas</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {myRifas?.map(rifa => (
              <tr key={rifa.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-bold">{rifa.nombre}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${rifa.estado === 'activa' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gray-500/20 text-gray-400'}`}>
                    {rifa.estado}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="w-24 bg-dark-800 h-2 rounded-full overflow-hidden mb-1">
                    <div className="bg-primary-500 h-full" style={{ width: `${(rifa.vendidos / rifa.cantidad_tickets) * 100}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-500">{rifa.vendidos} / {rifa.cantidad_tickets} tickets</p>
                </td>
                <td className="px-6 py-4">
                  {rifa.estado === 'activa' && (
                     <button onClick={() => raffleService.selectWinner(rifa.id)} className="btn-secondary py-1 px-3 text-xs flex items-center gap-1">
                      <Trophy size={14} /> Sortear
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="glass-card w-full max-w-3xl p-0 my-8 overflow-hidden">
              <div className="p-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-2xl font-black">Configurar Nuevo Sorteo</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
              </div>

              <div className="p-8 max-h-[75vh] overflow-y-auto space-y-8">
                <section>
                  <label className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4 block">1. Tipo de Producto</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(CATEGORIAS).map(([key, cat]) => (
                      <button 
                        key={key} 
                        onClick={() => { setCategoriaSel(key); setNewRifa({...newRifa, especificaciones: {}}); }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${categoriaSel === key ? 'bg-primary-600/10 border-primary-500 text-white' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}
                      >
                        {cat.icono}
                        <span className="text-[10px] font-bold uppercase">{cat.nombre}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4 block">2. Información General</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Nombre del Premio</label>
                      <input className="input-field" placeholder="Ej: Yamaha R6 2024" value={newRifa.nombre} onChange={e => setNewRifa({...newRifa, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Fecha del Sorteo</label>
                      <input className="input-field" type="date" value={newRifa.fecha_sorteo} onChange={e => setNewRifa({...newRifa, fecha_sorteo: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Descripción Detallada</label>
                    <textarea className="input-field" placeholder="Describe los beneficios..." rows={3} value={newRifa.descripcion} onChange={e => setNewRifa({...newRifa, descripcion: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Precio por Ticket ($)</label>
                      <input className="input-field" type="number" value={newRifa.precio} onChange={e => setNewRifa({...newRifa, precio: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Cantidad de Tickets</label>
                      <input className="input-field" type="number" value={newRifa.cantidad_tickets} onChange={e => setNewRifa({...newRifa, cantidad_tickets: parseInt(e.target.value)})} />
                    </div>
                  </div>
                </section>

                <section className="p-6 bg-primary-600/5 rounded-3xl border border-primary-500/10 space-y-4">
                  <label className="text-xs font-black text-primary-500 uppercase tracking-widest mb-2 block">3. Especificaciones {CATEGORIAS[categoriaSel].nombre}</label>
                  <div className="grid grid-cols-2 gap-4">
                    {CATEGORIAS[categoriaSel].campos.map(campo => (
                      <div key={campo} className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">{campo.replace('_', ' ')}</label>
                        <input className="input-field py-2 text-sm" placeholder={`Ingresa ${campo}`} value={newRifa.especificaciones[campo] || ''} onChange={e => updateSpec(campo, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4 block">4. Galería de Fotos</label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                    {newRifa.imagenes.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 shadow-lg">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setNewRifa(prev => ({...prev, imagenes: prev.imagenes.filter(im => im !== img)}))} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                      </div>
                    ))}
                    <button onClick={openUploadWidget} className="aspect-square border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all text-gray-500 hover:text-primary-500 hover:border-primary-500/50">
                      <Plus size={24} /> <span className="text-[10px] font-bold">Subir</span>
                    </button>
                  </div>
                </section>
              </div>

              <div className="p-8 bg-white/5 border-t border-white/5 flex gap-4">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold hover:bg-white/10 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
                <button 
                  onClick={() => createMutation.mutate(newRifa)} 
                  disabled={createMutation.isLoading}
                  className="flex-1 btn-primary py-4 text-xs tracking-widest"
                >
                  {createMutation.isLoading ? 'Publicar Rifa' : 'Publicar Rifa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
