// pages/NuevoTurno.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './NuevoTurno.css';

const TERMINOS = 'El cliente autoriza el ingreso del vehículo al taller para su revisión. El diagnóstico no implica reparación sin aprobación previa. El taller no se responsabiliza por objetos personales. Luego de 7 días sin retirar el vehículo se podrán generar costos de guarda.';

const CILINDRADAS = [
  { id: 'baja',  label: 'Baja cilindrada',  sub: 'Hasta 250cc' },
  { id: 'media', label: 'Media cilindrada', sub: '250cc – 600cc' },
  { id: 'alta',  label: 'Alta cilindrada',  sub: 'Más de 600cc' },
];

function manana() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Pasos según tipo:
//   diagnóstico: 1(tipo) → 3(datos) → 4(horario) → 5(confirm)
//   servicio:    1(tipo) → 2(cilindrada) → 2b(mantenimiento) → 3(datos) → 4(horario) → 5(confirm)
// Para simplificar usamos un array de pasos activos

export default function NuevoTurno({ onConfirmado, onVolver }) {
  const [tipo, setTipo]                 = useState('');        // 'service' | 'diagnostico'
  const [cilindrada, setCilindrada]     = useState('');        // 'baja' | 'media' | 'alta'
  const [mantSelec, setMantSelec]       = useState(null);      // objeto de precios_service
  const [mantsDisp, setMantsDisp]       = useState([]);        // mantenimientos para cilindrada elegida
  const [todosPrecios, setTodosPrecios] = useState([]);
  const [paso, setPaso]                 = useState(1);
  // paso 1 = tipo, 2 = cilindrada, 3 = mantenimiento, 4 = datos, 5 = horario, 6 = confirmación
  // (para diagnóstico: 1 → 4 → 5 → 6)

  const [form, setForm] = useState({
    nombre: '', telefono: '', marca_moto: '', modelo_moto: '',
    patente: '', descripcion: '', fecha: manana(), hora_inicio: ''
  });
  const [errores,       setErrores]       = useState({});
  const [horarios,      setHorarios]      = useState([]);
  const [loadingHoras,  setLoadingHoras]  = useState(false);
  const [aceptoTerm,    setAceptoTerm]    = useState(false);
  const [enviando,      setEnviando]      = useState(false);
  const [errorGlobal,   setErrorGlobal]   = useState('');

  // Load precios al montar
  useEffect(() => {
    api.getPreciosService()
      .then(data => setTodosPrecios(Array.isArray(data) ? data : []))
      .catch(() => setTodosPrecios([]));
  }, []);

  // Cuando cambia cilindrada, filtrar mantenimientos
  useEffect(() => {
    if (!cilindrada || !todosPrecios.length) return;
    const items = todosPrecios.filter(p => p.cilindrada === cilindrada);
    setMantsDisp(items);
    setMantSelec(null);
  }, [cilindrada, todosPrecios]);

  // Cargar horarios cuando llega al paso 5
  useEffect(() => {
    if (paso === 5 && form.fecha && tipo) cargarHorarios();
  }, [paso, form.fecha]);

  async function cargarHorarios() {
    setLoadingHoras(true);
    setHorarios([]);
    setErrorGlobal('');
    try {
      const { disponibles, mensaje } = await api.getDisponibilidad(form.fecha, tipo);
      setHorarios(disponibles || []);
      if (mensaje) setErrorGlobal(mensaje);
    } catch(e) {
      setErrorGlobal('No se pudieron cargar los horarios.');
    } finally {
      setLoadingHoras(false);
    }
  }

  function validarDatos() {
    const e = {};
    if (!form.nombre.trim())    e.nombre    = 'Requerido';
    if (!form.telefono.trim())  e.telefono  = 'Requerido';
    if (!form.marca_moto.trim()) e.marca_moto = 'Requerido';
    if (!form.modelo_moto.trim()) e.modelo_moto = 'Requerido';
    if (!form.patente.trim())   e.patente   = 'Requerido';
    if (tipo === 'diagnostico' && !form.descripcion.trim()) e.descripcion = 'Describí el problema';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores(e => ({ ...e, [campo]: '' }));
  }

  function siguiente() {
    if (paso === 1) {
      return tipo === 'service' ? setPaso(2) : setPaso(4);
    }
    if (paso === 2) return setPaso(3);
    if (paso === 3) return setPaso(4);
    if (paso === 4) { if (validarDatos()) setPaso(5); }
    if (paso === 5) setPaso(6);
  }

  function atras() {
    if (paso === 1) return onVolver();
    if (paso === 2) { setCilindrada(''); return setPaso(1); }
    if (paso === 3) return setPaso(2);
    if (paso === 4) return tipo === 'service' ? setPaso(3) : setPaso(1);
    if (paso === 5) return setPaso(4);
    if (paso === 6) return setPaso(5);
  }

  async function confirmar() {
    if (!aceptoTerm) return setErrorGlobal('Debés aceptar los términos y condiciones');
    if (!form.hora_inicio) return setErrorGlobal('Seleccioná un horario');
    setEnviando(true);
    setErrorGlobal('');
    try {
      const tipo_service = mantSelec ? `${cilindrada}_${mantSelec.mantenimiento}` : '';
      const res = await api.crearTurno({ ...form, tipo_servicio: tipo, tipo_service });
      onConfirmado(res.turno);
    } catch(e) {
      setErrorGlobal(e.message);
    } finally {
      setEnviando(false);
    }
  }

  // Calcular barra de progreso
  const totalPasos = tipo === 'service' ? 6 : 4;
  const pasoVisual = tipo === 'service' ? paso : paso <= 1 ? 1 : paso - 2;
  const duracion = tipo === 'service' ? '2 horas' : '1 hora';

  return (
    <div className="nuevo-turno">
      <div className="container">
        <header className="nt__header">
          <button className="nt__back" onClick={atras}>
            ← {paso === 1 ? 'Inicio' : 'Atrás'}
          </button>
          <div className="nt__steps">
            {Array.from({ length: totalPasos }).map((_, i) => (
              <div key={i} className={`nt__step
                ${pasoVisual > i + 1 ? 'nt__step--done' : ''}
                ${pasoVisual === i + 1 ? 'nt__step--active' : ''}`} />
            ))}
          </div>
        </header>

        {/* ── PASO 1: Tipo ── */}
        {paso === 1 && (
          <div className="nt__section">
            <h2 className="nt__title">¿Qué servicio<br />necesitás?</h2>
            <div className="nt__opciones">
              <button className={`nt__opcion ${tipo === 'diagnostico' ? 'nt__opcion--sel' : ''}`}
                onClick={() => setTipo('diagnostico')}>
                <span className="nt__opcion-icon">🔍</span>
                <div><strong>Diagnóstico</strong><p>Detectamos el problema · 1 hora (aprox)</p></div>
              </button>
              <button className={`nt__opcion ${tipo === 'service' ? 'nt__opcion--sel' : ''}`}
                onClick={() => setTipo('service')}>
                <span className="nt__opcion-icon">⚙️</span>
                <div><strong>Servicio</strong><p>Mantenimiento del vehículo · 2 horas (aprox)</p></div>
              </button>
            </div>
            <button className="btn btn--primary btn--full" disabled={!tipo} onClick={siguiente}>Continuar →</button>
          </div>
        )}

        {/* ── PASO 2: Cilindrada ── */}
        {paso === 2 && (
          <div className="nt__section">
            <h2 className="nt__title">¿Qué cilindrada<br />tiene tu moto?</h2>
            <div className="nt__aclaracion">
              ⚠️ El aceite y los recambios <strong>no están incluidos</strong> en el precio.
            </div>
            <div className="nt__opciones">
              {CILINDRADAS.map(c => (
                <button key={c.id}
                  className={`nt__opcion ${cilindrada === c.id ? 'nt__opcion--sel' : ''}`}
                  onClick={() => setCilindrada(c.id)}>
                  <span className="nt__opcion-icon">🏍️</span>
                  <div><strong>{c.label}</strong><p>{c.sub}</p></div>
                </button>
              ))}
            </div>
            <button className="btn btn--primary btn--full" disabled={!cilindrada} onClick={siguiente}>Continuar →</button>
          </div>
        )}

        {/* ── PASO 3: Tipo de mantenimiento ── */}
        {paso === 3 && (
          <div className="nt__section">
            <h2 className="nt__title">Tipo de<br />mantenimiento</h2>
            <p className="nt__subtitle">
              {CILINDRADAS.find(c => c.id === cilindrada)?.label} · {CILINDRADAS.find(c => c.id === cilindrada)?.sub}
            </p>

            {mantsDisp.length === 0 ? (
              <div className="alert alert--info">Cargando opciones...</div>
            ) : (
              <div className="nt__servicios-lista">
                {mantsDisp.map(m => {
                  const items = m.detalles ? m.detalles.split('|') : [];
                  const selec = mantSelec?.id === m.id;
                  return (
                    <button key={m.id}
                      className={`nt__service-card ${selec ? 'nt__service-card--sel' : ''}`}
                      onClick={() => setMantSelec(m)}>
                      <div className="nt__service-header">
                        <strong>{m.nombre_mantenimiento}</strong>
                        <span className="nt__service-precio">${Number(m.precio).toLocaleString()}</span>
                      </div>
                      {items.length > 0 && (
                        <ul className="nt__service-items">
                          {items.map((item, i) => <li key={i}>✓ {item}</li>)}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button className="btn btn--primary btn--full" disabled={!mantSelec} onClick={siguiente}>Continuar →</button>
          </div>
        )}

        {/* ── PASO 4: Datos ── */}
        {paso === 4 && (
          <div className="nt__section">
            <h2 className="nt__title">Tus datos</h2>
            <div className="nt__form">
              <div className={`field ${errores.nombre ? 'field--error' : ''}`}>
                <label>Nombre y apellido</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Pérez" />
                {errores.nombre && <span className="error-msg">{errores.nombre}</span>}
              </div>
              <div className={`field ${errores.telefono ? 'field--error' : ''}`}>
                <label>WhatsApp</label>
                <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+54 9 362 000-0000" type="tel" />
                {errores.telefono && <span className="error-msg">{errores.telefono}</span>}
              </div>
              <div className="nt__row">
                <div className={`field ${errores.marca_moto ? 'field--error' : ''}`}>
                  <label>Marca</label>
                  <input value={form.marca_moto} onChange={e => set('marca_moto', e.target.value)} placeholder="Honda" />
                  {errores.marca_moto && <span className="error-msg">{errores.marca_moto}</span>}
                </div>
                <div className={`field ${errores.modelo_moto ? 'field--error' : ''}`}>
                  <label>Modelo</label>
                  <input value={form.modelo_moto} onChange={e => set('modelo_moto', e.target.value)} placeholder="Titan 150" />
                  {errores.modelo_moto && <span className="error-msg">{errores.modelo_moto}</span>}
                </div>
              </div>
              <div className={`field ${errores.patente ? 'field--error' : ''}`}>
                <label>Patente</label>
                <input value={form.patente} onChange={e => set('patente', e.target.value.toUpperCase())}
                  placeholder="AB123CD" style={{textTransform:'uppercase'}} />
                {errores.patente && <span className="error-msg">{errores.patente}</span>}
              </div>
              <div className={`field ${errores.descripcion ? 'field--error' : ''}`}>
                <label>{tipo === 'diagnostico' ? 'Descripción del problema *' : 'Observaciones (opcional)'}</label>
                <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  placeholder={tipo === 'diagnostico' ? 'Ej: No arranca, hace ruido raro...' : 'Alguna observación adicional...'} />
                {errores.descripcion && <span className="error-msg">{errores.descripcion}</span>}
              </div>
            </div>
            <button className="btn btn--primary btn--full" onClick={siguiente}>Elegir horario →</button>
          </div>
        )}

        {/* ── PASO 5: Horario ── */}
        {paso === 5 && (
          <div className="nt__section">
            <h2 className="nt__title">Elegí tu horario</h2>
            <p className="nt__subtitle">Duración: <strong>{duracion}</strong></p>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} min={manana()}
                onChange={e => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  if (d.getDay() === 0) { setErrorGlobal('No atendemos los domingos.'); return; }
                  setErrorGlobal('');
                  set('fecha', e.target.value);
                  set('hora_inicio', '');
                  setHorarios([]);
                }} />
            </div>
            {loadingHoras && <div className="spinner" />}
            {!loadingHoras && errorGlobal && <div className="alert alert--info" style={{marginTop:16}}>{errorGlobal}</div>}
            {!loadingHoras && !errorGlobal && horarios.length === 0 && form.fecha && (
              <div className="alert alert--info" style={{marginTop:16}}>No hay horarios disponibles. Probá otra fecha.</div>
            )}
            {!loadingHoras && horarios.length > 0 && (
              <div className="nt__horarios">
                <p className="nt__horarios-label">Horarios disponibles</p>
                <div className="nt__horarios-grid">
                  {horarios.map(h => (
                    <button key={h}
                      className={`nt__hora-btn ${form.hora_inicio === h ? 'nt__hora-btn--sel' : ''}`}
                      onClick={() => set('hora_inicio', h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn--primary btn--full" disabled={!form.hora_inicio} onClick={siguiente}>
              Revisar turno →
            </button>
          </div>
        )}

        {/* ── PASO 6: Confirmación ── */}
        {paso === 6 && (
          <div className="nt__section">
            <h2 className="nt__title">Confirmá tu turno</h2>
            <div className="nt__resumen card">
              <div className="nt__resumen-row"><span>Servicio</span><strong>{tipo === 'diagnostico' ? '🔍 Diagnóstico' : '⚙️ Servicio'}</strong></div>
              {mantSelec && <>
                <div className="nt__resumen-row"><span>Cilindrada</span><strong>{CILINDRADAS.find(c => c.id === cilindrada)?.label}</strong></div>
                <div className="nt__resumen-row"><span>Mantenimiento</span><strong>{mantSelec.nombre_mantenimiento}</strong></div>
                <div className="nt__resumen-row">
                  <span>Precio</span>
                  <strong>${Number(mantSelec.precio).toLocaleString()} <span style={{fontWeight:400,fontSize:'0.8rem'}}>(sin aceite ni recambios)</span></strong>
                </div>
              </>}
              <div className="nt__resumen-row"><span>Cliente</span><strong>{form.nombre}</strong></div>
              <div className="nt__resumen-row"><span>WhatsApp</span><strong>{form.telefono}</strong></div>
              <div className="nt__resumen-row"><span>Moto</span><strong>{form.marca_moto} {form.modelo_moto} · {form.patente}</strong></div>
              <div className="nt__resumen-row"><span>Fecha</span><strong>{formatFecha(form.fecha)}</strong></div>
              <div className="nt__resumen-row"><span>Horario</span><strong>{form.hora_inicio} hs ({duracion})</strong></div>
              {form.descripcion && <div className="nt__resumen-row"><span>Descripción</span><strong>{form.descripcion}</strong></div>}
            </div>
            <div className="nt__terminos">
              <label className="nt__checkbox">
                <input type="checkbox" checked={aceptoTerm} onChange={e => setAceptoTerm(e.target.checked)} />
                <span className="nt__checkmark" />
                <p className="nt__terminos-text">{TERMINOS}</p>
              </label>
            </div>
            {errorGlobal && <div className="alert alert--error">{errorGlobal}</div>}
            <button className="btn btn--primary btn--full" disabled={!aceptoTerm || enviando} onClick={confirmar}>
              {enviando ? 'Reservando...' : 'CONFIRMAR TURNO ✓'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function formatFecha(fecha) {
  if (!fecha) return '';
  const [y, m, d] = fecha.split('-');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${dias[dt.getDay()]} ${d} de ${meses[m-1]} ${y}`;
}
