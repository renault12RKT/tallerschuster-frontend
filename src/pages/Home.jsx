// pages/Home.jsx
import React from 'react';
import './Home.css';

export default function Home({ onSolicitarTurno, onAdmin }) {
  return (
    <div className="home">
      <div className="home__bg" />
      <div className="container home__content">
        <header className="home__header">
          <img src="/logo-taller.png" alt="Taller Schuster" className="home__logo-img" />
          <p className="home__sub">Mecánica de motos · Diagnóstico · Service</p>
        </header>

        <div className="home__info">
          <div className="home__horario">
            <div className="home__horario-item">
              <span className="home__horario-emoji">☀️</span>
              <div>
                <strong>Mañana</strong>
                <span>08:00 – 12:00</span>
              </div>
            </div>
            <div className="home__horario-item">
              <span className="home__horario-emoji">🌆</span>
              <div>
                <strong>Tarde</strong>
                <span>15:00 – 20:00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="home__servicios">
          <div className="home__servicio">
            <span>🔍</span>
            <div>
              <strong>Diagnóstico</strong>
              <p>Detección de problemas · 1 hora</p>
            </div>
          </div>
          <div className="home__servicio">
            <span>⚙️</span>
            <div>
              <strong>Service</strong>
              <p>Mantenimiento general · 2 horas</p>
            </div>
          </div>
        </div>

        <button className="btn btn--primary btn--full home__cta" onClick={onSolicitarTurno}>
          SOLICITAR TURNO
        </button>

        <button className="home__admin-link" onClick={onAdmin}>
          Panel mecánico →
        </button>
      </div>
    </div>
  );
}
