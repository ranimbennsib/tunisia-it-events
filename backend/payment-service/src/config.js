function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 characters long');
  }
  const internalKey = env.INTERNAL_KEY;
  if (!internalKey || internalKey.length < 16) {
    throw new Error('INTERNAL_KEY is required and must be at least 16 characters long');
  }
  if (!env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD is required');
  }

  return {
    port: toInt(env.PORT, 8085),
    jwtSecret,
    internalKey,
    // CORRECTION : ces deux valeurs manquaient
    paymentCommissionRate: Number(env.PAYMENT_COMMISSION_RATE ?? 5),
    eventServiceUrl: env.EVENT_SERVICE_URL || 'http://localhost:8083',
    logRequests: env.NODE_ENV !== 'test',
    db: {
      host: env.DB_HOST || 'localhost',
      port: toInt(env.DB_PORT, 5432),
      database: env.DB_NAME || 'payment_db',
      user: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD
    }
  };
}

module.exports = { buildConfig };