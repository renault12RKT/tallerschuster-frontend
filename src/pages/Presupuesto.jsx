// pages/Presupuesto.jsx - Página pública para que el cliente acepte/rechace presupuesto
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './Presupuesto.css';

export default function Presupuesto({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [respondido, setRespondido] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) return setError('Link inválido');
    api.getPresupuesto(token)
      .then(setData)
      .catch(() => setError('Presupuesto no encontrado o link inválido'))
      .finally(() => setLoading(false));
  }, [token]);

  async function responder(decision) {
    setEnviando(true);
    try {
      await api.responderPresupuesto(token, decision);
      setRespondido(decision);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="pres-pub"><div className="spinner" /></div>;
  if (error) return (
    <div className="pres-pub">
      <div className="container">
        <div className="alert alert--error">{error}</div>
      </div>
    </div>
  );

  const yaRespondido = data.estado !== 'pendiente' || respondido;
  const decision = respondido || data.estado;

  return (
    <div className="pres-pub">
      <div className="container">
        <div className="pres-pub__header">
          <div className="pres-pub__logo">🔧</div>
          <h1 className="pres-pub__title">TALLER SCHUSTER</h1>
          <p className="pres-pub__sub">Presupuesto de reparación</p>
        </div>

        <div className="card pres-pub__cliente">
          <div className="pres-pub__row">
            <span>Cliente</span><strong>{data.nombre}</strong>
          </div>
          <div className="pres-pub__row">
            <span>Vehículo</span><strong>{data.marca_moto} {data.modelo_moto} · {data.patente}</strong>
          </div>
        </div>

        <div className="card pres-pub__detalle">
          <h3 className="pres-pub__detalle-title">Detalle del trabajo</h3>
          <p className="pres-pub__descripcion">{data.descripcion_trabajo}</p>
          {data.materiales && (
            <div className="pres-pub__materiales">
              <span>Materiales / repuestos:</span>
              <p>{data.materiales}</p>
            </div>
          )}
        </div>

        <div className="card pres-pub__precio">
          <div className="pres-pub__precio-label">Total a pagar</div>
          <div className="pres-pub__precio-num">${data.precio_total?.toLocaleString()}</div>
          <div className="pres-pub__tiempo">
            ⏱ Tiempo estimado: {data.tiempo_estimado_dias} día{data.tiempo_estimado_dias > 1 ? 's' : ''}
          </div>
        </div>

        {yaRespondido ? (
          <div className={`pres-pub__resultado ${decision === 'aceptado' ? 'pres-pub__resultado--ok' : 'pres-pub__resultado--no'}`}>
            {decision === 'aceptado'
              ? '✓ Presupuesto aceptado — El taller va a coordinar la reparación con vos.'
              : '✕ Presupuesto rechazado — Gracias, el taller se contactará con vos.'}
          </div>
        ) : (
          <div className="pres-pub__acciones">
            <p className="pres-pub__aviso">
              Al aceptar el presupuesto, autorizás al taller a proceder con la reparación descripta por el precio indicado.
            </p>
            <button className="btn btn--success btn--full" disabled={enviando}
              onClick={() => responder('aceptado')}>
              ✓ ACEPTAR PRESUPUESTO
            </button>
            <button className="btn btn--danger btn--full" disabled={enviando}
              onClick={() => responder('rechazado')}>
              ✕ Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
