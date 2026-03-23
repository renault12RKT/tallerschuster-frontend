// pages/Confirmacion.jsx
import React from 'react';
import './Confirmacion.css';

const TEL_TALLER = '3735582128';

export default function Confirmacion({ turno, onVolver }) {
  if (!turno) return null;

  const tipoLabel = turno.tipo_servicio === 'diagnostico' ? 'Diagnóstico' : 'Service';
  const duracion = turno.tipo_servicio === 'service' ? '2 horas' : '1 hora';

  function abrirWA() {
    const msg = `Hola! Quería consultar sobre mi turno del ${turno.fecha} a las ${turno.hora_inicio} hs.`;
    const url = `https://wa.me/54${TEL_TALLER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="confirmacion">
      <div className="container">
        <div className="conf__check">✓</div>
        <h1 className="conf__title">¡Turno<br />confirmado!</h1>
        <p className="conf__sub">Te esperamos en el taller</p>

        <div className="card conf__card">
          <div className="conf__row">
            <span>Servicio</span>
            <strong>{tipoLabel}</strong>
          </div>
          <div className="conf__row">
            <span>Fecha</span>
            <strong>{formatFecha(turno.fecha)}</strong>
          </div>
          <div className="conf__row">
            <span>Horario</span>
            <strong>{turno.hora_inicio} hs ({duracion})</strong>
          </div>
          <div className="conf__row">
            <span>Moto</span>
            <strong>{turno.marca_moto} {turno.modelo_moto}</strong>
          </div>
          <div className="conf__row">
            <span>Patente</span>
            <strong>{turno.patente}</strong>
          </div>
        </div>

        <div className="conf__aviso card">
          <p className="conf__aviso-titulo">¿Necesitás cancelar o modificar el turno?</p>
          <p className="conf__aviso-texto">Contactate con nosotros por WhatsApp:</p>
          <button className="conf__wa-btn" onClick={abrirWA}>
            <span className="conf__wa-icon">💬</span>
            <div>
              <span className="conf__wa-label">Escribinos al</span>
              <span className="conf__wa-tel">{TEL_TALLER}</span>
            </div>
          </button>
        </div>

        <button className="btn btn--secondary btn--full conf__volver" onClick={onVolver}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

function formatFecha(fecha) {
  const [y, m, d] = fecha.split('-');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const dt = new Date(y, m - 1, d);
  return `${dias[dt.getDay()]} ${d} de ${meses[m-1]}`;
}
