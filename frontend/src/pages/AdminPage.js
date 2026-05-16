import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminPage.css';

const STATUS_LABELS = { pending: 'Wartet', active: 'Aktiv', suspended: 'Gesperrt' };
const ROLE_LABELS = { sportler: 'Sportler', veranstalter: 'Veranstalter', dojo: 'Dojo', admin: 'Admin' };

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ status: '', role: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.role) params.role = filter.role;
      if (filter.search) params.search = filter.search;

      const [usersRes, statsRes] = await Promise.all([
        axios.get('/api/admin/users', { params }),
        axios.get('/api/admin/stats'),
      ]);
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data.stats);
    } catch (err) {
      setError('Fehler beim Laden der Daten.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (userId, newStatus) => {
    setUpdating(userId);
    try {
      await axios.patch(`/api/admin/users/${userId}/status`, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      if (stats) {
        setStats(null);
        const { data } = await axios.get('/api/admin/stats');
        setStats(data.stats);
      }
    } catch (err) {
      alert('Fehler beim Status-Update.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="admin-wrapper container">
      <div className="admin-header">
        <h1>Admin-Panel <span className="text-gold">Nutzerverwaltung</span></h1>
      </div>

      {stats && (
        <div className="stats-row mt-2">
          <div className="stat-card card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Gesamt</div>
          </div>
          <div className="stat-card card">
            <div className="stat-num text-warning">{stats.pending}</div>
            <div className="stat-label">Warten auf Freigabe</div>
          </div>
          <div className="stat-card card">
            <div className="stat-num text-success">{stats.active}</div>
            <div className="stat-label">Aktive Nutzer</div>
          </div>
        </div>
      )}

      <div className="admin-filters card mt-3">
        <input
          type="text"
          placeholder="Suche nach Name oder E-Mail..."
          className="form-input"
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          style={{ flex: 1 }}
        />
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
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Registriert</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    Keine Nutzer gefunden
                  </td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {u.vorname} {u.nachname}
                    </td>
                    <td>{u.email}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-secondary)' }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span></td>
                    <td><span className={`badge badge-${u.status}`}>
                      {STATUS_LABELS[u.status] || u.status}
                    </span></td>
                    <td>{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                    <td>
                      <div className="action-btns">
                        {u.status !== 'active' && (
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(76,175,122,0.15)', color: 'var(--success)', border: '1px solid rgba(76,175,122,0.3)' }}
                            onClick={() => handleStatusChange(u.id, 'active')}
                            disabled={updating === u.id}
                          >
                            {updating === u.id ? '...' : 'Freigeben'}
                          </button>
                        )}
                        {u.status !== 'suspended' && u.role !== 'admin' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleStatusChange(u.id, 'suspended')}
                            disabled={updating === u.id}
                          >
                            Sperren
                          </button>
                        )}
                        {u.status !== 'pending' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStatusChange(u.id, 'pending')}
                            disabled={updating === u.id}
                          >
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
    </div>
  );
};

export default AdminPage;
