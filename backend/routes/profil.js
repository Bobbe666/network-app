const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { authenticateToken, requireAuth } = require('../middleware/auth');

// ── Multer (Avatar-Upload) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatare');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Nur JPG, PNG oder WEBP erlaubt.'));
    }
  },
});

// Alle Routen brauchen Auth
router.use(authenticateToken, requireAuth);

// ── GET /api/profil — eigenes Profil laden ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [userRows] = await pool.execute(
      'SELECT id, email, vorname, nachname, role, status, profilbild, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (userRows.length === 0) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden.' });

    const user = userRows[0];

    // Sportlerprofil laden (falls vorhanden)
    let profil = null;
    if (user.role === 'sportler') {
      const [rows] = await pool.execute(
        'SELECT * FROM sportler_profile WHERE user_id = ?',
        [req.user.id]
      );
      profil = rows[0] || null;
      if (profil && typeof profil.kampfsportarten === 'string') {
        try { profil.kampfsportarten = JSON.parse(profil.kampfsportarten); } catch { profil.kampfsportarten = []; }
      }
    }

    // Veranstalterprofil laden
    let veranstalterprofil = null;
    if (user.role === 'veranstalter' || user.role === 'dojo') {
      const [rows] = await pool.execute(
        'SELECT * FROM veranstalter_profile WHERE user_id = ?',
        [req.user.id]
      );
      veranstalterprofil = rows[0] || null;
    }

    res.json({ success: true, user, profil, veranstalterprofil });
  } catch (err) {
    console.error('❌ GET /profil:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

// ── PUT /api/profil — Profil speichern ────────────────────────────────────────
router.put('/', async (req, res) => {
  const { vorname, nachname, profil, veranstalterprofil } = req.body;

  try {
    // Basisdaten aktualisieren
    if (vorname || nachname) {
      await pool.execute(
        'UPDATE users SET vorname = COALESCE(?, vorname), nachname = COALESCE(?, nachname), updated_at = NOW() WHERE id = ?',
        [vorname || null, nachname || null, req.user.id]
      );
    }

    // Sportlerprofil
    if (req.user.role === 'sportler' && profil) {
      const {
        geburtsdatum, geschlecht, nationalitaet, dojo_verein,
        kampfsportarten, gewicht, groesse, biografie,
        website, instagram, facebook, sichtbarkeit,
      } = profil;

      const kampfsportartenJson = kampfsportarten ? JSON.stringify(kampfsportarten) : null;

      const [existing] = await pool.execute(
        'SELECT id FROM sportler_profile WHERE user_id = ?', [req.user.id]
      );

      if (existing.length > 0) {
        await pool.execute(
          `UPDATE sportler_profile SET
            geburtsdatum = ?, geschlecht = ?, nationalitaet = ?, dojo_verein = ?,
            kampfsportarten = ?, gewicht = ?, groesse = ?, biografie = ?,
            website = ?, instagram = ?, facebook = ?, sichtbarkeit = ?,
            updated_at = NOW()
           WHERE user_id = ?`,
          [geburtsdatum || null, geschlecht || null, nationalitaet || null, dojo_verein || null,
           kampfsportartenJson, gewicht || null, groesse || null, biografie || null,
           website || null, instagram || null, facebook || null, sichtbarkeit || 'public',
           req.user.id]
        );
      } else {
        await pool.execute(
          `INSERT INTO sportler_profile
            (user_id, geburtsdatum, geschlecht, nationalitaet, dojo_verein,
             kampfsportarten, gewicht, groesse, biografie, website, instagram, facebook, sichtbarkeit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.id, geburtsdatum || null, geschlecht || null, nationalitaet || null, dojo_verein || null,
           kampfsportartenJson, gewicht || null, groesse || null, biografie || null,
           website || null, instagram || null, facebook || null, sichtbarkeit || 'public']
        );
      }
    }

    // Veranstalterprofil
    if ((req.user.role === 'veranstalter' || req.user.role === 'dojo') && veranstalterprofil) {
      const { organisation, beschreibung, website, adresse } = veranstalterprofil;

      const [existing] = await pool.execute(
        'SELECT id FROM veranstalter_profile WHERE user_id = ?', [req.user.id]
      );

      if (existing.length > 0) {
        await pool.execute(
          `UPDATE veranstalter_profile SET
            organisation = ?, beschreibung = ?, website = ?, adresse = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [organisation || null, beschreibung || null, website || null, adresse || null, req.user.id]
        );
      } else {
        await pool.execute(
          `INSERT INTO veranstalter_profile (user_id, organisation, beschreibung, website, adresse)
           VALUES (?, ?, ?, ?, ?)`,
          [req.user.id, organisation || null, beschreibung || null, website || null, adresse || null]
        );
      }
    }

    res.json({ success: true, message: 'Profil gespeichert.' });
  } catch (err) {
    console.error('❌ PUT /profil:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler beim Speichern.' });
  }
});

// ── POST /api/profil/avatar — Profilbild hochladen ────────────────────────────
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Kein Bild übermittelt.' });

  const avatarUrl = `/uploads/avatare/${req.file.filename}`;

  try {
    // Altes Bild löschen
    const [rows] = await pool.execute('SELECT profilbild FROM users WHERE id = ?', [req.user.id]);
    if (rows[0]?.profilbild) {
      const oldPath = path.join(__dirname, '..', rows[0].profilbild);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await pool.execute(
      'UPDATE users SET profilbild = ?, updated_at = NOW() WHERE id = ?',
      [avatarUrl, req.user.id]
    );

    res.json({ success: true, profilbild: avatarUrl });
  } catch (err) {
    console.error('❌ Avatar-Upload:', err.message);
    res.status(500).json({ success: false, error: 'Fehler beim Speichern des Bildes.' });
  }
});

// Multer-Fehler abfangen
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

// ── GET /api/profil/public/:id — Öffentliches Profil ansehen ──────────────────
router.get('/public/:id', async (req, res) => {
  try {
    const [userRows] = await pool.execute(
      `SELECT u.id, u.vorname, u.nachname, u.profilbild, u.role, u.created_at,
              sp.geburtsdatum, sp.geschlecht, sp.nationalitaet, sp.dojo_verein,
              sp.kampfsportarten, sp.biografie, sp.website, sp.instagram, sp.facebook, sp.sichtbarkeit,
              vp.organisation, vp.beschreibung, vp.website as vp_website
       FROM users u
       LEFT JOIN sportler_profile sp ON sp.user_id = u.id
       LEFT JOIN veranstalter_profile vp ON vp.user_id = u.id
       WHERE u.id = ? AND u.status = 'active'`,
      [req.params.id]
    );

    if (userRows.length === 0) return res.status(404).json({ success: false, error: 'Profil nicht gefunden.' });

    const data = userRows[0];
    if (data.sichtbarkeit === 'private' && req.user?.id !== parseInt(req.params.id)) {
      return res.status(403).json({ success: false, error: 'Dieses Profil ist privat.' });
    }

    if (data.kampfsportarten && typeof data.kampfsportarten === 'string') {
      try { data.kampfsportarten = JSON.parse(data.kampfsportarten); } catch { data.kampfsportarten = []; }
    }

    res.json({ success: true, profil: data });
  } catch (err) {
    console.error('❌ Public Profil:', err.message);
    res.status(500).json({ success: false, error: 'Serverfehler.' });
  }
});

module.exports = router;
