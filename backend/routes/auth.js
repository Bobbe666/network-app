const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, vorname, nachname, role = 'sportler' } = req.body;

  if (!email || !password || !vorname || !nachname) {
    return res.status(400).json({ success: false, error: 'Alle Pflichtfelder ausfüllen.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Passwort mindestens 8 Zeichen.' });
  }

  const allowedRoles = ['sportler', 'veranstalter', 'dojo'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Ungültige Rolle.' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'E-Mail-Adresse bereits registriert.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, vorname, nachname, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [email.toLowerCase(), passwordHash, vorname, nachname, role]
    );

    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich. Dein Konto wird vom Admin freigegeben.',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('❌ Register-Fehler:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler bei der Registrierung.' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'E-Mail und Passwort erforderlich.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, vorname, nachname, role, status FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'E-Mail oder Passwort falsch.' });
    }

    const user = rows[0];

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'E-Mail oder Passwort falsch.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Konto gesperrt. Bitte Admin kontaktieren.' });
    }

    const jti = uuidv4();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, status: user.status, jti },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        vorname: user.vorname,
        nachname: user.nachname,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('❌ Login-Fehler:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler beim Login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, requireAuth, async (req, res) => {
  if (req.user.jti) {
    try {
      await pool.execute(
        'INSERT INTO token_blacklist (jti, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 8 DAY))',
        [req.user.jti]
      );
    } catch (err) {
      console.error('❌ Logout Blacklist-Fehler:', err.message);
    }
  }
  res.json({ success: true, message: 'Erfolgreich abgemeldet.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, vorname, nachname, role, status, profilbild, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden.' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('❌ /me Fehler:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

module.exports = router;
