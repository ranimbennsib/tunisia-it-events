const { Pool, types } = require('pg');

// By default pg returns BIGINT and NUMERIC as strings. Amounts are stored in millimes
// (integers far below 2^53), so it is safe to read them as JavaScript numbers.
types.setTypeParser(20, (value) => parseInt(value, 10));    // BIGINT
types.setTypeParser(1700, (value) => parseFloat(value));    // NUMERIC

function createPool(dbConfig) {
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    max: 10,
    connectionTimeoutMillis: 5000
  });

  pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
  });

  return pool;
}

module.exports = { createPool };