const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'asm_rbac',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  decimalNumbers:     true,
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected →', process.env.DB_NAME || 'asm_rbac');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection FAILED:', err.message);
    process.exit(1);
  });

module.exports = pool;
