import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './ProfilPage.css';

const KAMPFSPORTARTEN_OPTIONEN = [
  'Taekwondo', 'Karate', 'Judo', 'Jiu-Jitsu', 'Brazilian Jiu-Jitsu',
  'Kickboxen', 'Muay Thai', 'Boxen', 'Ringen', 'Sambo',
  'Hapkido', 'Aikido', 'Kung Fu', 'MMA', 'Kendo',
  'Poomsae', 'Sonstige',
];

const GRADUIERUNGEN = [
  '9. Kyu / Weißgurt', '8. Kyu', '7. Kyu', '6. Kyu', '5. Kyu',
  '4. Kyu', '3. Kyu', '2. Kyu', '1. Kyu / Braungurt',
  '1. Dan', '2. Dan', '3. Dan', '4. Dan', '5. Dan',
  '6. Dan', '7. Dan', '8. Dan', '9. Dan',
];

const TABS = {
  sportler: ['Grunddaten', 'Kampfsport', 'Social & Links'],
  veranstalter: ['Grunddaten', 'Organisation', 'Social & Links'],
  dojo: ['Grunddaten', 'Organisation', 'Social & Links'],
  admin: ['Grunddaten'],
};

const ProfilPage = () => {
  const { user, loadUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    vorname: '', nachname: '',
    profil: {
      geburtsdatum: '', geschlecht: '', nationalitaet: '', dojo_verein: '',
      kampfsportarten: [], gewicht: '', groesse: '',
      biografie: '', website: '', instagram: '', facebook: '',
      sichtbarkeit: 'public',
    },
    veranstalterprofil: {
      organisation: '', beschreibung: '', website: '', adresse: '',
    },
  });

  const [neueKampfsportart, setNeueKampfsportart] = useState({ art: '', graduierung: '', seit: '' });
  const [profilbild, setProfilbild] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/profil');
        if (data.success) {
          setProfilbild(data.user.profilbild);
          setForm(f => ({
            ...f,
            vorname: data.user.vorname || '',
            nachname: data.user.nachname || '',
            profil: data.profil ? {
              geburtsdatum: data.profil.geburtsdatum?.split('T')[0] || '',
              geschlecht: data.profil.geschlecht || '',
              nationalitaet: data.profil.nationalitaet || '',
              dojo_verein: data.profil.dojo_verein || '',
              kampfsportarten: Array.isArray(data.profil.kampfsportarten) ? data.profil.kampfsportarten : [],
              gewicht: data.profil.gewicht || '',
              groesse: data.profil.groesse || '',
              biografie: data.profil.biografie || '',
              website: data.profil.website || '',
              instagram: data.profil.instagram || '',
              facebook: data.profil.facebook || '',
              sichtbarkeit: data.profil.sichtbarkeit || 'public',
            } : f.profil,
            veranstalterprofil: data.veranstalterprofil ? {
              organisation: data.veranstalterprofil.organisation || '',
              beschreibung: data.veranstalterprofil.beschreibung || '',
              website: data.veranstalterprofil.website || '',
              adresse: data.veranstalterprofil.adresse || '',
            } : f.veranstalterprofil,
          }));
        }
      } catch (err) {
        setError('Profil konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const handleProfilChange = (field, value) => setForm(f => ({ ...f, profil: { ...f.profil, [field]: value } }));
  const handleVeranstalterChange = (field, value) => setForm(f => ({ ...f, veranstalterprofil: { ...f.veranstalterprofil, [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const { data } = await axios.put('/api/profil', form);
      if (data.success) {
        setSuccess('Profil erfolgreich gespeichert.');
        loadUser();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Fehler beim Speichern.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verbindungsfehler.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await axios.post('/api/profil/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        setProfilbild(data.profilbild);
        loadUser();
      }
    } catch (err) {
      setError('Fehler beim Hochladen des Bildes.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addKampfsportart = () => {
    if (!neueKampfsportart.art) return;
    setForm(f => ({
      ...f,
      profil: {
        ...f.profil,
        kampfsportarten: [...f.profil.kampfsportarten, { ...neueKampfsportart }],
      },
    }));
    setNeueKampfsportart({ art: '', graduierung: '', seit: '' });
  };

  const removeKampfsportart = (idx) => {
    setForm(f => ({
      ...f,
      profil: {
        ...f.profil,
        kampfsportarten: f.profil.kampfsportarten.filter((_, i) => i !== idx),
      },
    }));
  };

  if (loading) return (
    <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
  );

  const tabs = TABS[user?.role] || ['Grunddaten'];
  const initials = `${form.vorname?.[0] || ''}${form.nachname?.[0] || ''}`.toUpperCase();

  return (
    <div className="profil-wrapper container">
      {/* Header */}
      <div className="profil-header card">
        <div className="avatar-section">
          <div className="avatar-container" onClick={() => fileInputRef.current?.click()}>
            {profilbild ? (
              <img src={profilbild} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{initials || '?'}</div>
            )}
            <div className="avatar-overlay">
              {uploadingAvatar ? <div className="spinner" style={{ width: 20, height: 20 }} /> : '📷'}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          <div>
            <h2 className="profil-name">{form.vorname} {form.nachname}</h2>
            <p className="text-muted" style={{ fontSize: 13 }}>{user?.email}</p>
            <div className="mt-1" style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-active" style={{ fontSize: 11 }}>
                {user?.role === 'sportler' ? 'Sportler' : user?.role === 'veranstalter' ? 'Veranstalter' : user?.role === 'dojo' ? 'Dojo' : 'Admin'}
              </span>
              {user?.status === 'pending' && (
                <span className="badge badge-pending" style={{ fontSize: 11 }}>Wartet auf Freigabe</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <label className="sichtbarkeit-toggle">
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Profil öffentlich</span>
            <input
              type="checkbox"
              checked={form.profil.sichtbarkeit === 'public'}
              onChange={e => handleProfilChange('sichtbarkeit', e.target.checked ? 'public' : 'private')}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="profil-tabs mt-3">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === i ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      <div className="card mt-2">
        {success && <div className="alert alert-success mb-2">{success}</div>}
        {error && <div className="alert alert-error mb-2">{error}</div>}

        {/* Tab 0: Grunddaten */}
        {activeTab === 0 && (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Vorname</label>
              <input type="text" className="form-input" value={form.vorname}
                onChange={e => handleChange('vorname', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nachname</label>
              <input type="text" className="form-input" value={form.nachname}
                onChange={e => handleChange('nachname', e.target.value)} />
            </div>

            {user?.role === 'sportler' && <>
              <div className="form-group">
                <label className="form-label">Geburtsdatum</label>
                <input type="date" className="form-input" value={form.profil.geburtsdatum}
                  onChange={e => handleProfilChange('geburtsdatum', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Geschlecht</label>
                <select className="form-select" value={form.profil.geschlecht}
                  onChange={e => handleProfilChange('geschlecht', e.target.value)}>
                  <option value="">— bitte wählen —</option>
                  <option value="m">Männlich</option>
                  <option value="w">Weiblich</option>
                  <option value="d">Divers</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nationalität</label>
                <input type="text" className="form-input" value={form.profil.nationalitaet}
                  placeholder="z.B. Deutsch" onChange={e => handleProfilChange('nationalitaet', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Verein / Dojo</label>
                <input type="text" className="form-input" value={form.profil.dojo_verein}
                  placeholder="Name des Vereins" onChange={e => handleProfilChange('dojo_verein', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Gewicht (kg)</label>
                <input type="number" step="0.1" className="form-input" value={form.profil.gewicht}
                  placeholder="z.B. 73.5" onChange={e => handleProfilChange('gewicht', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Größe (cm)</label>
                <input type="number" className="form-input" value={form.profil.groesse}
                  placeholder="z.B. 178" onChange={e => handleProfilChange('groesse', e.target.value)} />
              </div>
              <div className="form-group form-group--full">
                <label className="form-label">Biografie</label>
                <textarea className="form-input" rows={4} value={form.profil.biografie}
                  placeholder="Erzähle etwas über dich und deine Kampfsportkarriere..."
                  onChange={e => handleProfilChange('biografie', e.target.value)} />
              </div>
            </>}
          </div>
        )}

        {/* Tab 1: Kampfsport (nur Sportler) */}
        {activeTab === 1 && user?.role === 'sportler' && (
          <div>
            <h3 className="section-title">Meine Kampfsportarten</h3>

            {/* Bestehende Einträge */}
            {form.profil.kampfsportarten.length > 0 && (
              <div className="ks-list">
                {form.profil.kampfsportarten.map((ks, idx) => (
                  <div key={idx} className="ks-item">
                    <div className="ks-item-info">
                      <strong>{ks.art}</strong>
                      {ks.graduierung && <span className="text-gold"> · {ks.graduierung}</span>}
                      {ks.seit && <span className="text-muted"> · seit {ks.seit}</span>}
                    </div>
                    <button onClick={() => removeKampfsportart(idx)} className="btn btn-danger btn-sm">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Neue Kampfsportart hinzufügen */}
            <div className="ks-add-form">
              <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Kampfsportart hinzufügen</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Kampfsportart</label>
                  <select className="form-select" value={neueKampfsportart.art}
                    onChange={e => setNeueKampfsportart(n => ({ ...n, art: e.target.value }))}>
                    <option value="">— wählen —</option>
                    {KAMPFSPORTARTEN_OPTIONEN.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Graduierung</label>
                  <select className="form-select" value={neueKampfsportart.graduierung}
                    onChange={e => setNeueKampfsportart(n => ({ ...n, graduierung: e.target.value }))}>
                    <option value="">— optional —</option>
                    {GRADUIERUNGEN.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Seit (Jahr)</label>
                  <input type="number" className="form-input" value={neueKampfsportart.seit}
                    placeholder="z.B. 2015" min="1950" max={new Date().getFullYear()}
                    onChange={e => setNeueKampfsportart(n => ({ ...n, seit: e.target.value }))} />
                </div>
              </div>
              <button onClick={addKampfsportart} className="btn btn-primary btn-sm" disabled={!neueKampfsportart.art}>
                + Hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Organisation (Veranstalter / Dojo) */}
        {activeTab === 1 && (user?.role === 'veranstalter' || user?.role === 'dojo') && (
          <div className="form-grid">
            <div className="form-group form-group--full">
              <label className="form-label">Name der Organisation / des Dojos</label>
              <input type="text" className="form-input" value={form.veranstalterprofil.organisation}
                onChange={e => handleVeranstalterChange('organisation', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Beschreibung</label>
              <textarea className="form-input" rows={4} value={form.veranstalterprofil.beschreibung}
                onChange={e => handleVeranstalterChange('beschreibung', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Adresse</label>
              <input type="text" className="form-input" value={form.veranstalterprofil.adresse}
                placeholder="Straße, PLZ Ort" onChange={e => handleVeranstalterChange('adresse', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Website</label>
              <input type="url" className="form-input" value={form.veranstalterprofil.website}
                placeholder="https://..." onChange={e => handleVeranstalterChange('website', e.target.value)} />
            </div>
          </div>
        )}

        {/* Tab 2: Social & Links */}
        {activeTab === 2 && (
          <div className="form-grid">
            <div className="form-group form-group--full">
              <label className="form-label">Website</label>
              <input type="url" className="form-input" value={form.profil.website}
                placeholder="https://..." onChange={e => handleProfilChange('website', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input type="text" className="form-input" value={form.profil.instagram}
                placeholder="@benutzername" onChange={e => handleProfilChange('instagram', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Facebook</label>
              <input type="text" className="form-input" value={form.profil.facebook}
                placeholder="Profilname oder URL" onChange={e => handleProfilChange('facebook', e.target.value)} />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label" style={{ marginBottom: 8 }}>Events-Anbindung</label>
              <div className="events-link-box">
                <span>🔗</span>
                <div>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                    events.tda-intl.org Verknüpfung
                  </p>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Mit deinem Profil kannst du dich direkt für Turniere auf events.tda-intl.org anmelden.
                    Die Verbindung wird in einer späteren Version aktiviert.
                  </p>
                </div>
                <span className="badge badge-pending" style={{ flexShrink: 0 }}>Bald</span>
              </div>
            </div>
          </div>
        )}

        <div className="profil-save-bar">
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Speichern...</> : 'Profil speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilPage;
