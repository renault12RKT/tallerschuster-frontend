// pages/NuevoTurno.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './NuevoTurno.css';

const TERMINOS = 'El cliente autoriza el ingreso del vehículo al taller para su revisión. El diagnóstico no implica reparación sin aprobación previa. El taller no se responsabiliza por objetos personales. Luego de 7 días sin retirar el vehículo se podrán generar costos de guarda.';

const HOY = new Date().toISOString().split('T')[0];

const TIPOS_SERVICE = [
  {
    id: 'basico',
    nombre: 'Mantenimiento Básico',
    km: 'Cada 1.000 – 3.000 km',
    items: [
      'Cambio de aceite y filtro de aceite',
      'Revisión de líquido refrigerante',
      'Limpieza y ajuste de cadena',
      'Revisión de presión de neumáticos',
      'Chequeo de frenos (pastillas, discos y líquido)',
    ],
  },
  {
    id: 'intermedio',
    nombre: 'Mantenimiento Intermedio',
    km: 'Cada 5.000 – 8.000 km',
    items: [
      'Cambio de filtro de aire',
      'Revisión de bujías y sistema de encendido',
      'Ajuste de válvulas (si aplica)',
      'Inspección del sistema eléctrico',
      'Lubricación de cables de acelerador y embrague',
    ],
  },
  {
    id: 'mayor',
    nombre: 'Mantenimiento Mayor',
    km: 'Cada 10.000 – 15.000 km o anual',
    items: [
      'Cambio de líquido de frenos y purga del sistema',
      'Cambio de filtro de combustible (si aplica)',
      'Revisión de amortiguadores y suspensión',
      'Chequeo de transmisión',
      'Diagnóstico ECU (motos con inyección electrónica)',
    ],
  },
];

export default function NuevoTurno({ onConfirmado, onVolver }) {
  // pasos: 1=tipo, 2=tipo_service(si aplica), 3=datos, 4=horario, 5=confirmación
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState('');
  const [tipoService, setTipoService] = useState('');
  const [preciosService, setPreciosService] = useState([]);
  const [form, setForm] = useState({
    nombre: '', telefono: '', marca_moto: '', modelo_moto: '',
    patente: '', descripcion: '', fecha: HOY, hora_inicio: ''
  });
  const [errores, setErrores] = useState({});
  const [horarios, setHorarios] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState('');

  useEffect(() => {
    api.getPreciosService().then(setPreciosService).catch(() => {});
  }, []);

  useEffect(() => {
    if (paso === 4 && form.fecha && tipo) cargarHorarios();
  }, [paso, form.fecha, tipo]);

  async function cargarHorarios() {
    setLoadingHorarios(true);
    setHorarios([]);
    setErrorGlobal('');
    try {
      const { disponibles, mensaje } = await api.getDisponibilidad(form.fecha, tipo);
      setHorarios(disponibles || []);
      if (mensaje) setErrorGlobal(mensaje);
    } catch (e) {
      setErrorGlobal('No se pudieron cargar los horarios. Verificá la conexión.');
    } finally {
      setLoadingHorarios(false);
    }
  }

  function validarDatos() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.telefono.trim()) e.telefono = 'Requerido';
    else if (!/^\+?[\d\s\-]{8,15}$/.test(form.telefono)) e.telefono = 'Número inválido';
    if (!form.marca_moto.trim()) e.marca_moto = 'Requerido';
    if (!form.modelo_moto.trim()) e.modelo_moto = 'Requerido';
    if (!form.patente.trim()) e.patente = 'Requerido';
    if (tipo === 'diagnostico' && !form.descripcion.trim()) e.descripcion = 'Describí el problema';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function handleCambio(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores(e => ({ ...e, [campo]: '' }));
  }

  function siguientePaso() {
    if (paso === 1) {
      if (tipo === 'service') return setPaso(2);
      return setPaso(3);
    }
    if (paso === 2) return setPaso(3);
    if (paso === 3) { if (validarDatos()) setPaso(4); }
    if (paso === 4) setPaso(5);
  }

  function anteriorPaso() {
    if (paso === 1) return onVolver();
    if (paso === 3 && tipo === 'service') return setPaso(2);
    if (paso === 3 && tipo === 'diagnostico') return setPaso(1);
    if (paso === 4 && tipo === 'diagnostico') return setPaso(3);
    if (paso === 5 && tipo === 'diagnostico') return setPaso(4);
    setPaso(p => p - 1);
  }

  async function confirmar() {
    if (!aceptoTerminos) return setErrorGlobal('Debés aceptar los términos y condiciones');
    if (!form.hora_inicio) return setErrorGlobal('Seleccioná un horario');
    setEnviando(true);
    setErrorGlobal('');
    try {
      const res = await api.crearTurno({ ...form, tipo_servicio: tipo, tipo_service: tipoService });
      onConfirmado(res.turno);
    } catch (e) {
      setErrorGlobal(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const duracion = tipo === 'service' ? '2 horas' : '1 hora';
  const totalPasos = tipo === 'service' ? 5 : 4;
  const pasoActual = tipo === 'service' ? paso : paso === 1 ? 1 : paso - 1;

  function getPrecio(id) {
    const p = preciosService.find(x => x.tipo === id);
    return p ? p.precio : null;
  }

  const serviceSeleccionado = TIPOS_SERVICE.find(s => s.id === tipoService);

  return (
    <div className="nuevo-turno">
      <div className="container">
        <header className="nt__header">
          <button className="nt__back" onClick={anteriorPaso}>
            ← {paso === 1 ? 'Inicio' : 'Atrás'}
          </button>
          <div className="nt__steps">
            {Array.from({length: totalPasos}).map((_, i) => (
              <div key={i} className={`nt__step ${pasoActual > i+1 ? 'nt__step--done' : ''} ${pasoActual === i+1 ? 'nt__step--active' : ''}`} />
            ))}
          </div>
        </header>

        {/* PASO 1: Elegir tipo */}
        {paso === 1 && (
          <div className="nt__section">
            <h2 className="nt__title">¿Qué servicio<br />necesitás?</h2>
            <div className="nt__opciones">
              <button className={`nt__opcion ${tipo === 'diagnostico' ? 'nt__opcion--sel' : ''}`}
                onClick={() => setTipo('diagnostico')}>
                <span className="nt__opcion-icon">🔍</span>
                <div>
                  <strong>Diagnóstico</strong>
                  <p>Detectamos el problema · 1 hora</p>
                </div>
              </button>
              <button className={`nt__opcion ${tipo === 'service' ? 'nt__opcion--sel' : ''}`}
                onClick={() => setTipo('service')}>
                <span className="nt__opcion-icon">⚙️</span>
                <div>
                  <strong>Service</strong>
                  <p>Mantenimiento general · 2 horas</p>
                </div>
              </button>
            </div>
            <button className="btn btn--primary btn--full" disabled={!tipo} onClick={siguientePaso}>
              Continuar →
            </button>
          </div>
        )}

        {/* PASO 2: Tipo de service (solo si eligió service) */}
        {paso === 2 && tipo === 'service' && (
          <div className="nt__section">
            <h2 className="nt__title">Tipo de<br />service</h2>
            <p className="nt__subtitle">Elegí según los kilómetros de tu moto</p>
            <div className="nt__aclaracion">
              ⚠️ El aceite y los recambios <strong>no están incluidos</strong> en el precio del service.
            </div>
            <div className="nt__servicios-lista">
              {TIPOS_SERVICE.map(s => {
                const precio = getPrecio(s.id);
                return (
                  <button key={s.id}
                    className={`nt__service-card ${tipoService === s.id ? 'nt__service-card--sel' : ''}`}
                    onClick={() => setTipoService(s.id)}>
                    <div className="nt__service-header">
                      <div>
                        <strong>{s.nombre}</strong>
                        <span className="nt__service-km">{s.km}</span>
                      </div>
                      {precio !== null && (
                        <span className="nt__service-precio">${Number(precio).toLocaleString()}</span>
                      )}
                    </div>
                    <ul className="nt__service-items">
                      {s.items.map((item, i) => (
                        <li key={i}>✓ {item}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <button className="btn btn--primary btn--full" disabled={!tipoService} onClick={siguientePaso}>
              Continuar →
            </button>
          </div>
        )}

        {/* PASO 3: Datos del cliente */}
        {paso === 3 && (
          <div className="nt__section">
            <h2 className="nt__title">Tus datos</h2>
            <div className="nt__form">
              <div className={`field ${errores.nombre ? 'field--error' : ''}`}>
                <label>Nombre y apellido</label>
                <input value={form.nombre} onChange={e => handleCambio('nombre', e.target.value)} placeholder="Juan Pérez" />
                {errores.nombre && <span className="error-msg">{errores.nombre}</span>}
              </div>
              <div className={`field ${errores.telefono ? 'field--error' : ''}`}>
                <label>WhatsApp</label>
                <input value={form.telefono} onChange={e => handleCambio('telefono', e.target.value)}
                  placeholder="+54 9 362 000-0000" type="tel" />
                {errores.telefono && <span className="error-msg">{errores.telefono}</span>}
              </div>
              <div className="nt__row">
                <div className={`field ${errores.marca_moto ? 'field--error' : ''}`}>
                  <label>Marca</label>
                  <input value={form.marca_moto} onChange={e => handleCambio('marca_moto', e.target.value)} placeholder="Honda" />
                  {errores.marca_moto && <span className="error-msg">{errores.marca_moto}</span>}
                </div>
                <div className={`field ${errores.modelo_moto ? 'field--error' : ''}`}>
                  <label>Modelo</label>
                  <input value={form.modelo_moto} onChange={e => handleCambio('modelo_moto', e.target.value)} placeholder="Titan 150" />
                  {errores.modelo_moto && <span className="error-msg">{errores.modelo_moto}</span>}
                </div>
              </div>
              <div className={`field ${errores.patente ? 'field--error' : ''}`}>
                <label>Patente</label>
                <input value={form.patente} onChange={e => handleCambio('patente', e.target.value.toUpperCase())}
                  placeholder="AB123CD" style={{textTransform:'uppercase'}} />
                {errores.patente && <span className="error-msg">{errores.patente}</span>}
              </div>
              <div className={`field ${errores.descripcion ? 'field--error' : ''}`}>
                <label>{tipo === 'diagnostico' ? 'Descripción del problema *' : 'Observaciones (opcional)'}</label>
                <textarea value={form.descripcion} onChange={e => handleCambio('descripcion', e.target.value)}
                  placeholder={tipo === 'diagnostico' ? 'Ej: No arranca, hace ruido raro al frenar...' : 'Alguna observación adicional...'} />
                {errores.descripcion && <span className="error-msg">{errores.descripcion}</span>}
              </div>
            </div>
            <button className="btn btn--primary btn--full" onClick={siguientePaso}>
              Elegir horario →
            </button>
          </div>
        )}

        {/* PASO 4: Horario */}
        {paso === 4 && (
          <div className="nt__section">
            <h2 className="nt__title">Elegí tu horario</h2>
            <p className="nt__subtitle">Duración: <strong>{duracion}</strong></p>

            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha}
                min={(() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })()}
                onChange={e => { handleCambio('fecha', e.target.value); handleCambio('hora_inicio', ''); setHorarios([]); }} />
            </div>

            {loadingHorarios && <div className="spinner" />}

            {!loadingHorarios && errorGlobal && (
              <div className="alert alert--info" style={{marginTop:16}}>{errorGlobal}</div>
            )}

            {!loadingHorarios && !errorGlobal && horarios.length === 0 && form.fecha && (
              <div className="alert alert--info" style={{marginTop:16}}>
                No hay horarios disponibles para este día. Probá con otra fecha.
              </div>
            )}

            {!loadingHorarios && horarios.length > 0 && (
              <div className="nt__horarios">
                <p className="nt__horarios-label">Horarios disponibles</p>
                <div className="nt__horarios-grid">
                  {horarios.map(h => (
                    <button key={h}
                      className={`nt__hora-btn ${form.hora_inicio === h ? 'nt__hora-btn--sel' : ''}`}
                      onClick={() => handleCambio('hora_inicio', h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn--primary btn--full" disabled={!form.hora_inicio} onClick={siguientePaso}>
              Revisar turno →
            </button>
          </div>
        )}

        {/* PASO 5: Confirmación */}
        {paso === 5 && (
          <div className="nt__section">
            <h2 className="nt__title">Confirmá tu turno</h2>
            <div className="nt__resumen card">
              <div className="nt__resumen-row">
                <span>Servicio</span>
                <strong>{tipo === 'diagnostico' ? '🔍 Diagnóstico' : '⚙️ Service'}</strong>
              </div>
              {serviceSeleccionado && (
                <div className="nt__resumen-row">
                  <span>Tipo</span>
                  <strong>{serviceSeleccionado.nombre}</strong>
                </div>
              )}
              {serviceSeleccionado && getPrecio(tipoService) && (
                <div className="nt__resumen-row">
                  <span>Precio</span>
                  <strong>${Number(getPrecio(tipoService)).toLocaleString()} <span style={{fontWeight:400,fontSize:'0.8rem'}}>(sin aceite ni recambios)</span></strong>
                </div>
              )}
              <div className="nt__resumen-row">
                <span>Cliente</span>
                <strong>{form.nombre}</strong>
              </div>
              <div className="nt__resumen-row">
                <span>WhatsApp</span>
                <strong>{form.telefono}</strong>
              </div>
              <div className="nt__resumen-row">
                <span>Moto</span>
                <strong>{form.marca_moto} {form.modelo_moto} · {form.patente}</strong>
              </div>
              <div className="nt__resumen-row">
                <span>Fecha</span>
                <strong>{formatearFecha(form.fecha)}</strong>
              </div>
              <div className="nt__resumen-row">
                <span>Horario</span>
                <strong>{form.hora_inicio} hs ({duracion})</strong>
              </div>
              {form.descripcion && (
                <div className="nt__resumen-row">
                  <span>Descripción</span>
                  <strong>{form.descripcion}</strong>
                </div>
              )}
            </div>

            <div className="nt__terminos">
              <label className="nt__checkbox">
                <input type="checkbox" checked={aceptoTerminos} onChange={e => setAceptoTerminos(e.target.checked)} />
                <span className="nt__checkmark" />
                <p className="nt__terminos-text">{TERMINOS}</p>
              </label>
            </div>

            {errorGlobal && <div className="alert alert--error">{errorGlobal}</div>}

            <button className="btn btn--primary btn--full" disabled={!aceptoTerminos || enviando} onClick={confirmar}>
              {enviando ? 'Reservando...' : 'CONFIRMAR TURNO ✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatearFecha(fecha) {
  const [y, m, d] = fecha.split('-');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dt = new Date(y, m - 1, d);
  return `${dias[dt.getDay()]} ${d} de ${meses[m-1]} ${y}`;
}
