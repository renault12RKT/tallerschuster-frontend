// pages/ConsultaMoto.jsx - Página pública para que el cliente consulte su moto
import React, { useState } from 'react';
import { api } from '../utils/api';
import './ConsultaMoto.css';

const ESTADOS = {
  pendiente: { label: 'Turno pendiente de confirmar', emoji: '⏳', color: 'warning' },
  confirmado: { label: 'Turno confirmado', emoji: '✅', color: 'success' },
  en_revision: { label: 'Moto en revisión', emoji: '🔍', color: 'info' },
  esperando_aprobacion: { label: 'Esperando tu aprobación del presupuesto', emoji: '📋', color: 'warning' },
  en_reparacion: { label: 'Moto en reparación', emoji: '🔧', color: 'info' },
  finalizado: { label: '¡Tu moto está lista para retirar!', emoji: '✅', color: 'success' },
  entregado: { label: 'Moto entregada', emoji: '🏁', color: 'neutral' },
  completado: { label: 'Servicio completado — podés retirarlo', emoji: '✅', color: 'success' },
  sin_reparacion: { label: 'Sin reparación necesaria — podés retirarla', emoji: '✅', color: 'success' },
  no_presentado: { label: 'No se registró tu visita', emoji: '❓', color: 'danger' },
};

export default function ConsultaMoto({ onVolver }) {
  const [patente, setPatente] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function consultar() {
    if (!patente.trim()) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const data = await api.getEstadoMoto(patente.trim());
      setResultado(data);
    } catch(e) {
      setError('No se encontró ninguna moto activa con esa patente.');
    } finally {
      setLoading(false);
    }
  }

  const estado = resultado ? (ESTADOS[resultado.estado] || { label: resultado.estado, emoji: '❓', color: 'neutral' }) : null;

  return (
    <div className="consulta">
      <div className="container">
        <button className="nt__back" onClick={onVolver}>← Inicio</button>
        <h2 className="consulta__title">Consultá tu moto</h2>
        <p className="consulta__sub">Ingresá la patente para ver el estado actual</p>

        <div className="consulta__form">
          <input
            value={patente}
            onChange={e => setPatente(e.target.value.toUpperCase())}
            placeholder="Ej: AB123CD"
            onKeyDown={e => e.key === 'Enter' && consultar()}
            style={{textTransform:'uppercase'}}
          />
          <button className="btn btn--primary" onClick={consultar} disabled={loading || !patente.trim()}>
            {loading ? '...' : 'Consultar'}
          </button>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {resultado && (
          <div className={`consulta__resultado consulta__resultado--${estado.color}`}>
            <div className="consulta__emoji">{estado.emoji}</div>
            <div className="consulta__moto">{resultado.moto} · {resultado.patente}</div>
            <div className="consulta__estado">{estado.label}</div>
            <div className="consulta__fecha">
              Última actualización: {new Date(resultado.ultima_actualizacion).toLocaleDateString('es-AR')}
            </div>
            <a href={resultado.wa_consulta} target="_blank" rel="noreferrer"
              className="btn btn--wa consulta__wa-btn">
              💬 Consultar por WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
