const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { authenticateToken, requireAuth, requireActiveUser } = require('../middleware/auth');

// ── Multer (Banner + PDF) ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImg = file.mimetype.startsWith('image/');
    const dir = path.join(__dirname, '..', 'uploads', isImg ? 'banner' : 'ausschreibungen');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `event_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedImg = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedPdf = ['.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if ([...allowedImg, ...allowedPdf].includes(ext)) return cb(null, true);
    cb(new Error('Nur JPG, PNG, WEBP oder PDF erlaubt.'));
  },
});

// ── GET /api/events — Öffentliche Übersicht ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { typ, kampfsportart, datum_von, suche, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT e.*, u.vorname, u.nachname, u.profilbild,
             COALESCE(vp.organisation, CONCAT(u.vorname, ' ', u.nachname)) as veranstalter_name
      FROM events e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN veranstalter_profile vp ON vp.user_id = e.user_id
      WHERE e.status = 'freigegeben'
    `;
    const params = [];

    if (typ) { query += ' AND e.typ = ?'; params.push(typ); }
    if (kampfsportart) { query += ' AND e.kampfsportart LIKE ?'; params.push(`%${kampfsportart}%`); }
    if (datum_von) { query += ' AND e.datum_von >= ?'; params.push(datum_von); }
    if (suche) {
      query += ' AND (e.titel LIKE ? OR e.ort LIKE ? OR e.kampfsportart LIKE ?)';
      params.push(`%${suche}%`, `%${suche}%`, `%${suche}%`);
    }

    query += ' ORDER BY e.datum_von ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, events: rows });
  } catch (err) {
    console.error('❌ GET /events:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// ── GET /api/events/meine — Eigene Events ─────────────────────────────────────
router.get('/meine', authenticateToken, requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, events: rows });
  } catch (err) {
    console.error('❌ GET /events/meine:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// ── GET /api/events/:id — Einzelnes Event ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, u.vorname, u.nachname, u.profilbild,
              COALESCE(vp.organisation, CONCAT(u.vorname, ' ', u.nachname)) as veranstalter_name
       FROM events e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN veranstalter_profile vp ON vp.user_id = e.user_id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Event nicht gefunden.' });
    res.json({ success: true, event: rows[0] });
  } catch (err) {
    console.error('❌ GET /events/:id:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// ── POST /api/events — Event einreichen ───────────────────────────────────────
router.post('/', authenticateToken, requireAuth, requireActiveUser,
  upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'ausschreibung', maxCount: 1 }]),
  async (req, res) => {
    const {
      titel, typ, datum_von, datum_bis, ort, adresse,
      kampfsportart, beschreibung, teilnahmegebuehr,
      kontakt_email, kontakt_web, events_link,
    } = req.body;

    if (!titel || !typ || !datum_von) {
      return res.status(400).json({ success: false, error: 'Titel, Typ und Datum sind Pflichtfelder.' });
    }

    const bannerUrl = req.files?.banner?.[0]
      ? `/uploads/banner/${req.files.banner[0].filename}` : null;
    const ausschreibungUrl = req.files?.ausschreibung?.[0]
      ? `/uploads/ausschreibungen/${req.files.ausschreibung[0].filename}` : null;

    try {
      const [result] = await pool.execute(
        `INSERT INTO events
          (user_id, titel, typ, datum_von, datum_bis, ort, adresse, kampfsportart,
           beschreibung, ausschreibung_url, banner_url, teilnahmegebuehr,
           kontakt_email, kontakt_web, events_link, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'eingereicht')`,
        [req.user.id, titel, typ, datum_von, datum_bis || null, ort || null, adresse || null,
         kampfsportart || null, beschreibung || null, ausschreibungUrl, bannerUrl,
         teilnahmegebuehr || null, kontakt_email || null, kontakt_web || null, events_link || null]
      );

      res.status(201).json({ success: true, eventId: result.insertId, message: 'Event eingereicht. Wird vom Admin geprüft.' });
    } catch (err) {
      console.error('❌ POST /events:', err.message);
      res.status(500).json({ success: false, error: 'Serverfehler.' });
    }
  }
);

// ── PUT /api/events/:id — Event bearbeiten ────────────────────────────────────
router.put('/:id', authenticateToken, requireAuth, requireActiveUser,
  upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'ausschreibung', maxCount: 1 }]),
  async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: 'Event nicht gefunden.' });

      const evt = rows[0];
      if (!['entwurf', 'eingereicht', 'abgelehnt'].includes(evt.status)) {
        return res.status(400).json({ success: false, error: 'Freigegebene Events können nicht bearbeitet werden.' });
      }

      const {
        titel, typ, datum_von, datum_bis, ort, adresse,
        kampfsportart, beschreibung, teilnahmegebuehr,
        kontakt_email, kontakt_web, events_link,
      } = req.body;

      const bannerUrl = req.files?.banner?.[0]
        ? `/uploads/banner/${req.files.banner[0].filename}` : evt.banner_url;
      const ausschreibungUrl = req.files?.ausschreibung?.[0]
        ? `/uploads/ausschreibungen/${req.files.ausschreibung[0].filename}` : evt.ausschreibung_url;

      await pool.execute(
        `UPDATE events SET
          titel = ?, typ = ?, datum_von = ?, datum_bis = ?, ort = ?, adresse = ?,
          kampfsportart = ?, beschreibung = ?, ausschreibung_url = ?, banner_url = ?,
          teilnahmegebuehr = ?, kontakt_email = ?, kontakt_web = ?, events_link = ?,
          status = 'eingereicht', ablehnungsgrund = NULL, updated_at = NOW()
         WHERE id = ?`,
        [titel, typ, datum_von, datum_bis || null, ort || null, adresse || null,
         kampfsportart || null, beschreibung || null, ausschreibungUrl, bannerUrl,
         teilnahmegebuehr || null, kontakt_email || null, kontakt_web || null,
         events_link || null, req.params.id]
      );

      res.json({ success: true, message: 'Event aktualisiert und erneut eingereicht.' });
    } catch (err) {
      console.error('❌ PUT /events/:id:', err.message);
      res.status(500).json({ success: false, error: 'Serverfehler.' });
    }
  }
);

// ── DELETE /api/events/:id — Event löschen ────────────────────────────────────
router.delete('/:id', authenticateToken, requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, status FROM events WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Event nicht gefunden.' });
    if (rows[0].status === 'freigegeben') {
      return res.status(400).json({ success: false, error: 'Freigegebene Events können nicht gelöscht werden.' });
    }

    await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event gelöscht.' });
  } catch (err) {
    console.error('❌ DELETE /events/:id:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

module.exports = router;
