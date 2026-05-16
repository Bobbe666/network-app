const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Zu viele Anfragen, bitte später erneut versuchen.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Max 20 Login-Versuche pro 15 Min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Zu viele Login-Versuche. Bitte 15 Minuten warten.' },
});

module.exports = { apiLimiter, authLimiter };
