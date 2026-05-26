import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import ImageCarousel from '../components/ImageCarousel';
import './CreateRaffle.css';

export default function CreateRaffle() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setF] = useState({
    title: '', description: '', ticket_price: '',
    total_tickets: '', draw_date: '',
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => () => {
    images.forEach((item) => URL.revokeObjectURL(item.preview));
  }, [images]);

  const handleImg = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImages((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.preview));
      return files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
    });

    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      images.forEach(({ file }) => fd.append('images', file));

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

      {!user?.wompi_configured && (
        <div className="create-info-note" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          ⚠️ <strong>Atención:</strong> No has vinculado tu cuenta de Wompi aún. Las rifas que crees usarán el enlace de pago global por defecto. Vincula tu cuenta en el <Link to="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 'bold' }}>Dashboard</Link> para recibir pagos directamente en tu cuenta de Wompi.
        </div>
      )}

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
              {images.length > 0 ? (
                <div style={{ width: '100%' }}>
                  <ImageCarousel
                    images={images.map((item) => item.preview)}
                    alt="Vista previa de la rifa"
                    className="create-carousel"
                  />
                  <p style={{ marginTop: '12px', color: 'var(--text3)', fontSize: '13px' }}>
                    {images.length} imagen{images.length > 1 ? 'es' : ''} seleccionada{images.length > 1 ? 's' : ''} en orden de carga.
                  </p>
                </div>
              ) : (
                <div className="img-placeholder">
                  <span>📷</span>
                  <p>Haz clic para subir imágenes</p>
                </div>
              )}
              <input id="img-input" type="file" accept="image/*" multiple
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
