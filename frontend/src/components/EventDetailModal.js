import React, { useEffect } from 'react';
import './EventDetailModal.css';

const TYP_LABELS = {
  turnier: 'Turnier', lehrgang: 'Lehrgang', seminar: 'Seminar',
  camp: 'Camp', pruefung: 'Prüfung', sparring: 'Sparring', sonstiges: 'Sonstiges',
};

const EventDetailModal = ({ event: evt, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const formatDatum = (von, bis) => {
    const opt = { day: '2-digit', month: 'long', year: 'numeric' };
    const vonStr = new Date(von).toLocaleDateString('de-DE', opt);
    if (!bis || bis === von) return vonStr;
    return `${vonStr} – ${new Date(bis).toLocaleDateString('de-DE', opt)}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {evt.banner_url && (
          <div className="modal-banner" style={{ backgroundImage: `url(${evt.banner_url})` }} />
        )}

        <div className="modal-body">
          <div className="modal-typ">{TYP_LABELS[evt.typ] || evt.typ}</div>
          <h2 className="modal-titel">{evt.titel}</h2>

          <div className="modal-meta-grid">
            <div className="modal-meta-item">
              <span className="modal-meta-icon">📅</span>
              <div>
                <div className="modal-meta-label">Datum</div>
                <div className="modal-meta-value">{formatDatum(evt.datum_von, evt.datum_bis)}</div>
              </div>
            </div>
            {evt.ort && (
              <div className="modal-meta-item">
                <span className="modal-meta-icon">📍</span>
                <div>
                  <div className="modal-meta-label">Ort</div>
                  <div className="modal-meta-value">{evt.ort}{evt.adresse && <><br /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{evt.adresse}</span></>}</div>
                </div>
              </div>
            )}
            {evt.kampfsportart && (
              <div className="modal-meta-item">
                <span className="modal-meta-icon">🥋</span>
                <div>
                  <div className="modal-meta-label">Kampfsportart</div>
                  <div className="modal-meta-value">{evt.kampfsportart}</div>
                </div>
              </div>
            )}
            {evt.teilnahmegebuehr && (
              <div className="modal-meta-item">
                <span className="modal-meta-icon">💶</span>
                <div>
                  <div className="modal-meta-label">Teilnahmegebühr</div>
                  <div className="modal-meta-value">{evt.teilnahmegebuehr}</div>
                </div>
              </div>
            )}
            <div className="modal-meta-item">
              <span className="modal-meta-icon">👤</span>
              <div>
                <div className="modal-meta-label">Veranstalter</div>
                <div className="modal-meta-value">{evt.veranstalter_name}</div>
              </div>
            </div>
          </div>

          {evt.beschreibung && (
            <div className="modal-beschreibung">
              <h4>Beschreibung</h4>
              <p>{evt.beschreibung}</p>
            </div>
          )}

          <div className="modal-actions">
            {evt.ausschreibung_url && (
              <a href={evt.ausschreibung_url} target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary">
                📄 Ausschreibung öffnen
              </a>
            )}
            {evt.kontakt_email && (
              <a href={`mailto:${evt.kontakt_email}`} className="btn btn-secondary">
                ✉️ Kontakt
              </a>
            )}
            {evt.kontakt_web && (
              <a href={evt.kontakt_web} target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary">
                🌐 Website
              </a>
            )}
            {evt.events_link && (
              <a href={evt.events_link} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary">
                🏆 Zur Anmeldung
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
