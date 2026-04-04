const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'asm_rbac',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected →', process.env.DB_NAME || 'asm_rbac');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection FAILED:', err.message);
    console.error('   Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in backend/.env');
    process.exit(1);
  });

module.exports = pool;
