import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './MeineEventsPage.css';

const STATUS_INFO = {
  entwurf:      { label: 'Entwurf',    cls: 'badge-pending',   icon: '✏️' },
  eingereicht:  { label: 'In Prüfung', cls: 'badge-pending',   icon: '⏳' },
  freigegeben:  { label: 'Online',     cls: 'badge-active',    icon: '✅' },
  abgelehnt:    { label: 'Abgelehnt',  cls: 'badge-suspended', icon: '❌' },
};

const TYP_LABELS = {
  turnier: 'Turnier', lehrgang: 'Lehrgang', seminar: 'Seminar',
  camp: 'Camp', pruefung: 'Prüfung', sparring: 'Sparring', sonstiges: 'Sonstiges',
};

const MeineEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const { data } = await axios.get('/api/events/meine');
      setEvents(data.events || []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Event wirklich löschen?')) return;
    try {
      await axios.delete(`/api/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Löschen.');
    }
  };

  if (loading) return (
    <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
  );

  return (
    <div className="meine-events-wrapper container">
      <div className="meine-events-header">
        <h1>Meine Events</h1>
        <Link to="/events/neu" className="btn btn-primary">+ Neues Event</Link>
      </div>

      {events.length === 0 ? (
        <div className="card mt-3" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
          <h3>Noch keine Events</h3>
          <p className="text-muted mt-1">Reiche dein erstes Turnier oder deinen ersten Lehrgang ein.</p>
          <Link to="/events/neu" className="btn btn-primary mt-3">Event einreichen</Link>
        </div>
      ) : (
        <div className="card mt-3">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Typ</th>
                  <th>Datum</th>
                  <th>Ort</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {events.map(evt => {
                  const status = STATUS_INFO[evt.status] || STATUS_INFO.entwurf;
                  return (
                    <tr key={evt.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {evt.titel}
                        {evt.ablehnungsgrund && (
                          <div className="ablehnungsgrund">❌ {evt.ablehnungsgrund}</div>
                        )}
                      </td>
                      <td>{TYP_LABELS[evt.typ] || evt.typ}</td>
                      <td>{new Date(evt.datum_von).toLocaleDateString('de-DE')}</td>
                      <td>{evt.ort || '—'}</td>
                      <td>
                        <span className={`badge ${status.cls}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {evt.status !== 'freigegeben' && (
                            <button className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(evt.id)}>
                              Löschen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeineEventsPage;
