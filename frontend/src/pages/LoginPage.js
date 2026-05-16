import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.success) {
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        setError(data.error || 'Login fehlgeschlagen.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verbindungsfehler. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card card">
        <div className="auth-logo">🥋</div>
        <h1 className="auth-title">TDA <span className="text-gold">Network</span></h1>
        <p className="auth-subtitle">Die offene Plattform für Kampfsport</p>

        <form onSubmit={handleSubmit} className="mt-3">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">E-Mail-Adresse</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="form-input"
              placeholder="name@beispiel.de"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg mt-2" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Anmelden'}
          </button>
        </form>

        <p className="auth-footer">
          Noch kein Konto?{' '}
          <Link to="/registrieren" className="text-gold">Jetzt registrieren</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
