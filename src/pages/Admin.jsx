// pages/Admin.jsx - Taller Schuster v3
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import Login from './Login';
import './Admin.css';

const TABS = [
  { id: 'dashboard',    label: '📊 Dashboard' },
  { id: 'turnos',       label: '📅 Turnos' },
  { id: 'activos',      label: '🏍️ Activos' },
  { id: 'diagnosticos', label: '🔍 Diagnósticos' },
  { id: 'presupuestos', label: '💰 Presupuestos' },
  { id: 'reparaciones', label: '🔧 Reparaciones' },
  { id: 'historial',    label: '📋 Historial' },
  { id: 'precios',      label: '🏷️ Precios y detalles' },
];

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
        turnos:       turnosCount.count,
        activos:      activos.length + (dash.reparaciones_activas?.length || 0),
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
          <div className="admin__logo">
            <img src="/logo-taller.png" alt="Taller Schuster" className="admin__logo-img" />
            Taller Schuster
          </div>
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

  if (loading || !data) return <div className="spinner" />;

  const {
    turnos_hoy = [], reparaciones_activas = [], services_activos = [],
    capacidad_taller = { usada: 0, total: 3 },
    diagnosticos_pendientes = 0, presupuestos_esperando = 0, turnos_no_presentados = 0
  } = data;

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

      {turnos_no_presentados > 0 && (
        <div className="alert alert--error" style={{marginBottom:16}}>
          ⚠️ <strong>{turnos_no_presentados}</strong> turno(s) con fecha pasada sin presentarse. Revisalos en Turnos.
        </div>
      )}

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
  const [turnos, setTurnos]     = useState([]);
  const [fecha, setFecha]       = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTurnos(fecha, busqueda).then(setTurnos).finally(() => setLoading(false));
  }, [fecha, busqueda]);

  async function cambiarEstado(id, estado) {
    if (estado === 'cancelado') {
      if (!window.confirm('¿Seguro que querés cancelar este turno? Esta acción no se puede deshacer.')) return;
    }
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
      <div style={{marginBottom:16}}>
        <input
          className="admin__date-filter"
          style={{width:'100%',padding:'10px 14px',fontSize:'0.95rem'}}
          placeholder="Buscar por nombre o patente..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>
      {loading ? <div className="spinner" /> : (
        turnos.length === 0
          ? <p className="admin__empty">No hay turnos {fecha ? 'para esta fecha' : ''}{busqueda ? ` con "${busqueda}"` : ''}</p>
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
          {!turno.wa_cliente && turno.telefono && (
            <button className="btn btn--wa" style={{fontSize:'0.85rem',padding:'8px 14px'}}
              onClick={async () => {
                const r = await api.notificarTurno(turno.id, null);
                if (r.wa_cliente) abrirWA(r.wa_cliente);
              }}>
              💬 Enviar WA
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SERVICIOS ACTIVOS ────────────────────────────────────────────────────────
function ServiciosActivos() {
  const [activos, setActivos]       = useState([]);
  const [repsActivas, setRepsActivas] = useState([]);
  const [loading, setLoading]       = useState(true);

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
                  onClick={() => completar(s)}>✓ Completo</button>
              )}
              {s.wa_cliente && (
                <button className="btn btn--wa" style={{marginTop:8,fontSize:'0.85rem',padding:'9px 16px'}}
                  onClick={() => abrirWA(s.wa_cliente)}>💬 Avisar al cliente por WhatsApp</button>
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
  const [diags, setDiags]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [notas, setNotas]     = useState('');

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
  const [mostrarForm, setMostrarForm]   = useState(false);
  const [form, setForm] = useState({ diagnostico_id:'', descripcion_trabajo:'', materiales:'', precio_total:'', tiempo_estimado_dias:1 });
  const [errMsg, setErrMsg]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [ultimoWA, setUltimoWA]         = useState('');

  useEffect(() => {
    Promise.all([api.getPresupuestos(), api.getDiagnosticos()]).then(([p, d]) => {
      setPresupuestos(p);
      setDiagnosticos(d.filter(x => ['en_revision','presupuesto_generado'].includes(x.estado)));
    }).finally(() => setLoading(false));
  }, []);

  async function crearPresupuesto() {
    setErrMsg('');
    if (!form.diagnostico_id || !form.descripcion_trabajo || !form.precio_total)
      return setErrMsg('Completá todos los campos obligatorios');
    try {
      const res = await api.crearPresupuesto({ ...form, precio_total: parseFloat(form.precio_total) });
      setPresupuestos(p => [res.presupuesto, ...p]);
      setMostrarForm(false);
      setForm({ diagnostico_id:'', descripcion_trabajo:'', materiales:'', precio_total:'', tiempo_estimado_dias:1 });
      if (res.wa_cliente) {
        setUltimoWA(res.wa_cliente);
        setPresupuestos(p => p.map(x => x.id === res.presupuesto?.id ? { ...x, wa_cliente: res.wa_cliente } : x));
      }
    } catch(e) { setErrMsg(e.message); }
  }

  async function marcarRespuesta(id, decision) {
    try {
      await api.responderPresupuestoAdmin(id, decision);
      setPresupuestos(ps => ps.map(p => p.id === id ? { ...p, estado: decision } : p));
      if (decision === 'aceptado') window.alert('✅ Presupuesto marcado como aceptado. Se creó la reparación.');
    } catch(e) { window.alert(e.message); }
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
            <button className="btn btn--primary" onClick={crearPresupuesto}>📱 Generar y enviar por WhatsApp</button>
          </div>
        </div>
      )}

      {ultimoWA && (
        <div className="alert alert--success" style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <span>✓ Presupuesto generado</span>
          <button className="btn btn--wa" style={{fontSize:'0.85rem',padding:'8px 14px'}}
            onClick={() => abrirWA(ultimoWA)}>💬 Enviar a cliente</button>
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
                onClick={() => abrirWA(p.wa_cliente)}>💬 Reenviar presupuesto</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REPARACIONES ─────────────────────────────────────────────────────────────
function Reparaciones() {
  const [reps, setReps]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getReparaciones().then(setReps).finally(() => setLoading(false)); }, []);

  async function cambiarEstado(id, estado) {
    const res = await api.updateReparacion(id, { estado });
    setReps(rs => rs.map(r => r.id === id ? { ...r, estado, wa_cliente: res.wa_cliente } : r));
  }

  const PROX  = { aprobado:'en_reparacion', en_reparacion:'finalizado' };
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
                onClick={() => cambiarEstado(r.id, 'entregado')}>📦 Marcar entregado</button>
            )}
            {r.wa_cliente && (
              <button className="btn btn--wa" style={{fontSize:'0.85rem',padding:'9px 16px'}}
                onClick={() => abrirWA(r.wa_cliente)}>💬 Notificar cliente</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HISTORIAL ────────────────────────────────────────────────────────────────
const TIPO_LABEL = { diagnostico: '🔍 Diagnóstico', service: '⚙️ Service' };

function Historial() {
  const [patente, setPatente]     = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [descargando, setDescargando] = useState(false);

  function generarPDF() {
    if (!resultado) return;
    setDescargando(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      const margen = 18;
      const ancho = W - margen * 2;
      let y = 0;

      const COLOR_BG    = [18, 18, 18];
      const COLOR_GOLD  = [245, 166, 35];
      const COLOR_WHITE = [245, 245, 245];
      const COLOR_GRAY  = [136, 136, 136];
      const COLOR_DARK  = [30, 30, 30];
      const COLOR_LINE  = [42, 42, 42];

      // ── HEADER ──
      doc.setFillColor(...COLOR_BG);
      doc.rect(0, 0, W, 297, 'F');

      doc.setFillColor(...COLOR_DARK);
      doc.rect(0, 0, W, 48, 'F');

      doc.setFillColor(...COLOR_GOLD);
      doc.rect(0, 0, W, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...COLOR_WHITE);
      doc.text('TALLER SCHUSTER', margen, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_GRAY);
      doc.text('Servicio de motos · Diagnóstico · Mantenimiento', margen, 25);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_GOLD);
      doc.text('HISTORIAL DE SERVICIO', margen, 35);

      const now = new Date();
      const fechaGen = now.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_GRAY);
      doc.text(`Generado: ${fechaGen}`, W - margen, 35, { align: 'right' });

      // ── INFO VEHÍCULO ──
      y = 56;
      doc.setFillColor(...COLOR_DARK);
      doc.roundedRect(margen, y, ancho, 34, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_GOLD);
      doc.text('VEHÍCULO', margen + 6, y + 8);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_WHITE);
      const motoStr = `${resultado.info.marca_moto} ${resultado.info.modelo_moto}`;
      doc.text(motoStr, margen + 6, y + 17);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_GRAY);
      doc.text(`Patente: ${resultado.info.patente}`, margen + 6, y + 25);

      // info cliente columna derecha
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_GOLD);
      doc.text('CLIENTE', W - margen - 60, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_WHITE);
      doc.setFontSize(10);
      doc.text(resultado.info.nombre, W - margen - 60, y + 17);
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_GRAY);
      if (resultado.info.telefono) doc.text(resultado.info.telefono, W - margen - 60, y + 25);

      // total
      const totalGastado = resultado.historial.reduce((s, h) => s + (h.precio_total ? Number(h.precio_total) : 0), 0);
      if (totalGastado > 0) {
        doc.setFillColor(...COLOR_GOLD);
        doc.roundedRect(W - margen - 38, y + 2, 38, 14, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('TOTAL MO', W - margen - 19, y + 8, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`$${totalGastado.toLocaleString('es-AR')}`, W - margen - 19, y + 14, { align: 'center' });
      }

      y += 44;

      // ── ESTADÍSTICAS ──
      const total = resultado.historial.length;
      const servicios = resultado.historial.filter(h => h.tipo_servicio === 'service').length;
      const diagnosticos = total - servicios;
      const stats = [
        { label: 'Registros', val: total },
        { label: 'Services', val: servicios },
        { label: 'Diagnósticos', val: diagnosticos },
      ];
      const statW = ancho / stats.length;
      stats.forEach((s, i) => {
        const sx = margen + i * statW;
        doc.setFillColor(25, 25, 25);
        doc.rect(sx, y, statW - 2, 18, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR_GOLD);
        doc.text(String(s.val), sx + statW / 2 - 1, y + 11, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLOR_GRAY);
        doc.text(s.label.toUpperCase(), sx + statW / 2 - 1, y + 16, { align: 'center' });
      });
      y += 25;

      // ── REGISTROS ──
      const TIPO_LABEL  = { service: 'Service / Mantenimiento', diagnostico: 'Diagnóstico' };
      const ESTADO_COLOR = {
        confirmado: [76,175,138], completado: [136,136,136], pendiente: [245,166,35],
        cancelado: [224,82,82], en_reparacion: [100,160,255], finalizado: [76,175,138],
        entregado: [136,136,136], sin_reparacion: [136,136,136], no_presentado: [224,82,82],
      };
      const ESTADO_LABEL = {
        pendiente:'Pendiente', confirmado:'Confirmado', cancelado:'Cancelado',
        completado:'Completado', en_revision:'En revisión', presupuesto_generado:'Con presupuesto',
        aprobado:'Aprobado', en_reparacion:'En reparación', finalizado:'Finalizado',
        entregado:'Entregado', sin_reparacion:'Sin reparación', no_presentado:'No se presentó'
      };

      resultado.historial.forEach((h, idx) => {
        // Calcular altura necesaria para este bloque
        let alturaBloque = 28;
        if (h.descripcion)          alturaBloque += 8;
        if (h.diag_notas)           alturaBloque += 8;
        if (h.descripcion_trabajo)  alturaBloque += 8;
        if (h.materiales)           alturaBloque += 8;
        if (h.rep_notas)            alturaBloque += 8;
        if (h.precio_total)         alturaBloque += 8;

        // Nueva página si no entra
        if (y + alturaBloque > 275) {
          doc.addPage();
          doc.setFillColor(...COLOR_BG);
          doc.rect(0, 0, W, 297, 'F');
          y = 14;
        }

        // Tarjeta
        doc.setFillColor(...COLOR_DARK);
        doc.roundedRect(margen, y, ancho, alturaBloque, 2, 2, 'F');

        // Barra izquierda dorada
        doc.setFillColor(...COLOR_GOLD);
        doc.roundedRect(margen, y, 3, alturaBloque, 1, 1, 'F');

        // Número
        doc.setFillColor(...COLOR_BG);
        doc.circle(margen + 10, y + 8, 5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR_GOLD);
        doc.text(String(idx + 1).padStart(2,'0'), margen + 10, y + 10, { align: 'center' });

        // Tipo
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR_GRAY);
        doc.text((TIPO_LABEL[h.tipo_servicio] || h.tipo_servicio).toUpperCase(), margen + 18, y + 7);

        // Fecha
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR_WHITE);
        doc.text(`${h.fecha}   ${h.hora_inicio} hs`, margen + 18, y + 14);

        // Badge estado
        const estadoColor = ESTADO_COLOR[h.estado] || COLOR_GRAY;
        const estadoLabel = ESTADO_LABEL[h.estado] || h.estado;
        const badgeW = doc.getTextWidth(estadoLabel) * 0.8 + 6;
        doc.setFillColor(estadoColor[0], estadoColor[1], estadoColor[2], 0.15);
        doc.roundedRect(W - margen - badgeW - 2, y + 4, badgeW + 2, 8, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...estadoColor);
        doc.text(estadoLabel, W - margen - badgeW / 2 - 1, y + 10, { align: 'center' });

        // Separador
        doc.setDrawColor(...COLOR_LINE);
        doc.setLineWidth(0.3);
        doc.line(margen + 6, y + 18, margen + ancho - 6, y + 18);

        let dy = y + 24;
        const campo = (emoji, label, valor) => {
          if (!valor) return;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLOR_GRAY);
          doc.text(`${emoji} ${label.toUpperCase()}`, margen + 8, dy);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLOR_WHITE);
          const lineas = doc.splitTextToSize(String(valor), ancho - 50);
          doc.text(lineas[0], margen + 40, dy);
          dy += 8;
        };

        campo('', 'Problema', h.descripcion);
        campo('', 'Diagnóstico', h.diag_notas);
        campo('', 'Trabajo', h.descripcion_trabajo);
        campo('', 'Materiales', h.materiales);
        campo('', 'Notas rep.', h.rep_notas);

        if (h.precio_total) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLOR_GOLD);
          doc.text(`$ ${Number(h.precio_total).toLocaleString('es-AR')}`, margen + 8, dy);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLOR_GRAY);
          doc.text('mano de obra', margen + 8 + doc.getTextWidth(`$ ${Number(h.precio_total).toLocaleString('es-AR')}`) + 2, dy);
        }

        y += alturaBloque + 4;
      });

      // ── FOOTER ──
      if (y + 20 > 275) {
        doc.addPage();
        doc.setFillColor(...COLOR_BG);
        doc.rect(0, 0, W, 297, 'F');
        y = 14;
      }
      doc.setDrawColor(...COLOR_GOLD);
      doc.setLineWidth(0.5);
      doc.line(margen, y + 4, W - margen, y + 4);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_GRAY);
      doc.text('Taller Schuster · Servicio de motos', margen, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tel: 3735582128`, W - margen, y + 12, { align: 'right' });

      // ── GUARDAR ──
      const nombre = `${resultado.info.marca_moto}-${resultado.info.patente}-historial.pdf`
        .replace(/\s+/g, '-').toLowerCase();
      doc.save(nombre);
    } catch(e) {
      console.error('Error generando PDF:', e);
      alert('Error al generar el PDF: ' + e.message);
    } finally {
      setTimeout(() => setDescargando(false), 800);
    }
  }

  async function buscar() {
    const pat = patente.trim().toUpperCase().replace(/[\s\-]/g, '');
    if (!pat) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const data = await api.getHistorial(pat);
      setResultado(data);
    } catch(e) {
      setError('No se encontró historial para esa patente.');
    } finally {
      setLoading(false);
    }
  }



  // Calcular total gastado
  const totalGastado = resultado
    ? resultado.historial.reduce((sum, h) => sum + (h.precio_total ? Number(h.precio_total) : 0), 0)
    : 0;

  return (
    <div>
      <h2 className="admin__title">Historial por patente</h2>

      {/* Buscador */}
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <div className="field" style={{flex:1,marginBottom:0}}>
          <input
            value={patente}
            onChange={e => setPatente(e.target.value.toUpperCase())}
            placeholder="Ingresá la patente (ej: AB123CD)"
            onKeyDown={e => e.key === 'Enter' && buscar()}
            style={{textTransform:'uppercase'}}
          />
        </div>
        <button className="btn btn--primary" onClick={buscar} disabled={loading || !patente.trim()}>
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {/* Resultado */}
      {resultado && (
        <>
          {/* Header del cliente */}
          <div className="card historial__header-card">
            <div className="historial__header-top">
              <div className="historial__cliente-info">
                <strong className="historial__cliente-nombre">{resultado.info.nombre}</strong>
                <span className="historial__cliente-moto">
                  {resultado.info.marca_moto} {resultado.info.modelo_moto}
                </span>
                <span className="historial__cliente-patente">🪪 {resultado.info.patente}</span>
                {resultado.info.telefono && (
                  <span className="historial__cliente-tel">📞 {resultado.info.telefono}</span>
                )}
              </div>
              <div className="historial__header-meta">
                <span className="badge badge--confirmado" style={{marginBottom:8}}>
                  {resultado.historial.length} registro{resultado.historial.length !== 1 ? 's' : ''}
                </span>
                {totalGastado > 0 && (
                  <span className="historial__total">
                    💰 ${totalGastado.toLocaleString('es-AR')} total
                  </span>
                )}
              </div>
            </div>

            {/* Botón de descarga */}
            <div className="historial__download-zone">
              <div className="historial__download-info">
                <span className="historial__download-icon">📄</span>
                <div>
                  <p className="historial__download-title">Descargar historial en PDF</p>
                  <p className="historial__download-sub">
                    Archivo PDF con todos los registros de {resultado.info.patente}
                  </p>
                </div>
              </div>
              <button
                className="btn btn--primary historial__download-btn"
                onClick={generarPDF}
                disabled={descargando}
              >
                {descargando ? '⏳ Generando...' : '📥 Descargar PDF'}
              </button>
            </div>
          </div>

          {/* Registros */}
          <div style={{marginTop:16}}>
            {resultado.historial.map((h, i) => (
              <div key={h.id} className="card historial__registro" style={{marginBottom:10}}>
                <div className="historial__reg-header">
                  <div>
                    <span className="historial__reg-tipo">{TIPO_LABEL[h.tipo_servicio]}</span>
                    <p className="historial__reg-fecha">📅 {h.fecha} — {h.hora_inicio} hs</p>
                  </div>
                  <Badge estado={h.estado} />
                </div>

                {h.descripcion && (
                  <p className="historial__reg-dato">
                    <span className="historial__reg-key">💬 Problema</span>
                    <span>{h.descripcion}</span>
                  </p>
                )}
                {h.diag_notas && (
                  <p className="historial__reg-dato historial__reg-dato--blue">
                    <span className="historial__reg-key">📝 Diagnóstico</span>
                    <span>{h.diag_notas}</span>
                  </p>
                )}
                {h.descripcion_trabajo && (
                  <p className="historial__reg-dato">
                    <span className="historial__reg-key">🔧 Trabajo</span>
                    <span>{h.descripcion_trabajo}</span>
                  </p>
                )}
                {h.materiales && (
                  <p className="historial__reg-dato">
                    <span className="historial__reg-key">🔩 Materiales</span>
                    <span>{h.materiales}</span>
                  </p>
                )}
                {h.rep_notas && (
                  <p className="historial__reg-dato historial__reg-dato--blue">
                    <span className="historial__reg-key">📝 Notas rep.</span>
                    <span>{h.rep_notas}</span>
                  </p>
                )}
                {h.precio_total && (
                  <p className="historial__reg-precio">
                    💰 ${Number(h.precio_total).toLocaleString('es-AR')}
                    <span style={{fontSize:'0.75rem',fontWeight:400,color:'var(--text2)',marginLeft:6}}>(mano de obra)</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Footer con botón de descarga repetido */}
          {resultado.historial.length > 3 && (
            <div style={{textAlign:'center',marginTop:20,paddingTop:16,borderTop:'1px solid var(--border)'}}>
              <button
                className="btn btn--secondary"
                style={{fontSize:'0.9rem',padding:'11px 24px'}}
                onClick={generarPDF}
                disabled={descargando}
              >
                {descargando ? '⏳ Generando...' : '📥 Descargar historial PDF'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PRECIOS Y DETALLES ──────────────────────────────────────────────────────
const CILS = [
  { id: 'baja',  label: 'Baja cilindrada',  sub: 'Hasta 250cc' },
  { id: 'media', label: 'Media cilindrada', sub: '251cc – 600cc' },
  { id: 'alta',  label: 'Alta cilindrada',  sub: 'Más de 600cc' },
];

function Precios() {
  const [todos, setTodos]     = useState([]);
  const [cilActiva, setCil]   = useState('baja');
  const [editando, setEdit]   = useState(null);
  const [form, setForm]       = useState({ nombre_mantenimiento:'', precio:'', detalles:'' });
  const [loading, setLoading] = useState(true);
  const [ok, setOk]           = useState('');

  useEffect(() => {
    api.getPreciosService()
      .then(data => setTodos(Array.isArray(data) ? data : []))
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, []);

  const filas = todos.filter(p => p.cilindrada === cilActiva);

  function abrirEdicion(p) {
    setEdit(p.id);
    setForm({ nombre_mantenimiento: p.nombre_mantenimiento, precio: String(p.precio), detalles: p.detalles || '' });
  }

  async function guardar(p) {
    try {
      await api.updatePrecioService(p.cilindrada, p.mantenimiento, {
        nombre_mantenimiento: form.nombre_mantenimiento,
        precio: parseFloat(form.precio),
        detalles: form.detalles,
      });
      setTodos(all => all.map(x => x.id === p.id
        ? { ...x, nombre_mantenimiento: form.nombre_mantenimiento, precio: parseFloat(form.precio), detalles: form.detalles }
        : x
      ));
      setEdit(null);
      setOk('✓ Guardado');
      setTimeout(() => setOk(''), 2500);
    } catch(e) { alert('Error al guardar: ' + e.message); }
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <h2 className="admin__title">Precios y detalles</h2>
      <p style={{fontSize:'0.9rem',color:'var(--text2)',marginBottom:16}}>
        Editá precio e ítems por cilindrada y tipo de mantenimiento.
      </p>
      {ok && <div className="alert alert--success" style={{marginBottom:12}}>{ok}</div>}

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {CILS.map(c => (
          <button key={c.id}
            className={`btn ${cilActiva === c.id ? 'btn--primary' : 'btn--secondary'}`}
            style={{fontSize:'0.88rem',padding:'8px 14px'}}
            onClick={() => { setCil(c.id); setEdit(null); }}>
            {c.label} <span style={{opacity:0.6,fontSize:'0.78rem'}}>({c.sub})</span>
          </button>
        ))}
      </div>

      {filas.length === 0 ? (
        <div className="alert alert--info">Cargando datos... si el problema persiste, reiniciá el backend.</div>
      ) : filas.map(p => {
        const items = p.detalles ? p.detalles.split('|') : [];
        const editandoEste = editando === p.id;
        return (
          <div key={p.id} className="card" style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:editandoEste ? 14 : 6}}>
              <div>
                <strong style={{fontSize:'1rem'}}>{p.nombre_mantenimiento}</strong>
                <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:3}}>
                  Precio: <strong style={{color:'var(--accent)'}}>${Number(p.precio).toLocaleString()}</strong>
                </p>
              </div>
              {!editandoEste && (
                <button className="btn btn--secondary" style={{fontSize:'0.82rem',padding:'7px 12px'}}
                  onClick={() => abrirEdicion(p)}>✏️ Editar</button>
              )}
            </div>

            {!editandoEste && items.length > 0 && (
              <ul style={{fontSize:'0.85rem',color:'var(--text2)',paddingLeft:16,display:'flex',flexDirection:'column',gap:3}}>
                {items.map((item, i) => <li key={i}>✓ {item}</li>)}
              </ul>
            )}

            {editandoEste && (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div className="field">
                  <label>Nombre del mantenimiento</label>
                  <input value={form.nombre_mantenimiento}
                    onChange={e => setForm(f => ({...f, nombre_mantenimiento: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Precio (ARS)</label>
                  <input type="number" value={form.precio}
                    onChange={e => setForm(f => ({...f, precio: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Ítems incluidos (separar con | )</label>
                  <textarea value={form.detalles}
                    onChange={e => setForm(f => ({...f, detalles: e.target.value}))}
                    placeholder="Cambio de aceite|Revisión de frenos|..."
                    style={{minHeight:80}} />
                  <span style={{fontSize:'0.78rem',color:'var(--text2)'}}>Usá | para separar cada ítem</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn--primary" style={{fontSize:'0.85rem',padding:'9px 16px'}}
                    onClick={() => guardar(p)}>Guardar</button>
                  <button className="btn btn--secondary" style={{fontSize:'0.85rem',padding:'9px 14px'}}
                    onClick={() => setEdit(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
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
    entregado:'Entregado', sin_reparacion:'Sin reparación',
    no_presentado:'No se presentó'
  };
  return <span className={`badge badge--${estado}`}>{labels[estado] || estado}</span>;
}

function fechaHoy() {
  const d = new Date();
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}
