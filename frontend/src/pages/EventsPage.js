import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import EventDetailModal from '../components/EventDetailModal';
import './EventsPage.css';

const TYP_LABELS = {
  turnier: 'Turnier', lehrgang: 'Lehrgang', seminar: 'Seminar',
  camp: 'Camp', pruefung: 'Prüfung', sparring: 'Sparring', sonstiges: 'Sonstiges',
};

const TYP_ICONS = {
  turnier: '🏆', lehrgang: '📚', seminar: '🎓',
  camp: '⛺', pruefung: '🥋', sparring: '🤜', sonstiges: '📌',
};

const TYP_FARBEN = {
  turnier: '#c9a84c', lehrgang: '#4a90d9', seminar: '#7c6dd9',
  camp: '#4caf7a', pruefung: '#e07040', sparring: '#e05555', sonstiges: '#808080',
};

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ typ: '', kampfsportart: '', datum_von: '', suche: '' });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.typ) params.typ = filter.typ;
      if (filter.kampfsportart) params.kampfsportart = filter.kampfsportart;
      if (filter.datum_von) params.datum_von = filter.datum_von;
      if (filter.suche) params.suche = filter.suche;
      const { data } = await axios.get('/api/events', { params });
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatDatum = (von, bis) => {
    const optionen = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const vonStr = new Date(von).toLocaleDateString('de-DE', optionen);
    if (!bis || bis === von) return vonStr;
    const bisStr = new Date(bis).toLocaleDateString('de-DE', optionen);
    return `${vonStr} – ${bisStr}`;
  };

  return (
    <div className="events-wrapper container">
      <div className="events-header">
        <div>
          <h1>Events & Turniere</h1>
          <p className="text-muted" style={{ marginTop: 4, fontSize: 14 }}>
            Turniere, Lehrgänge, Seminare und Camps der Kampfsport-Community
          </p>
        </div>
        <Link to="/events/neu" className="btn btn-primary">+ Event einreichen</Link>
      </div>

      {/* Filter */}
      <div className="events-filter card mt-3">
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Suche nach Titel, Ort oder Kampfsportart..."
          value={filter.suche}
          onChange={e => setFilter(f => ({ ...f, suche: e.target.value }))}
          style={{ flex: 2 }}
        />
        <select className="form-select" value={filter.typ}
          onChange={e => setFilter(f => ({ ...f, typ: e.target.value }))}>
          <option value="">Alle Typen</option>
          {Object.entries(TYP_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="text"
          className="form-input"
          placeholder="Kampfsportart..."
          value={filter.kampfsportart}
          onChange={e => setFilter(f => ({ ...f, kampfsportart: e.target.value }))}
          style={{ flex: 1 }}
        />
        <div className="filter-datum">
          <label className="form-label" style={{ marginBottom: 0, fontSize: 12 }}>Ab</label>
          <input type="date" className="form-input" value={filter.datum_von}
            onChange={e => setFilter(f => ({ ...f, datum_von: e.target.value }))} />
        </div>
        {(filter.typ || filter.kampfsportart || filter.datum_von || filter.suche) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => setFilter({ typ: '', kampfsportart: '', datum_von: '', suche: '' })}>
            ✕ Reset
          </button>
        )}
      </div>

      {/* Event-Grid */}
      {loading ? (
        <div className="flex-center" style={{ padding: 60 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : events.length === 0 ? (
        <div className="events-empty">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3>Keine Events gefunden</h3>
          <p className="text-muted">Versuche andere Filter oder reiche selbst ein Event ein.</p>
        </div>
      ) : (
        <div className="events-grid mt-3">
          {events.map(evt => (
            <div key={evt.id} className="event-card" onClick={() => setSelectedEvent(evt)}>
              {/* Banner oder Typ-Farbe */}
              <div className="event-card-banner"
                style={{ background: evt.banner_url ? `url(${evt.banner_url}) center/cover` : `linear-gradient(135deg, ${TYP_FARBEN[evt.typ]}22, ${TYP_FARBEN[evt.typ]}44)` }}>
                <span className="event-typ-badge" style={{ background: TYP_FARBEN[evt.typ] }}>
                  {TYP_ICONS[evt.typ]} {TYP_LABELS[evt.typ]}
                </span>
              </div>

              <div className="event-card-body">
                <h3 className="event-card-titel">{evt.titel}</h3>

                <div className="event-card-meta">
                  <span>📅 {formatDatum(evt.datum_von, evt.datum_bis)}</span>
                  {evt.ort && <span>📍 {evt.ort}</span>}
                  {evt.kampfsportart && <span>🥋 {evt.kampfsportart}</span>}
                </div>

                <div className="event-card-footer">
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    von {evt.veranstalter_name}
                  </span>
                  {evt.events_link && (
                    <a href={evt.events_link} target="_blank" rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      onClick={e => e.stopPropagation()}>
                      Anmelden
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};

export default EventsPage;
