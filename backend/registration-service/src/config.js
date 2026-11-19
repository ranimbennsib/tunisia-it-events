require('dotenv').config();

const secret = process.env.JWT_SECRET;
const internalKey = process.env.INTERNAL_KEY;

if (!secret || secret.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or shorter than 32 characters.');
  process.exit(1);
}

if (!internalKey || internalKey.length < 16) {
  console.error('FATAL: INTERNAL_KEY is missing or shorter than 16 characters.');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 8084,
  jwtSecret: secret,
  internalKey,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  eventServiceUrl: process.env.EVENT_SERVICE_URL,
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
  internalApiKey: process.env.INTERNAL_API_KEY,
};