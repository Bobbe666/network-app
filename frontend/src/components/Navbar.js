import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">🥋</span>
          <span>TDA <strong>Network</strong></span>
        </Link>

        <div className="navbar-links">
          <Link to="/events" className="navbar-link">Events</Link>
          {user && <Link to="/events/meine" className="navbar-link">Meine Events</Link>}
          <Link to="/dojos" className="navbar-link">Dojos</Link>
          <Link to="/sportler" className="navbar-link">Sportler</Link>
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="navbar-link text-gold">Admin</Link>
              )}
              <Link to="/profil" className="navbar-link">
                {user.vorname}
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Abmelden
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Anmelden</Link>
              <Link to="/registrieren" className="btn btn-primary btn-sm">Registrieren</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
