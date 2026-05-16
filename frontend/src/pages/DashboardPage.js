import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const ROLE_LABELS = { sportler: 'Sportler', veranstalter: 'Veranstalter', dojo: 'Dojo / Schule', admin: 'Administrator' };

const DashboardPage = () => {
  const { user, isActive } = useAuth();

  return (
    <div className="dashboard-wrapper container">
      <div className="dashboard-header">
        <div>
          <h1>Willkommen, <span className="text-gold">{user?.vorname}</span></h1>
          <p className="text-muted mt-1">
            {ROLE_LABELS[user?.role] || user?.role}
            {' · '}
            <span className={`badge badge-${user?.status}`}>
              {user?.status === 'pending' ? 'Wartet auf Freigabe' :
               user?.status === 'active' ? 'Aktiv' : 'Gesperrt'}
            </span>
          </p>
        </div>
      </div>

      {!isActive && (
        <div className="alert alert-warning mt-2">
          <strong>Dein Konto wartet noch auf Admin-Freigabe.</strong><br />
          Sobald dein Konto freigeschaltet ist, hast du vollen Zugriff auf alle Funktionen.
        </div>
      )}

      <div className="dashboard-grid mt-3">
        <div className="card dashboard-card">
          <div className="dashboard-card-icon">👤</div>
          <h3>Mein Profil</h3>
          <p className="text-muted">Profil vervollständigen und Kampfsportarten eintragen</p>
          <Link to="/profil" className="btn btn-secondary btn-sm mt-2">Profil bearbeiten</Link>
        </div>

        <div className="card dashboard-card">
          <div className="dashboard-card-icon">🗓️</div>
          <h3>Events entdecken</h3>
          <p className="text-muted">Turniere, Lehrgänge und Seminare in deiner Nähe</p>
          <Link to="/events" className="btn btn-secondary btn-sm mt-2">Events ansehen</Link>
        </div>

        {(user?.role === 'veranstalter' || user?.role === 'dojo') && (
          <div className="card dashboard-card">
            <div className="dashboard-card-icon">➕</div>
            <h3>Event einreichen</h3>
            <p className="text-muted">Turnier oder Lehrgang für die Community veröffentlichen</p>
            <Link to="/events/neu" className={`btn btn-primary btn-sm mt-2 ${!isActive ? 'disabled' : ''}`}>
              Event erstellen
            </Link>
          </div>
        )}

        <div className="card dashboard-card">
          <div className="dashboard-card-icon">🥋</div>
          <h3>Dojos & Schulen</h3>
          <p className="text-muted">Kampfsportschulen und Dojos finden</p>
          <Link to="/dojos" className="btn btn-secondary btn-sm mt-2">Dojos entdecken</Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
