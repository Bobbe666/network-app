const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET && isProduction) {
  console.error('❌ KRITISCH: JWT_SECRET nicht gesetzt!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token fehlt', code: 'NO_TOKEN' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token abgelaufen', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, error: 'Ungültiger Token', code: 'INVALID_TOKEN' });
  }

  // Token-Blacklist prüfen (Logout)
  if (decoded.jti) {
    try {
      const [rows] = await pool.execute(
        'SELECT id FROM token_blacklist WHERE jti = ? AND expires_at > NOW()',
        [decoded.jti]
      );
      if (rows.length > 0) {
        return res.status(401).json({ success: false, error: 'Token ungültig', code: 'TOKEN_REVOKED' });
      }
    } catch (dbErr) {
      console.error('❌ Blacklist-Check fehlgeschlagen:', dbErr.message);
      return res.status(503).json({ success: false, error: 'Service nicht verfügbar' });
    }
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    status: decoded.status,
    jti: decoded.jti,
  };
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Kein Admin' });
  next();
};

const requireActiveUser = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Konto noch nicht freigegeben. Bitte warte auf die Admin-Bestätigung.',
      code: 'ACCOUNT_PENDING'
    });
  }
  next();
};

module.exports = { authenticateToken, requireAuth, requireAdmin, requireActiveUser };
