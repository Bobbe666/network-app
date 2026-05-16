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

    res.json({ success: true, stats: { total, pending, active } });
  } catch (err) {
    console.error('❌ Admin stats:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

module.exports = router;
