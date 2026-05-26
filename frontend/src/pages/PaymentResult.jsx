import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import './PaymentResult.css';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | failed
  const [message, setMessage] = useState('Verificando tu pago...');

  useEffect(() => {
    const esAprobada = params.get('esAprobada');
    const idTx = params.get('idTransaccion');
    const raffleId = params.get('raffleId');
    const finalizedKey = idTx ? `wompi_finalized_${idTx}` : null;

    if (finalizedKey && sessionStorage.getItem(finalizedKey)) {
      setStatus('success');
      setMessage('Tu ticket ya fue confirmado.');
      return;
    }

    if (esAprobada === 'false') {
      setStatus('failed');
      return;
    }

    if (esAprobada === 'true' || idTx) {
      const pendingKey = raffleId ? `pending_purchase_${raffleId}` : null;
      let pendingData = null;

      try {
        const pendingRaw = pendingKey ? localStorage.getItem(pendingKey) : null;
        pendingData = pendingRaw ? JSON.parse(pendingRaw) : null;
      } catch {
        pendingData = null;
      }

      if (!raffleId || !idTx || !pendingData?.buyerName || !pendingData?.buyerEmail) {
        setStatus('failed');
        setMessage('No pudimos recuperar los datos del comprador para finalizar el ticket.');
        return;
      }

      setMessage('Confirmando tu ticket y enviando el correo...');

      api.post(`/raffles/${raffleId}/confirm-wompi-purchase`, {
        txId: idTx,
        buyer_name: pendingData.buyerName,
        buyer_email: pendingData.buyerEmail,
        amount_paid: params.get('monto') || null,
      })
        .then(() => {
          localStorage.removeItem(pendingKey);
          sessionStorage.setItem(`wompi_finalized_${idTx}`, '1');
          setStatus('success');
        })
        .catch((err) => {
          setStatus('failed');
          setMessage(err.response?.data?.error || 'No se pudo confirmar el ticket.');
        });
    } else {
      setStatus('unknown');
    }
  }, [params]);

  const txId  = params.get('idTransaccion');
  const monto = params.get('monto');

  return (
    <div className="result-page">
      <div className="result-card">
        {status === 'loading' && (
          <div className="result-loading">
            <div className="result-spinner" />
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="result-icon success">✓</div>
            <h1 className="result-title success">¡Pago exitoso!</h1>
            <p className="result-msg">
              Tu ticket ha sido confirmado. Recibirás un <strong>correo electrónico</strong> con tu
              ticket en PDF en los próximos minutos.
            </p>
            {monto && (
              <div className="result-detail">
                <span>Monto pagado</span>
                <strong>${parseFloat(monto).toFixed(2)}</strong>
              </div>
            )}
            {txId && (
              <div className="result-detail">
                <span>ID de transacción</span>
                <code>{txId}</code>
              </div>
            )}
            <div className="result-note">
              📧 Revisa tu bandeja de entrada (y la carpeta de spam por si acaso).
            </div>
            <Link to="/" className="result-btn">Ver más rifas</Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="result-icon failed">✕</div>
            <h1 className="result-title failed">Pago no completado</h1>
            <p className="result-msg">
              El pago no fue procesado exitosamente. No se realizó ningún cargo.
              Puedes intentarlo de nuevo.
            </p>
            <Link to="/" className="result-btn">Volver al inicio</Link>
          </>
        )}

        {status === 'unknown' && (
          <>
            <div className="result-icon">🎟️</div>
            <h1 className="result-title">Estado de pago</h1>
            <p className="result-msg">
              Si realizaste un pago, recibirás tu ticket por correo electrónico una vez confirmado.
            </p>
            <Link to="/" className="result-btn">Ir al inicio</Link>
          </>
        )}
      </div>
    </div>
  );
}
