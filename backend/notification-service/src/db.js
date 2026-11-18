const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'notification_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

// Une connexion inactive peut être coupée (PostgreSQL arrêté ou redémarré).
// On l'écrit dans la console au lieu de faire planter tout le service (et donc les emails).
pool.on('error', (err) => {
  console.error('Connexion PostgreSQL perdue :', err.message);
});

module.exports = pool;