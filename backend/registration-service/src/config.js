require('dotenv').config();

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or shorter than 32 characters.');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 8084,
  jwtSecret: secret,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  eventServiceUrl: process.env.EVENT_SERVICE_URL,
};