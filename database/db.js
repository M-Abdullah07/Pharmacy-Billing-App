const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Pharmax',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Qaswzx@123',
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

module.exports = pool;