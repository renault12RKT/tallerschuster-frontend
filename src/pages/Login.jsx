// pages/Login.jsx
import React, { useState } from 'react';
import './Login.css';

const USUARIO = 'admin';
const PASSWORD = 'schuster2024';

// Datos para recuperar contraseña
const RECOVERY_TEL = '3735582128';
const RECOVERY_EMAIL = 'mateoschuster62@gmail.com';
const RECOVERY_CODE = 'meolvide';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState('login'); // 'login' | 'recuperar' | 'mostrar'
  const [recForm, setRecForm] = useState({ telefono: '', email: '', codigo: '' });
  const [recError, setRecError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (form.usuario === USUARIO && form.password === PASSWORD) {
        sessionStorage.setItem('admin_auth', '1');
        onLogin();
      } else {
        setError('Usuario o contraseña incorrectos');
      }
      setLoading(false);
    }, 400);
  }

  function handleRecuperar(e) {
    e.preventDefault();
    setRecError('');
    if (
      recForm.telefono.replace(/\D/g,'') === RECOVERY_TEL &&
      recForm.email.trim().toLowerCase() === RECOVERY_EMAIL &&
      recForm.codigo.trim().toLowerCase() === RECOVERY_CODE
    ) {
      setModo('mostrar');
    } else {
      setRecError('Los datos ingresados no son correctos');
    }
  }

  return (
    <div className="login">
      <div className="login__box">
        <img src="/logo-taller.png" alt="Taller Schuster" className="login__logo-img" />
        <h1 className="login__title">TALLER SCHUSTER</h1>
        <p className="login__sub">Panel del mecánico</p>

        {modo === 'login' && (
          <form className="login__form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Usuario</label>
              <input type="text" value={form.usuario}
                onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}
                placeholder="admin" autoComplete="username" />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <div className="login__error">{error}</div>}
            <button className="btn btn--primary btn--full login__btn" type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar →'}
            </button>
            <button type="button" className="login__forgot" onClick={() => { setModo('recuperar'); setRecError(''); }}>
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {modo === 'recuperar' && (
          <form className="login__form" onSubmit={handleRecuperar}>
            <p className="login__rec-desc">Ingresá tus datos para verificar tu identidad</p>
            <div className="field">
              <label>Teléfono</label>
              <input type="tel" value={recForm.telefono}
                onChange={e => setRecForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="Ej: 3700000000" />
            </div>
            <div className="field">
              <label>Correo electrónico</label>
              <input type="email" value={recForm.email}
                onChange={e => setRecForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com" />
            </div>
            <div className="field">
              <label>Código clave</label>
              <input type="text" value={recForm.codigo}
                onChange={e => setRecForm(f => ({ ...f, codigo: e.target.value }))}
                placeholder="••••••••" />
            </div>
            {recError && <div className="login__error">{recError}</div>}
            <button className="btn btn--primary btn--full login__btn" type="submit">
              Verificar identidad
            </button>
            <button type="button" className="login__forgot" onClick={() => setModo('login')}>
              ← Volver al login
            </button>
          </form>
        )}

        {modo === 'mostrar' && (
          <div className="login__form">
            <div className="login__rec-ok">
              <p className="login__rec-ok-label">Tus credenciales son:</p>
              <div className="login__cred-row">
                <span>Usuario</span>
                <strong>{USUARIO}</strong>
              </div>
              <div className="login__cred-row">
                <span>Contraseña</span>
                <strong>{PASSWORD}</strong>
              </div>
            </div>
            <button className="btn btn--primary btn--full login__btn" onClick={() => setModo('login')}>
              Ir al login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
