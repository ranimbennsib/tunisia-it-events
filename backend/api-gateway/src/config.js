function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function buildConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 characters long');
  }

  return {
    port: toInt(env.PORT, 8080),
    jwtSecret,
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:4200')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    stripApiPrefix: toBool(env.STRIP_API_PREFIX, false),
        // services that expect URLs WITHOUT "/api" (example: STRIP_API_PREFIX_SERVICES=profile)
    stripApiPrefixServices: (env.STRIP_API_PREFIX_SERVICES || '')
      .split(',')
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
    rateLimit: {
      authWindowMs: toInt(env.AUTH_RATE_WINDOW_MS, 15 * 60 * 1000),
      authMax: toInt(env.AUTH_RATE_MAX, 10),
      globalWindowMs: toInt(env.RATE_WINDOW_MS, 60 * 1000),
      globalMax: toInt(env.RATE_MAX, 300)
    },
    services: {
      account: env.ACCOUNT_SERVICE_URL || 'http://localhost:8081',
      profile: env.PROFILE_SERVICE_URL || 'http://localhost:8082',
      event: env.EVENT_SERVICE_URL || 'http://localhost:8083',
      registration: env.REGISTRATION_SERVICE_URL || 'http://localhost:8084',
      payment: env.PAYMENT_SERVICE_URL || 'http://localhost:8085',
      payout: env.PAYOUT_SERVICE_URL || 'http://localhost:8086',
      notification: env.NOTIFICATION_SERVICE_URL || 'http://localhost:8087'
    }
  };
}

module.exports = { buildConfig };