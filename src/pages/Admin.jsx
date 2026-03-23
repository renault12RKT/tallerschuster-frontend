// pages/Admin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import Login from './Login';
import './Admin.css';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'turnos', label: '📅 Turnos' },
  { id: 'activos', label: '🏍️ Activos' },
  { id: 'diagnosticos', label: '🔍 Diagnósticos' },
  { id: 'presupuestos', label: '💰 Presupuestos' },
  { id: 'reparaciones', label: '🔧 Reparaciones' },
  { id: 'historial', label: '📋 Historial' },
  { id: 'precios', label: '🏷️ Precios' },
];

// Abre WhatsApp con el link dado
function abrirWA(url) {
  if (url) window.open(url, '_blank');
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem('admin_auth') === '1'
  );
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (autenticado) cargarCounts();
    const interval = setInterval(() => { if (autenticado) cargarCounts(); }, 30000);
    return () => clearInterval(interval);
  }, [autenticado]);

  async function cargarCounts() {
    try {
      const [dash, activos, diags, pres, reps, turnosCount] = await Promise.all([
        api.getDashboard(),
        api.getServiciosActivos(),
        api.getDiagnosticos(),
        api.getPresupuestos(),
        api.getReparaciones(),
        api.getTurnosCount(),
      ]);
      setCounts({
        turnos: turnosCount.count,
        activos: activos.length + (dash.reparaciones_activas?.length || 0),
        diagnosticos: diags.filter(d => !['completado','sin_reparacion'].includes(d.estado)).length,
        presupuestos: pres.filter(p => p.estado === 'pendiente').length,
        reparaciones: reps.filter(r => !['finalizado','entregado'].includes(r.estado)).length,
      });
    } catch(e) {}
  }

  function cerrarSesion() {
    sessionStorage.removeItem('admin_auth');
    setAutenticado(false);
  }

  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  return (
    <div className="admin">
      <header className="admin__header">
        <div className="container--wide admin__header-inner">
          <div className="admin__logo"><img src="/logo-taller.png" alt="Taller Schuster" className="admin__logo-img" /> Taller Schuster</div>
          <div style={{display:'flex',gap:8}}>
            <button className="admin__exit" onClick={cerrarSesion}>Cerrar sesión</button>
            <button className="admin__exit" onClick={() => window.location.hash = ''}>Salir</button>
          </div>
        </div>
      </header>

      <nav className="admin__nav">
        <div className="container--wide admin__nav-inner">
          {TABS.map(t => {
            const count = counts[t.id];
            return (
              <button key={t.id}
                className={`admin__nav-btn ${tab === t.id ? 'admin__nav-btn--active' : ''}`}
                onClick={() => setTab(t.id)}>
                {t.label}
                {count > 0 && <span className="admin__nav-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="container--wide admin__main">
        {tab === 'dashboard'    && <Dashboard />}
        {tab === 'turnos'       && <Turnos />}
        {tab === 'activos'      && <ServiciosActivos />}
        {tab === 'diagnosticos' && <Diagnosticos />}
        {tab === 'presupuestos' && <Presupuestos />}
        {tab === 'reparaciones' && <Reparaciones />}
        {tab === 'historial'    && <Historial />}
        {tab === 'precios'      && <Precios />}
      </main>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const { turnos_hoy, reparaciones_activas, services_activos, capacidad_taller, diagnosticos_pendientes, presupuestos_esperando } = data;

  return (
    <div className="dash">
      <h2 className="admin__title">Hoy — {fechaHoy()}</h2>

      <div className="dash__stats">
        <div className="dash__stat">
          <span className="dash__stat-num">{turnos_hoy.length}</span>
          <span className="dash__stat-label">Turnos hoy</span>
        </div>
        <div className="dash__stat">
          <span className="dash__stat-num">{capacidad_taller.usada}<span className="dash__stat-de">/3</span></span>
          <span className="dash__stat-label">Espacio ocupado</span>
        </div>
        <div className="dash__stat">
          <span className="dash__stat-num">{diagnosticos_pendientes}</span>
          <span className="dash__stat-label">Diagnósticos pend.</span>
        </div>
        <div className="dash__stat">
          <span className="dash__stat-num">{presupuestos_esperando}</span>
          <span className="dash__stat-label">Presup. sin resp.</span>
        </div>
      </div>

      <div className="card dash__capacidad">
        <div className="dash__cap-header">
          <span>Capacidad del taller</span>
          <strong>{capacidad_taller.usada}/3 espacios</strong>
        </div>
        <div className="dash__cap-bar">
          {[0,1,2].map(i => (
            <div key={i} className={`dash__cap-slot ${i < capacidad_taller.usada ? 'dash__cap-slot--ocupado' : ''}`}>
              {i < capacidad_taller.usada ? '🏍️' : '○'}
            </div>
          ))}
        </div>
        {capacidad_taller.usada >= 3 && (
          <div className="alert alert--error" style={{marginTop:12,fontSize:'0.85rem'}}>
            ⚠️ Taller lleno — no se pueden aceptar nuevas motos
          </div>
        )}
      </div>

      <h3 className="admin__subtitle">Turnos del día</h3>
      {turnos_hoy.length === 0
        ? <p className="admin__empty">No hay turnos para hoy</p>
        : turnos_hoy.map(t => <TurnoCard key={t.id} turno={t} compact />)
      }

      {(reparaciones_activas.length > 0 || services_activos.length > 0) && (
        <>
          <h3 className="admin__subtitle">Motos en el taller ahora</h3>
          {services_activos.map(s => (
            <div key={s.id} className="card dash__rep-card">
              <div className="dash__rep-info">
                <strong>{s.marca_moto} {s.modelo_moto} · {s.patente}</strong>
                <span>{s.nombre} — Service · {s.fecha}</span>
              </div>
              <Badge estado="confirmado" />
            </div>
          ))}
          {reparaciones_activas.map(r => (
            <div key={r.id} className="card dash__rep-card">
              <div className="dash__rep-info">
                <strong>{r.marca_moto} {r.modelo_moto} · {r.patente}</strong>
                <span>{r.nombre} — Reparación</span>
              </div>
              <Badge estado={r.estado} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── TURNOS ───────────────────────────────────────────────────────────────────
function Turnos() {
  const [turnos, setTurnos] = useState([]);
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTurnos(fecha).then(setTurnos).finally(() => setLoading(false));
  }, [fecha]);

  async function cambiarEstado(id, estado) {
    const res = await api.updateTurno(id, { estado });
    setTurnos(ts => ts.map(t => t.id === id ? { ...t, estado, wa_cliente: res.wa_cliente } : t));
  }

  return (
    <div>
      <div className="admin__toolbar">
        <h2 className="admin__title">Gestión de turnos</h2>
        <input type="date" className="admin__date-filter"
          value={fecha} onChange={e => setFecha(e.target.value)} />
      </div>
      {loading ? <div className="spinner" /> : (
        turnos.length === 0
          ? <p className="admin__empty">No hay turnos {fecha ? 'para esta fecha' : ''}</p>
          : turnos.map(t => (
            <TurnoCard key={t.id} turno={t} onEstado={(e) => cambiarEstado(t.id, e)} />
          ))
      )}
    </div>
  );
}

function TurnoCard({ turno, compact, onEstado }) {
  const tipoLabel = turno.tipo_servicio === 'diagnostico' ? '🔍 Diagnóstico' : '⚙️ Service';
  return (
    <div className="card turno-card">
      <div className="turno-card__top">
        <div className="turno-card__hora">{turno.hora_inicio}</div>
        <div className="turno-card__info">
          <strong>{turno.nombre}</strong>
          <span>{turno.marca_moto} {turno.modelo_moto} · {turno.patente}</span>
          <span className="turno-card__tipo">{tipoLabel} · {turno.fecha}</span>
        </div>
        <Badge estado={turno.estado} />
      </div>
      {turno.descripcion && !compact && (
        <p className="turno-card__desc">{turno.descripcion}</p>
      )}
      {!compact && onEstado && (
        <div className="turno-card__actions">
          {turno.estado === 'pendiente' && (
            <button className="btn btn--success" style={{fontSize:'0.85rem',padding:'8px 14px'}}
              onClick={() => onEstado('confirmado')}>✓ Confirmar</button>
          )}
          {turno.estado === 'confirmado' && (
            <button className="btn btn--secondary" style={{fontSize:'0.85rem',padding:'8px 14px'}}
              onClick={() => onEstado('completado')}>✓ Completado</button>
          )}
          {turno.estado !== 'cancelado' && turno.estado !== 'completado' && (
            <button className="btn btn--danger" style={{fontSize:'0.85rem',padding:'8px 14px'}}
              onClick={() => onEstado('cancelado')}>✕ Cancelar</button>
          )}
          {turno.wa_cliente && (
            <button className="btn btn--wa" style={{fontSize:'0.85rem',padding:'8px 14px'}}
              onClick={() => abrirWA(turno.wa_cliente)}>
              💬 Notificar cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SERVICIOS ACTIVOS ────────────────────────────────────────────────────────
function ServiciosActivos() {
  const [activos, setActivos] = useState([]);
  const [repsActivas, setRepsActivas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [a, r] = await Promise.all([api.getServiciosActivos(), api.getReparaciones()]);
    setActivos(a);
    setRepsActivas(r.filter(x => ['aprobado','en_reparacion'].includes(x.estado)));
    setLoading(false);
  }

  async function completar(turno) {
    const res = await api.updateTurno(turno.id, { estado: 'completado' });
    setActivos(a => a.map(x => x.id === turno.id ? { ...x, estado: 'completado', wa_cliente: res.wa_cliente } : x));
  }

  if (loading) return <div className="spinner" />;

  const total = activos.length + repsActivas.length;

  return (
    <div>
      <div className="admin__toolbar">
        <h2 className="admin__title">Motos en el taller</h2>
        <span className="badge badge--en_reparacion" style={{fontSize:'1rem',padding:'6px 14px'}}>
          {total}/3 espacios
        </span>
      </div>

      {total === 0 && <p className="admin__empty">No hay motos en el taller ahora</p>}

      {activos.length > 0 && (
        <>
          <h3 className="admin__subtitle">Turnos confirmados</h3>
          {activos.map(s => (
            <div key={s.id} className="card rep-card">
              <div className="rep-card__top">
                <div>
                  <strong>{s.marca_moto} {s.modelo_moto} · {s.patente}</strong>
                  <span>{s.nombre}</span>
                  <span>📞 {s.telefono}</span>
                </div>
                <Badge estado={s.tipo_servicio === 'service' ? 'confirmado' : 'en_revision'} />
              </div>
              <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:8}}>
                {s.tipo_servicio === 'service' ? '⚙️ Service' : '🔍 Diagnóstico'} · 📅 {s.fecha} {s.hora_inicio} hs
              </p>
              {s.estado !== 'completado' && (
                <button className="btn btn--success" style={{marginTop:12,fontSize:'0.85rem',padding:'9px 16px'}}
                  onClick={() => completar(s)}>
                  ✓ Completo
                </button>
              )}
              {s.wa_cliente && (
                <button className="btn btn--wa" style={{marginTop:8,fontSize:'0.85rem',padding:'9px 16px'}}
                  onClick={() => abrirWA(s.wa_cliente)}>
                  💬 Avisar al cliente por WhatsApp
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {repsActivas.length > 0 && (
        <>
          <h3 className="admin__subtitle">En reparación</h3>
          {repsActivas.map(r => (
            <div key={r.id} className="card rep-card">
              <div className="rep-card__top">
                <div>
                  <strong>{r.marca_moto} {r.modelo_moto} · {r.patente}</strong>
                  <span>{r.nombre}</span>
                  <span>📞 {r.telefono}</span>
                </div>
                <Badge estado={r.estado} />
              </div>
              <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:6}}>{r.descripcion_trabajo}</p>
              <p style={{fontSize:'0.85rem',color:'var(--accent)',fontWeight:600,marginTop:4}}>
                💰 ${r.precio_total?.toLocaleString()}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────────────────────
function Diagnosticos() {
  const [diags, setDiags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [notas, setNotas] = useState('');

  useEffect(() => { api.getDiagnosticos().then(setDiags).finally(() => setLoading(false)); }, []);

  async function cambiarEstado(id, estado) {
    const res = await api.updateDiagnostico(id, { estado });
    setDiags(ds => ds.map(x => x.id === id ? { ...x, estado, wa_cliente: res.wa_cliente } : x));
  }

  async function guardar(d) {
    const res = await api.updateDiagnostico(d.id, { estado: d.estado, notas });
    setDiags(ds => ds.map(x => x.id === d.id ? { ...x, notas, estado: d.estado, wa_cliente: res.wa_cliente } : x));
    setEditando(null);
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <h2 className="admin__title">Diagnósticos activos</h2>
      {diags.length === 0 && <p className="admin__empty">No hay diagnósticos pendientes</p>}
      {diags.map(d => (
        <div key={d.id} className="card diag-card">
          <div className="diag-card__top">
            <div>
              <strong>{d.nombre}</strong>
              <span className="diag-card__moto">{d.marca_moto} {d.modelo_moto} · {d.patente}</span>
              <span className="diag-card__fecha">📅 {d.fecha} a las {d.hora_inicio} hs</span>
            </div>
            <Badge estado={d.estado} />
          </div>
          {d.descripcion && <p className="diag-card__desc">Problema: {d.descripcion}</p>}
          {d.notas && editando !== d.id && <p className="diag-card__notas">Notas: {d.notas}</p>}

          {d.wa_cliente && (
            <button className="btn btn--wa" style={{fontSize:'0.82rem',padding:'7px 12px',marginBottom:8}}
              onClick={() => abrirWA(d.wa_cliente)}>
              💬 Reenviar notificación al cliente
            </button>
          )}
          {editando === d.id ? (
            <div className="diag-card__edit">
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Notas del diagnóstico..."
                style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',padding:'10px',fontFamily:'var(--font-body)'}} />
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn--primary" style={{fontSize:'0.85rem',padding:'8px 14px'}} onClick={() => guardar(d)}>Guardar</button>
                <button className="btn btn--secondary" style={{fontSize:'0.85rem',padding:'8px 14px'}} onClick={() => setEditando(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="diag-card__actions">
              {d.estado === 'pendiente' && (
                <button className="btn btn--secondary" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                  onClick={() => cambiarEstado(d.id, 'en_revision')}>▶ En revisión</button>
              )}
              {d.estado === 'en_revision' && (
                <button className="btn btn--secondary" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                  onClick={() => { setEditando(d.id); setNotas(d.notas || ''); }}>
                  ✏️ Editar notas
                </button>
              )}
              <button className="btn btn--secondary" style={{fontSize:'0.82rem',padding:'7px 12px',color:'var(--success)',borderColor:'var(--success)'}}
                onClick={() => cambiarEstado(d.id, 'completado')}>✓ Completado</button>
              <button className="btn btn--secondary" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                onClick={() => cambiarEstado(d.id, 'sin_reparacion')}>✕ Sin reparación</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PRESUPUESTOS ─────────────────────────────────────────────────────────────
function Presupuestos() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ diagnostico_id:'', descripcion_trabajo:'', materiales:'', precio_total:'', tiempo_estimado_dias:1 });
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [ultimoWA, setUltimoWA] = useState('');

  useEffect(() => {
    Promise.all([api.getPresupuestos(), api.getDiagnosticos()]).then(([p, d]) => {
      setPresupuestos(p);
      setDiagnosticos(d.filter(x => ['en_revision','presupuesto_generado'].includes(x.estado)));
    }).finally(() => setLoading(false));
  }, []);

  async function crearPresupuesto() {
    setErrMsg('');
    if (!form.diagnostico_id || !form.descripcion_trabajo || !form.precio_total) {
      return setErrMsg('Completá todos los campos obligatorios');
    }
    try {
      const res = await api.crearPresupuesto({ ...form, precio_total: parseFloat(form.precio_total) });
      setPresupuestos(p => [res.presupuesto, ...p]);
      setMostrarForm(false);
      setForm({ diagnostico_id:'', descripcion_trabajo:'', materiales:'', precio_total:'', tiempo_estimado_dias:1 });
      // Abrir WhatsApp directo con el mensaje al cliente
      if (res.wa_cliente) {
        setUltimoWA(res.wa_cliente);
        setPresupuestos(p => p.map(x => x.id === res.presupuesto?.id ? { ...x, wa_cliente: res.wa_cliente } : x));
      }
    } catch (e) { setErrMsg(e.message); }
  }

  async function marcarRespuesta(id, decision) {
    try {
      await api.responderPresupuesto(id, decision);
      setPresupuestos(ps => ps.map(p => p.id === id ? { ...p, estado: decision } : p));
      if (decision === 'aceptado') {
        window.alert('✅ Presupuesto marcado como aceptado. Se creó la reparación.');
      }
    } catch (e) { window.alert(e.message); }
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="admin__toolbar">
        <h2 className="admin__title">Presupuestos</h2>
        <button className="btn btn--primary" style={{padding:'10px 18px'}} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {mostrarForm && (
        <div className="card" style={{marginBottom:20}}>
          <h3 style={{fontFamily:'var(--font-head)',fontSize:'1.3rem',marginBottom:16}}>Nuevo presupuesto</h3>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="field">
              <label>Diagnóstico *</label>
              <select value={form.diagnostico_id} onChange={e => setForm(f => ({...f,diagnostico_id:e.target.value}))}>
                <option value="">Seleccioná un diagnóstico</option>
                {diagnosticos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre} — {d.marca_moto} {d.modelo_moto} ({d.fecha})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Descripción del trabajo *</label>
              <textarea value={form.descripcion_trabajo} onChange={e => setForm(f => ({...f,descripcion_trabajo:e.target.value}))}
                placeholder="Detallá qué trabajo se va a realizar..." />
            </div>
            <div className="field">
              <label>Materiales / repuestos</label>
              <textarea value={form.materiales} onChange={e => setForm(f => ({...f,materiales:e.target.value}))}
                placeholder="Ej: Filtro de aceite, bujía..." style={{minHeight:60}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="field">
                <label>Precio total (ARS) *</label>
                <input type="number" value={form.precio_total} onChange={e => setForm(f => ({...f,precio_total:e.target.value}))} placeholder="0" />
              </div>
              <div className="field">
                <label>Días estimados</label>
                <input type="number" min="1" value={form.tiempo_estimado_dias} onChange={e => setForm(f => ({...f,tiempo_estimado_dias:e.target.value}))} />
              </div>
            </div>
            {errMsg && <div className="alert alert--error">{errMsg}</div>}
            <button className="btn btn--primary" onClick={crearPresupuesto}>
              📱 Generar y enviar por WhatsApp
            </button>
          </div>
        </div>
      )}

      {ultimoWA && (
        <div className="alert alert--success" style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <span>✓ Presupuesto generado</span>
          <button className="btn btn--wa" style={{fontSize:'0.85rem',padding:'8px 14px'}}
            onClick={() => abrirWA(ultimoWA)}>
            💬 Enviar a cliente
          </button>
        </div>
      )}
      {presupuestos.length === 0 && <p className="admin__empty">No hay presupuestos creados</p>}
      {presupuestos.map(p => (
        <div key={p.id} className="card pres-card">
          <div className="pres-card__top">
            <div>
              <strong>{p.nombre}</strong>
              <span>{p.marca_moto} {p.modelo_moto} · {p.patente}</span>
            </div>
            <Badge estado={p.estado} />
          </div>
          <div className="pres-card__info">
            <span>💰 <strong>${p.precio_total?.toLocaleString()}</strong></span>
            <span>⏱ {p.tiempo_estimado_dias} día{p.tiempo_estimado_dias > 1 ? 's' : ''}</span>
          </div>
          <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:8}}>{p.descripcion_trabajo}</p>

          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            {p.estado === 'pendiente' && (
              <>
                <button className="btn btn--success" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                  onClick={() => marcarRespuesta(p.id, 'aceptado')}>✓ Cliente aceptó</button>
                <button className="btn btn--danger" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                  onClick={() => marcarRespuesta(p.id, 'rechazado')}>✕ Cliente rechazó</button>
              </>
            )}
            {p.wa_cliente && (
              <button className="btn btn--wa" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                onClick={() => abrirWA(p.wa_cliente)}>
                💬 Reenviar presupuesto
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REPARACIONES ─────────────────────────────────────────────────────────────
function Reparaciones() {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getReparaciones().then(setReps).finally(() => setLoading(false)); }, []);

  async function cambiarEstado(id, estado) {
    const res = await api.updateReparacion(id, { estado });
    setReps(rs => rs.map(r => r.id === id ? { ...r, estado, wa_cliente: res.wa_cliente } : r));
  }

  const PROX = { aprobado:'en_reparacion', en_reparacion:'finalizado' };
  const LABEL = { aprobado:'▶ Iniciar', en_reparacion:'✓ Finalizar' };

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <h2 className="admin__title">Reparaciones</h2>
      {reps.length === 0 && <p className="admin__empty">No hay reparaciones registradas</p>}
      {reps.map(r => (
        <div key={r.id} className="card rep-card">
          <div className="rep-card__top">
            <div>
              <strong>{r.nombre}</strong>
              <span>{r.marca_moto} {r.modelo_moto} · {r.patente}</span>
              <span style={{fontSize:'0.8rem',color:'var(--text2)'}}>📞 {r.telefono}</span>
            </div>
            <Badge estado={r.estado} />
          </div>
          <p style={{fontSize:'0.85rem',color:'var(--text2)',margin:'10px 0 4px'}}>{r.descripcion_trabajo}</p>
          <p style={{fontSize:'0.85rem',color:'var(--accent)',fontWeight:600}}>
            💰 ${r.precio_total?.toLocaleString()}
          </p>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            {PROX[r.estado] && (
              <button className="btn btn--primary" style={{fontSize:'0.85rem',padding:'9px 16px'}}
                onClick={() => cambiarEstado(r.id, PROX[r.estado])}>
                {LABEL[r.estado]}
              </button>
            )}
            {r.estado === 'finalizado' && (
              <button className="btn btn--secondary" style={{fontSize:'0.85rem',padding:'9px 16px'}}
                onClick={() => cambiarEstado(r.id, 'entregado')}>
                📦 Marcar entregado
              </button>
            )}
            {r.wa_cliente && (
              <button className="btn btn--wa" style={{fontSize:'0.85rem',padding:'9px 16px'}}
                onClick={() => abrirWA(r.wa_cliente)}>
                💬 Notificar cliente
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HISTORIAL ────────────────────────────────────────────────────────────────
function Historial() {
  const [patente, setPatente] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function buscar() {
    if (!patente.trim()) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const data = await api.getHistorial(patente.trim().toUpperCase());
      setResultado(data);
    } catch (e) {
      setError('No se encontró historial para esa patente');
    } finally {
      setLoading(false);
    }
  }

  const TIPO_LABEL = { diagnostico: '🔍 Diagnóstico', service: '⚙️ Service' };

  return (
    <div>
      <h2 className="admin__title">Historial por patente</h2>

      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <div className="field" style={{flex:1,marginBottom:0}}>
          <input value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
            placeholder="Ingresá la patente (ej: AB123CD)"
            onKeyDown={e => e.key === 'Enter' && buscar()}
            style={{textTransform:'uppercase'}} />
        </div>
        <button className="btn btn--primary" onClick={buscar} disabled={loading}>
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {resultado && (
        <div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <strong style={{fontSize:'1.1rem'}}>{resultado.info.nombre}</strong>
                <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:4}}>
                  {resultado.info.marca_moto} {resultado.info.modelo_moto} · {resultado.info.patente}
                </p>
              </div>
              <span className="badge badge--confirmado">{resultado.historial.length} registro{resultado.historial.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {resultado.historial.map((h, i) => (
            <div key={h.id} className="card" style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
                <div>
                  <span style={{fontSize:'0.78rem',color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                    {TIPO_LABEL[h.tipo_servicio]}
                  </span>
                  <p style={{fontSize:'0.95rem',fontWeight:600,margin:'4px 0 2px'}}>
                    📅 {h.fecha} — {h.hora_inicio} hs
                  </p>
                </div>
                <Badge estado={h.estado} />
              </div>
              {h.descripcion && (
                <p style={{fontSize:'0.85rem',color:'var(--text2)',marginBottom:6}}>
                  💬 <strong>Problema:</strong> {h.descripcion}
                </p>
              )}
              {h.diag_notas && (
                <p style={{fontSize:'0.85rem',color:'#64a0ff',marginBottom:6}}>
                  📝 <strong>Notas diagnóstico:</strong> {h.diag_notas}
                </p>
              )}
              {h.descripcion_trabajo && (
                <p style={{fontSize:'0.85rem',color:'var(--text2)',marginBottom:6}}>
                  🔧 <strong>Trabajo realizado:</strong> {h.descripcion_trabajo}
                </p>
              )}
              {h.materiales && (
                <p style={{fontSize:'0.85rem',color:'var(--text2)',marginBottom:6}}>
                  🔩 <strong>Materiales:</strong> {h.materiales}
                </p>
              )}
              {h.rep_notas && (
                <p style={{fontSize:'0.85rem',color:'#64a0ff',marginBottom:6}}>
                  📝 <strong>Notas reparación:</strong> {h.rep_notas}
                </p>
              )}
              {h.precio_total && (
                <p style={{fontSize:'0.85rem',color:'var(--accent)',fontWeight:600}}>
                  💰 ${Number(h.precio_total).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRECIOS ─────────────────────────────────────────────────────────────────
function Precios() {
  const [precios, setPrecios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState('');

  const NOMBRES = {
    basico: 'Mantenimiento Básico (1.000–3.000 km)',
    intermedio: 'Mantenimiento Intermedio (5.000–8.000 km)',
    mayor: 'Mantenimiento Mayor (10.000–15.000 km)',
  };

  useEffect(() => {
    api.getPreciosService().then(setPrecios).finally(() => setLoading(false));
  }, []);

  async function guardar(tipo) {
    await api.updatePrecioService(tipo, parseFloat(valor));
    setPrecios(ps => ps.map(p => p.tipo === tipo ? { ...p, precio: parseFloat(valor) } : p));
    setEditando(null);
    setOk('Precio actualizado ✓');
    setTimeout(() => setOk(''), 2000);
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <h2 className="admin__title">Precios de service</h2>
      <p className="admin__empty" style={{marginBottom:16,color:'var(--text2)'}}>
        Estos precios se muestran al cliente cuando elige el tipo de service. El aceite y recambios no están incluidos.
      </p>
      {ok && <div className="alert alert--success" style={{marginBottom:16}}>{ok}</div>}
      {precios.map(p => (
        <div key={p.tipo} className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <div>
              <strong style={{fontSize:'0.95rem'}}>{NOMBRES[p.tipo] || p.tipo}</strong>
              <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:4}}>Precio actual: <strong style={{color:'var(--accent)'}}>${Number(p.precio).toLocaleString()}</strong></p>
            </div>
            {editando !== p.tipo && (
              <button className="btn btn--secondary" style={{fontSize:'0.82rem',padding:'7px 14px'}}
                onClick={() => { setEditando(p.tipo); setValor(String(p.precio)); }}>
                ✏️ Editar
              </button>
            )}
          </div>
          {editando === p.tipo && (
            <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
              <div className="field" style={{flex:1,marginBottom:0}}>
                <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder="Nuevo precio" />
              </div>
              <button className="btn btn--primary" style={{fontSize:'0.85rem',padding:'10px 16px'}} onClick={() => guardar(p.tipo)}>Guardar</button>
              <button className="btn btn--secondary" style={{fontSize:'0.85rem',padding:'10px 14px'}} onClick={() => setEditando(null)}>✕</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ estado }) {
  const labels = {
    pendiente:'Pendiente', confirmado:'Confirmado', cancelado:'Cancelado',
    completado:'Completado', en_revision:'En revisión',
    presupuesto_generado:'Con presupuesto', aprobado:'Aprobado',
    en_reparacion:'En reparación', finalizado:'Finalizado',
    entregado:'Entregado', sin_reparacion:'Sin reparación'
  };
  return <span className={`badge badge--${estado}`}>{labels[estado] || estado}</span>;
}

function fechaHoy() {
  const d = new Date();
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}
