// utils/api.js
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

export const api = {
  // Público
  getDisponibilidad: (fecha, tipo) => request(`/disponibilidad?fecha=${fecha}&tipo=${tipo}`),
  crearTurno: (body) => request('/turnos', { method: 'POST', body }),
  getPresupuesto: (token) => request(`/presupuesto/${token}`),
  responderPresupuesto: (token, decision) => request(`/presupuesto/${token}/responder`, { method: 'POST', body: { decision } }),

  // Admin
  getDashboard: () => request('/admin/dashboard'),
  getTurnos: (fecha, busqueda) => {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (busqueda) params.set('busqueda', busqueda);
    const qs = params.toString();
    return request(`/admin/turnos${qs ? '?' + qs : ''}`);
  },
  updateTurno: (id, data) => request(`/admin/turnos/${id}`, { method: 'PATCH', body: data }),
  deleteTurno: (id) => request(`/admin/turnos/${id}`, { method: 'DELETE' }),
  getDiagnosticos: () => request('/admin/diagnosticos'),
  updateDiagnostico: (id, data) => request(`/admin/diagnosticos/${id}`, { method: 'PATCH', body: data }),
  crearPresupuesto: (body) => request('/admin/presupuestos', { method: 'POST', body }),
  getPresupuestos: () => request('/admin/presupuestos'),
  responderPresupuestoAdmin: (id, decision) => request(`/admin/presupuestos/${id}/responder`, { method: 'PATCH', body: { decision } }),
  getReparaciones: () => request('/admin/reparaciones'),
  updateReparacion: (id, data) => request(`/admin/reparaciones/${id}`, { method: 'PATCH', body: data }),
  getServiciosActivos: () => request('/admin/services-activos'),
  getHistorial: (patente) => request(`/admin/historial/${patente}`),
  getEstadoMoto: (patente) => request(`/motos/estado?patente=${patente}`),
  notificarTurno: (id, mensaje_custom) => request(`/admin/turnos/${id}/notificar`, { method: 'POST', body: { mensaje_custom } }),
  // URL para descarga directa (no usa request(), devuelve URL)
  getUrlExportarHistorial: (patente) => `${BASE}/admin/historial/exportar/${patente}`,
  getTurnosCount: () => request('/admin/turnos-count'),
  getPreciosService: () => request('/precios-service'),
  // firma correcta: (cilindrada, mantenimiento, data)
  updatePrecioService: (cilindrada, mantenimiento, data) => request(`/admin/precios-service/${cilindrada}/${mantenimiento}`, { method: 'PATCH', body: data }),
};
