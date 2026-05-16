import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthPages.css';

const ROLE_OPTIONS = [
  { value: 'sportler',    label: 'Sportler',    desc: 'Ich bin aktiver Kampfsportler' },
  { value: 'veranstalter', label: 'Veranstalter', desc: 'Ich organisiere Turniere und Events' },
  { value: 'dojo',        label: 'Dojo / Schule', desc: 'Ich vertrete eine Kampfsportschule' },
];

const RegisterPage = () => {
  const [form, setForm] = useState({
    vorname: '', nachname: '', email: '', password: '', password2: '', role: 'sportler',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password2) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    if (form.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', {
        vorname: form.vorname,
        nachname: form.nachname,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Registrierung fehlgeschlagen.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verbindungsfehler. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card card">
          <div className="auth-logo">✅</div>
          <h2 className="auth-title">Registrierung erfolgreich!</h2>
          <p className="auth-subtitle mt-2">
            Dein Konto wird geprüft und vom Admin freigeschaltet.<br />
            Du erhältst eine Benachrichtigung sobald du dich einloggen kannst.
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-full mt-3">
            Zum Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">🥋</div>
        <h1 className="auth-title">Konto erstellen</h1>
        <p className="auth-subtitle">TDA Network — Für alle offen</p>

        <form onSubmit={handleSubmit} className="mt-3">
          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Vorname</label>
              <input type="text" name="vorname" value={form.vorname}
                onChange={handleChange} className="form-input" placeholder="Max" required />
            </div>
            <div className="form-group">
              <label className="form-label">Nachname</label>
              <input type="text" name="nachname" value={form.nachname}
                onChange={handleChange} className="form-input" placeholder="Mustermann" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">E-Mail-Adresse</label>
            <input type="email" name="email" value={form.email}
              onChange={handleChange} className="form-input" placeholder="name@beispiel.de" required />
          </div>

          <div className="form-group">
            <label className="form-label">Ich bin...</label>
            <div className="role-selector">
              {ROLE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`role-option ${form.role === opt.value ? 'role-option--active' : ''}`}
                >
                  <input type="radio" name="role" value={opt.value}
                    checked={form.role === opt.value} onChange={handleChange} />
                  <span className="role-label">{opt.label}</span>
                  <span className="role-desc">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Passwort</label>
              <input type="password" name="password" value={form.password}
                onChange={handleChange} className="form-input" placeholder="Min. 8 Zeichen" required />
            </div>
            <div className="form-group">
              <label className="form-label">Wiederholen</label>
              <input type="password" name="password2" value={form.password2}
                onChange={handleChange} className="form-input" placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg mt-2" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Registrieren'}
          </button>
        </form>

        <p className="auth-footer">
          Bereits registriert?{' '}
          <Link to="/login" className="text-gold">Jetzt anmelden</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
