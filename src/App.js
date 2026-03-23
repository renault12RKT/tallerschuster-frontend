// App.js - Enrutamiento principal
import React, { useState } from 'react';
import Home from './pages/Home';
import NuevoTurno from './pages/NuevoTurno';
import Confirmacion from './pages/Confirmacion';
import Admin from './pages/Admin';
import Presupuesto from './pages/Presupuesto';

export default function App() {
  const [pagina, setPagina] = useState(() => {
    // Detectar rutas especiales en la URL
    const hash = window.location.hash;
    if (hash.startsWith('#/admin')) return 'admin';
    if (hash.startsWith('#/presupuesto/')) return 'presupuesto';
    return 'home';
  });
  const [turnoConfirmado, setTurnoConfirmado] = useState(null);
  const [presupuestoToken, setPresupuestoToken] = useState(() => {
    const hash = window.location.hash;
    const match = hash.match(/#\/presupuesto\/(.+)/);
    return match ? match[1] : null;
  });

  const navegar = (p, data) => {
    setPagina(p);
    if (p === 'confirmacion') setTurnoConfirmado(data);
  };

  if (pagina === 'admin') return <Admin />;
  if (pagina === 'presupuesto') return <Presupuesto token={presupuestoToken} />;
  if (pagina === 'turno') return <NuevoTurno onConfirmado={(t) => navegar('confirmacion', t)} onVolver={() => navegar('home')} />;
  if (pagina === 'confirmacion') return <Confirmacion turno={turnoConfirmado} onVolver={() => navegar('home')} />;
  return <Home onSolicitarTurno={() => navegar('turno')} onAdmin={() => navegar('admin')} />;
}
