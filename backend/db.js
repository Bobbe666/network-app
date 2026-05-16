require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'network',
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  charset: 'utf8mb4',
  timezone: '+00:00',
  ssl: false,
  supportBigNumbers: true,
  bigNumberStrings: true,
});

// SET NAMES utf8mb4 auf jeder Pool-Verbindung (Umlaut-Fix)
pool.pool.on('connection', (connection) => {
  connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
    console.log('✅ DB-Verbindung OK — Datenbank:', process.env.DB_NAME || 'network');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ DB-Verbindung fehlgeschlagen:', err.message);
    return false;
  }
}

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

testConnection();

module.exports = { pool, testConnection };
