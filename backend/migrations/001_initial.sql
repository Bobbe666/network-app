-- TDA Network — Initiale Datenbankstruktur
-- Migration 001

CREATE DATABASE IF NOT EXISTS network CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE network;

-- ── Nutzer ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  vorname      VARCHAR(100) NOT NULL,
  nachname     VARCHAR(100) NOT NULL,
  role         ENUM('sportler','veranstalter','dojo','admin') NOT NULL DEFAULT 'sportler',
  status       ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  profilbild   VARCHAR(500) DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Token-Blacklist (Logout) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_blacklist (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  jti        VARCHAR(36) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jti (jti),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Sportlerprofil (Phase 2 — Tabelle schon vorbereitet) ─────────────────────
CREATE TABLE IF NOT EXISTS sportler_profile (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  geburtsdatum    DATE DEFAULT NULL,
  geschlecht      ENUM('m','w','d') DEFAULT NULL,
  nationalitaet   VARCHAR(100) DEFAULT NULL,
  dojo_verein     VARCHAR(200) DEFAULT NULL,
  -- Kampfsportarten & Graduierungen als JSON-Array
  kampfsportarten JSON DEFAULT NULL,
  -- Gewichtsklasse für Turniere (kompatibel zu events.tda-intl.org)
  gewicht         DECIMAL(5,2) DEFAULT NULL,
  groesse         SMALLINT DEFAULT NULL,
  biografie       TEXT DEFAULT NULL,
  website         VARCHAR(500) DEFAULT NULL,
  instagram       VARCHAR(200) DEFAULT NULL,
  facebook        VARCHAR(200) DEFAULT NULL,
  sichtbarkeit    ENUM('public','private') NOT NULL DEFAULT 'public',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Veranstalterprofil (Phase 2) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS veranstalter_profile (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  organisation VARCHAR(300) DEFAULT NULL,
  beschreibung TEXT DEFAULT NULL,
  website      VARCHAR(500) DEFAULT NULL,
  adresse      VARCHAR(500) DEFAULT NULL,
  logo         VARCHAR(500) DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Events (Phase 3 — Tabelle schon vorbereitet) ─────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  titel            VARCHAR(300) NOT NULL,
  typ              ENUM('turnier','lehrgang','seminar','camp','pruefung','sparring','sonstiges') NOT NULL,
  datum_von        DATE NOT NULL,
  datum_bis        DATE DEFAULT NULL,
  ort              VARCHAR(300) DEFAULT NULL,
  adresse          VARCHAR(500) DEFAULT NULL,
  kampfsportart    VARCHAR(200) DEFAULT NULL,
  beschreibung     TEXT DEFAULT NULL,
  ausschreibung_url VARCHAR(500) DEFAULT NULL,
  banner_url       VARCHAR(500) DEFAULT NULL,
  teilnahmegebuehr VARCHAR(100) DEFAULT NULL,
  kontakt_email    VARCHAR(255) DEFAULT NULL,
  kontakt_web      VARCHAR(500) DEFAULT NULL,
  events_link      VARCHAR(500) DEFAULT NULL,  -- Link zu events.tda-intl.org
  status           ENUM('entwurf','eingereicht','freigegeben','abgelehnt') NOT NULL DEFAULT 'eingereicht',
  ablehnungsgrund  TEXT DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_datum (datum_von),
  INDEX idx_typ (typ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Admin-Nutzer anlegen (Passwort: Network2024! — BITTE SOFORT ÄNDERN!) ──────
-- Passwort-Hash für "Network2024!" (bcrypt, rounds=12)
INSERT IGNORE INTO users (email, password_hash, vorname, nachname, role, status)
VALUES (
  'info@tda-intl.com',
  '$2a$12$6qH3UAhi.RRzJWdw0LW3tO.0XKmii6y.LliEruo4MGqKzZWh1s9eu',
  'Admin',
  'TDA',
  'admin',
  'active'
);
