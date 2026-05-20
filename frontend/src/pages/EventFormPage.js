import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './EventFormPage.css';

const TYP_OPTIONEN = [
  { value: 'turnier',    label: '🏆 Turnier' },
  { value: 'lehrgang',   label: '📚 Lehrgang' },
  { value: 'seminar',    label: '🎓 Seminar' },
  { value: 'camp',       label: '⛺ Camp' },
  { value: 'pruefung',   label: '🥋 Prüfung' },
  { value: 'sparring',   label: '🤜 Sparringstreff' },
  { value: 'sonstiges',  label: '📌 Sonstiges' },
];

const EventFormPage = () => {
  const { isActive } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    titel: '', typ: 'turnier', datum_von: '', datum_bis: '', ort: '', adresse: '',
    kampfsportart: '', beschreibung: '', teilnahmegebuehr: '',
    kontakt_email: '', kontakt_web: '', events_link: '',
  });
  const [banner, setBanner] = useState(null);
  const [ausschreibung, setAusschreibung] = useState(null);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titel || !form.typ || !form.datum_von) {
      setError('Titel, Typ und Datum von sind Pflichtfelder.');
      return;
    }

    setSaving(true);
    setError('');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (banner) fd.append('banner', banner);
    if (ausschreibung) fd.append('ausschreibung', ausschreibung);

    try {
      const { data } = await axios.post('/api/events', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        navigate('/events/meine');
      } else {
        setError(data.error || 'Fehler beim Einreichen.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verbindungsfehler.');
    } finally {
      setSaving(false);
    }
  };

  if (!isActive) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2>Konto noch nicht freigeschaltet</h2>
        <p className="text-muted mt-2">Du kannst Events einreichen sobald dein Konto vom Admin freigegeben wurde.</p>
        <Link to="/dashboard" className="btn btn-secondary mt-3">Zurück zum Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="eventform-wrapper container">
      <div className="eventform-header">
        <Link to="/events" className="btn btn-secondary btn-sm">← Zurück</Link>
        <div>
          <h1>Event einreichen</h1>
          <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
            Nach dem Einreichen wird dein Event vom Admin geprüft und freigegeben.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error mt-2">{error}</div>}

        {/* Typ-Auswahl */}
        <div className="card mt-3">
          <h3 className="section-heading">Art des Events</h3>
          <div className="typ-grid">
            {TYP_OPTIONEN.map(opt => (
              <label key={opt.value} className={`typ-option ${form.typ === opt.value ? 'typ-option--active' : ''}`}>
                <input type="radio" name="typ" value={opt.value}
                  checked={form.typ === opt.value}
                  onChange={e => handleChange('typ', e.target.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Grunddaten */}
        <div className="card mt-2">
          <h3 className="section-heading">Grunddaten</h3>
          <div className="form-grid-3">
            <div className="form-group form-group--full">
              <label className="form-label">Titel *</label>
              <input type="text" className="form-input" value={form.titel}
                placeholder="z.B. Süddeutsche Taekwondo Meisterschaft 2026"
                onChange={e => handleChange('titel', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Datum von *</label>
              <input type="date" className="form-input" value={form.datum_von}
                onChange={e => handleChange('datum_von', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Datum bis</label>
              <input type="date" className="form-input" value={form.datum_bis}
                onChange={e => handleChange('datum_bis', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Kampfsportart</label>
              <input type="text" className="form-input" value={form.kampfsportart}
                placeholder="z.B. Taekwondo" onChange={e => handleChange('kampfsportart', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ort / Stadt</label>
              <input type="text" className="form-input" value={form.ort}
                placeholder="z.B. München" onChange={e => handleChange('ort', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Adresse (vollständig)</label>
              <input type="text" className="form-input" value={form.adresse}
                placeholder="Musterstraße 1, 80331 München"
                onChange={e => handleChange('adresse', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Teilnahmegebühr</label>
              <input type="text" className="form-input" value={form.teilnahmegebuehr}
                placeholder="z.B. 25 € pro Starter"
                onChange={e => handleChange('teilnahmegebuehr', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Beschreibung</label>
              <textarea className="form-input" rows={5} value={form.beschreibung}
                placeholder="Details zum Event, Regeln, Altersklassen, Gewichtsklassen..."
                onChange={e => handleChange('beschreibung', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Kontakt & Links */}
        <div className="card mt-2">
          <h3 className="section-heading">Kontakt & Links</h3>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Kontakt E-Mail</label>
              <input type="email" className="form-input" value={form.kontakt_email}
                onChange={e => handleChange('kontakt_email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Website des Events</label>
              <input type="url" className="form-input" value={form.kontakt_web}
                placeholder="https://..." onChange={e => handleChange('kontakt_web', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">
                Link zur Anmeldung auf events.tda-intl.org
                <span className="form-label-hint">Turnier bereits auf der Eventsplattform? Link hier eintragen.</span>
              </label>
              <input type="url" className="form-input" value={form.events_link}
                placeholder="https://events.tda-intl.org/..."
                onChange={e => handleChange('events_link', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Dateien */}
        <div className="card mt-2">
          <h3 className="section-heading">Dateien (optional)</h3>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Banner-Bild (JPG/PNG, max. 10 MB)</label>
              <div className={`file-drop ${banner ? 'file-drop--active' : ''}`}
                onClick={() => document.getElementById('banner-input').click()}>
                {banner ? (
                  <><span style={{ fontSize: 24 }}>🖼️</span><span>{banner.name}</span></>
                ) : (
                  <><span style={{ fontSize: 24 }}>📷</span><span className="text-muted">Klicken zum Auswählen</span></>
                )}
              </div>
              <input id="banner-input" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => setBanner(e.target.files?.[0] || null)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ausschreibung (PDF, max. 10 MB)</label>
              <div className={`file-drop ${ausschreibung ? 'file-drop--active' : ''}`}
                onClick={() => document.getElementById('pdf-input').click()}>
                {ausschreibung ? (
                  <><span style={{ fontSize: 24 }}>📄</span><span>{ausschreibung.name}</span></>
                ) : (
                  <><span style={{ fontSize: 24 }}>📄</span><span className="text-muted">Klicken zum Auswählen</span></>
                )}
              </div>
              <input id="pdf-input" type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => setAusschreibung(e.target.files?.[0] || null)} />
            </div>
          </div>
        </div>

        <div className="eventform-submit mt-3">
          <Link to="/events" className="btn btn-secondary">Abbrechen</Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Einreichen...</> : '🚀 Event einreichen'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventFormPage;
