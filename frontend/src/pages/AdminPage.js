import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminPage.css';

const STATUS_LABELS = { pending: 'Wartet', active: 'Aktiv', suspended: 'Gesperrt' };
const ROLE_LABELS = { sportler: 'Sportler', veranstalter: 'Veranstalter', dojo: 'Dojo', admin: 'Admin' };
const EVT_STATUS_LABELS = { eingereicht: 'In Prüfung', freigegeben: 'Online', abgelehnt: 'Abgelehnt', entwurf: 'Entwurf' };
const EVT_STATUS_BADGE = { eingereicht: 'badge-pending', freigegeben: 'badge-active', abgelehnt: 'badge-suspended', entwurf: '' };
const TYP_LABELS = {
  turnier: 'Turnier', lehrgang: 'Lehrgang', seminar: 'Seminar',
  camp: 'Camp', pruefung: 'Prüfung', sparring: 'Sparring', sonstiges: 'Sonstiges',
};

// ── Nutzer-Panel ──────────────────────────────────────────────────────────────
const NutzerPanel = ({ stats, onStatsUpdate }) => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ status: '', role: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.role) params.role = filter.role;
      if (filter.search) params.search = filter.search;
      const { data } = await axios.get('/api/admin/users', { params });
      setUsers(data.users || []);
    } catch { setError('Fehler beim Laden.'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleStatusChange = async (userId, newStatus) => {
    setUpdating(userId);
    try {
      await axios.patch(`/api/admin/users/${userId}/status`, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      onStatsUpdate();
    } catch { alert('Fehler beim Status-Update.'); }
    finally { setUpdating(null); }
  };

  return (
    <>
      <div className="admin-filters card mt-3">
        <input type="text" placeholder="Suche nach Name oder E-Mail..." className="form-input"
          value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ flex: 1 }} />
        <select className="form-select" value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">Alle Status</option>
          <option value="pending">Wartet</option>
          <option value="active">Aktiv</option>
          <option value="suspended">Gesperrt</option>
        </select>
        <select className="form-select" value={filter.role}
          onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
          <option value="">Alle Rollen</option>
          <option value="sportler">Sportler</option>
          <option value="veranstalter">Veranstalter</option>
          <option value="dojo">Dojo</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="card mt-2">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th>Registriert</th><th>Aktionen</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Keine Nutzer gefunden</td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.vorname} {u.nachname}</td>
                    <td>{u.email}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-secondary)' }}>{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td><span className={`badge badge-${u.status}`}>{STATUS_LABELS[u.status] || u.status}</span></td>
                    <td>{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                    <td>
                      <div className="action-btns">
                        {u.status !== 'active' && (
                          <button className="btn btn-sm" style={{ background: 'rgba(76,175,122,0.15)', color: 'var(--success)', border: '1px solid rgba(76,175,122,0.3)' }}
                            onClick={() => handleStatusChange(u.id, 'active')} disabled={updating === u.id}>
                            {updating === u.id ? '...' : 'Freigeben'}
                          </button>
                        )}
                        {u.status !== 'suspended' && u.role !== 'admin' && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleStatusChange(u.id, 'suspended')} disabled={updating === u.id}>
                            Sperren
                          </button>
                        )}
                        {u.status !== 'pending' && (
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => handleStatusChange(u.id, 'pending')} disabled={updating === u.id}>
                            Pending
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// ── Events-Panel ──────────────────────────────────────────────────────────────
const EventsPanel = ({ onStatsUpdate }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('eingereicht');
  const [updating, setUpdating] = useState(null);
  const [ablehnModal, setAblehnModal] = useState(null);
  const [ablehnGrund, setAblehnGrund] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get('/api/admin/events', { params });
      setEvents(data.events || []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const setStatus = async (id, status, ablehnungsgrund) => {
    setUpdating(id);
    try {
      await axios.patch(`/api/admin/events/${id}/status`, { status, ablehnungsgrund });
      await loadEvents();
      onStatsUpdate();
    } catch { alert('Fehler beim Status-Update.'); }
    finally { setUpdating(null); setAblehnModal(null); setAblehnGrund(''); }
  };

  return (
    <>
      <div className="admin-filters card mt-3">
        <select className="form-select" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="eingereicht">In Prüfung</option>
          <option value="freigegeben">Online</option>
          <option value="abgelehnt">Abgelehnt</option>
        </select>
      </div>

      <div className="card mt-2">
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Titel</th><th>Typ</th><th>Datum</th><th>Veranstalter</th><th>Status</th><th>Aktionen</th></tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Keine Events gefunden</td></tr>
                ) : events.map(evt => (
                  <tr key={evt.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {evt.titel}
                      {evt.ablehnungsgrund && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 3 }}>{evt.ablehnungsgrund}</div>}
                    </td>
                    <td>{TYP_LABELS[evt.typ] || evt.typ}</td>
                    <td>{new Date(evt.datum_von).toLocaleDateString('de-DE')}</td>
                    <td>{evt.veranstalter_name}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{evt.email}</span></td>
                    <td><span className={`badge ${EVT_STATUS_BADGE[evt.status] || ''}`}>{EVT_STATUS_LABELS[evt.status] || evt.status}</span></td>
                    <td>
                      <div className="action-btns">
                        {evt.status !== 'freigegeben' && (
                          <button className="btn btn-sm" style={{ background: 'rgba(76,175,122,0.15)', color: 'var(--success)', border: '1px solid rgba(76,175,122,0.3)' }}
                            onClick={() => setStatus(evt.id, 'freigegeben')} disabled={updating === evt.id}>
                            {updating === evt.id ? '...' : '✅ Freigeben'}
                          </button>
                        )}
                        {evt.status !== 'abgelehnt' && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => { setAblehnModal(evt.id); setAblehnGrund(''); }} disabled={updating === evt.id}>
                            ❌ Ablehnen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ablehnungs-Modal */}
      {ablehnModal && (
        <div className="modal-backdrop" onClick={() => setAblehnModal(null)}>
          <div className="ablehn-modal card" onClick={e => e.stopPropagation()}>
            <h3>Event ablehnen</h3>
            <p className="text-muted mt-1" style={{ fontSize: 14 }}>Ablehnungsgrund (wird dem Einreicher angezeigt):</p>
            <textarea className="form-input mt-2" rows={3} value={ablehnGrund}
              placeholder="z.B. Unvollständige Angaben, fehlende Ausschreibung..."
              onChange={e => setAblehnGrund(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setAblehnModal(null)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={() => setStatus(ablehnModal, 'abgelehnt', ablehnGrund)}>
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('nutzer');
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/stats');
      setStats(data.stats);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="admin-wrapper container">
      <div className="admin-header">
        <h1>Admin-Panel <span className="text-gold">Verwaltung</span></h1>
      </div>

      {stats && (
        <div className="stats-row mt-2">
          <div className="stat-card card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Nutzer gesamt</div>
          </div>
          <div className="stat-card card">
            <div className="stat-num text-warning">{stats.pending}</div>
            <div className="stat-label">Nutzer in Prüfung</div>
          </div>
          <div className="stat-card card">
            <div className="stat-num text-success">{stats.active}</div>
            <div className="stat-label">Aktive Nutzer</div>
          </div>
          <div className="stat-card card">
            <div className="stat-num text-warning">{stats.events_pending}</div>
            <div className="stat-label">Events in Prüfung</div>
          </div>
          <div className="stat-card card">
            <div className="stat-num">{stats.events_total}</div>
            <div className="stat-label">Events gesamt</div>
          </div>
        </div>
      )}

      <div className="admin-tabs mt-3">
        <button className={`tab-btn ${activeTab === 'nutzer' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('nutzer')}>
          👥 Nutzer {stats?.pending > 0 && <span className="tab-badge">{stats.pending}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'events' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('events')}>
          🗓️ Events {stats?.events_pending > 0 && <span className="tab-badge">{stats.events_pending}</span>}
        </button>
      </div>

      {activeTab === 'nutzer' && <NutzerPanel stats={stats} onStatsUpdate={loadStats} />}
      {activeTab === 'events' && <EventsPanel onStatsUpdate={loadStats} />}
    </div>
  );
};

export default AdminPage;
