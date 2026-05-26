import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './CreateRaffle.css';

export default function CreateRaffle() {
  const nav = useNavigate();
  const [form, setF] = useState({
    title: '', description: '', ticket_price: '',
    total_tickets: '', draw_date: '',
  });
  const [image, setImage]  = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (image) fd.append('image', image);

      const { data } = await api.post('/raffles', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      nav(`/raffle/${data.id}`);
    } catch (ex) {
      setError(ex.response?.data?.error || 'Error al crear la rifa');
    } finally { setLoading(false); }
  };

  return (
    <div className="create-page container">
      <div className="create-header">
        <h1 className="create-title">Nueva Rifa</h1>
        <p className="create-sub">Completa los datos. Se creará automáticamente el enlace de pago en Wompi.</p>
      </div>

      {error && <div className="create-error">{error}</div>}

      <div className="create-grid">
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>Nombre de la rifa *</label>
            <input type="text" placeholder="Ej: iPhone 15 Pro Max"
              value={form.title}
              onChange={e => setF(f=>({...f,title:e.target.value}))} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea rows={4} placeholder="Describe el premio, las reglas, etc."
              value={form.description}
              onChange={e => setF(f=>({...f,description:e.target.value}))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Precio por ticket ($) *</label>
              <input type="number" min="0.01" step="0.01" placeholder="5.00"
                value={form.ticket_price}
                onChange={e => setF(f=>({...f,ticket_price:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label>Total de tickets *</label>
              <input type="number" min="1" placeholder="100"
                value={form.total_tickets}
                onChange={e => setF(f=>({...f,total_tickets:e.target.value}))} required />
            </div>
          </div>
          <div className="form-group">
            <label>Fecha del sorteo</label>
            <input type="datetime-local"
              value={form.draw_date}
              onChange={e => setF(f=>({...f,draw_date:e.target.value}))} />
          </div>
          <div className="form-group">
            <label>Imagen del premio</label>
            <div className="img-upload" onClick={() => document.getElementById('img-input').click()}>
              {preview
                ? <img src={preview} alt="preview" className="img-preview" />
                : <div className="img-placeholder">
                    <span>📷</span>
                    <p>Haz clic para subir imagen</p>
                  </div>
              }
              <input id="img-input" type="file" accept="image/*"
                onChange={handleImg} style={{display:'none'}} />
            </div>
          </div>

          {/* Preview del ingreso estimado */}
          {form.ticket_price && form.total_tickets && (
            <div className="estimate-box">
              <span>💰 Ingreso estimado si se venden todos:</span>
              <strong>${(parseFloat(form.ticket_price) * parseInt(form.total_tickets)).toFixed(2)}</strong>
            </div>
          )}

          <button type="submit" className="create-btn" disabled={loading}>
            {loading ? (
              <><span className="spinner"/> Creando rifa y enlace Wompi...</>
            ) : (
              '🚀 Crear Rifa'
            )}
          </button>
        </form>

        {/* Panel informativo */}
        <aside className="create-info">
          <h3>¿Qué pasa al crear?</h3>
          <ol className="create-steps">
            <li><span>1</span> Se guarda la rifa en la base de datos</li>
            <li><span>2</span> Se genera automáticamente un <strong>enlace de pago en Wompi</strong> con el precio del ticket</li>
            <li><span>3</span> Recibes la URL y el QR para compartir con compradores</li>
            <li><span>4</span> Cada pago exitoso genera un ticket PDF enviado al correo del comprador</li>
          </ol>
          <div className="create-info-note">
            🔒 Los pagos son procesados por <strong>Wompi</strong>, pasarela oficial de Banco Agrícola.
          </div>
        </aside>
      </div>
    </div>
  );
}
