const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { apiLimiter } = require('./middleware/rateLimit');
const { pool } = require('./db');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5006;

// ── Security ──────────────────────────────────────────────────────────────────
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'https://network.tda-intl.org',
  'https://events.tda-intl.org',
  'https://tda-intl.org',
  'https://tda-intl.com',
  'https://tda-vib.de',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS nicht erlaubt: ' + origin));
  },
  credentials: true,
}));

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// ── Uploads statisch servieren ─────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routen ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/profil', require('./routes/profil'));
app.use('/api/events', require('./routes/events'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'TDA Network API läuft', env: process.env.NODE_ENV || 'development' });
});

// ── Frontend-Build servieren (Production) ─────────────────────────────────────
if (isProduction) {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ── Globaler Error-Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unbehandelter Fehler:', err.message);
  res.status(500).json({ success: false, error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`\n🥋 TDA Network Backend gestartet`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Modus: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API: http://localhost:${PORT}/api\n`);
});

module.exports = app;
