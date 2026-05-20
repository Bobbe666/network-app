const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Alle Routen brauchen Admin
router.use(authenticateToken, requireAdmin);

// GET /api/admin/users — alle Nutzer
router.get('/users', async (req, res) => {
  try {
    const { status, role, search } = req.query;
    let query = 'SELECT id, email, vorname, nachname, role, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (search) {
      query += ' AND (vorname LIKE ? OR nachname LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('❌ Admin users:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// PATCH /api/admin/users/:id/status — Nutzer freigeben / sperren
router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'pending', 'suspended'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, error: 'Ungültiger Status.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden.' });
    }
    res.json({ success: true, message: `Status auf "${status}" gesetzt.` });
  } catch (err) {
    console.error('❌ Status-Update:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// GET /api/admin/stats — Dashboard-Zahlen
router.get('/stats', async (req, res) => {
  try {
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const [[{ pending }]] = await pool.execute("SELECT COUNT(*) as pending FROM users WHERE status = 'pending'");
    const [[{ active }]] = await pool.execute("SELECT COUNT(*) as active FROM users WHERE status = 'active'");
    const [[{ events_pending }]] = await pool.execute("SELECT COUNT(*) as events_pending FROM events WHERE status = 'eingereicht'");
    const [[{ events_total }]] = await pool.execute("SELECT COUNT(*) as events_total FROM events");

    res.json({ success: true, stats: { total, pending, active, events_pending, events_total } });
  } catch (err) {
    console.error('❌ Admin stats:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// ── Events-Verwaltung ─────────────────────────────────────────────────────────

// GET /api/admin/events — alle Events
router.get('/events', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT e.*, u.vorname, u.nachname, u.email,
             COALESCE(vp.organisation, CONCAT(u.vorname, ' ', u.nachname)) as veranstalter_name
      FROM events e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN veranstalter_profile vp ON vp.user_id = e.user_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND e.status = ?'; params.push(status); }
    query += ' ORDER BY e.created_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, events: rows });
  } catch (err) {
    console.error('❌ Admin events:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// PATCH /api/admin/events/:id/status — freigeben oder ablehnen
router.patch('/events/:id/status', async (req, res) => {
  const { status, ablehnungsgrund } = req.body;
  const allowed = ['freigegeben', 'abgelehnt', 'eingereicht'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, error: 'Ungültiger Status.' });
  }

  try {
    await pool.execute(
      'UPDATE events SET status = ?, ablehnungsgrund = ?, updated_at = NOW() WHERE id = ?',
      [status, ablehnungsgrund || null, req.params.id]
    );
    res.json({ success: true, message: `Event auf "${status}" gesetzt.` });
  } catch (err) {
    console.error('❌ Admin event status:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

module.exports = router;
