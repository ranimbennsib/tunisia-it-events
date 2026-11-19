require('dotenv').config();

const { buildConfig } = require('./config');
const createApp = require('./app');
const { createPool } = require('./db/pool');
const { migrate } = require('./db/migrate');
const { createNotificationClient } = require('./notificationClient');
// ============================================================
// Appels vers les autres microservices
// ============================================================

function serviceError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Appel HTTP avec délai maximum de 5 secondes.
async function callService(name, url, options = {}) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    throw serviceError(503, `${name} is unavailable`);
  }
}

// ---------- Registration Service ----------
// Lit une inscription : { id, userId, eventId, status }
async function getRegistrationById(registrationId) {
  const baseUrl =
    process.env.REGISTRATION_SERVICE_URL || 'http://localhost:8084';

  const response = await callService(
    'Registration Service',
    `${baseUrl}/internal/registrations/${registrationId}`,
    { headers: { 'X-Internal-Key': process.env.INTERNAL_KEY } }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw serviceError(
      503,
      `Registration Service returned HTTP ${response.status}`
    );
  }

  return response.json();
}

// Confirme l'inscription après un paiement réussi (PENDING_PAYMENT -> CONFIRMED).
async function confirmRegistration(registrationId) {
  const baseUrl =
    process.env.REGISTRATION_SERVICE_URL || 'http://localhost:8084';

  const response = await callService(
    'Registration Service',
    `${baseUrl}/internal/registrations/${registrationId}/confirm`,
    {
      method: 'POST',
      headers: { 'X-Internal-Key': process.env.INTERNAL_KEY }
    }
  );

  if (!response.ok) {
    throw serviceError(
      503,
      `Registration Service returned HTTP ${response.status}`
    );
  }

  return response.json();
}

// ---------- Event Service ----------
async function getEventById(eventId) {
  const baseUrl =
    process.env.EVENT_SERVICE_URL || 'http://localhost:8083';

  const response = await callService(
    'Event Service',
    `${baseUrl}/api/events/${eventId}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw serviceError(
      503,
      `Event Service returned HTTP ${response.status}`
    );
  }

  return response.json();
}


async function main() {
  const config = buildConfig();
  const db = createPool(config.db);

  try {
    await migrate(db);
  } catch (err) {
    if (err.code === '3D000') {
      throw new Error(
        `Database "${config.db.database}" does not exist: create it in pgAdmin first`
      );
    }

    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        `Cannot reach PostgreSQL on ${config.db.host}:${config.db.port}: is it running, and is DB_PORT correct?`
      );
    }

    throw err;
  }
// Emails (reçu, échec...) : actif seulement si l'URL et la clé sont configurées.
  const notify = createNotificationClient({
    baseUrl: process.env.NOTIFICATION_SERVICE_URL,
    internalKey: process.env.NOTIFICATION_INTERNAL_KEY
  });
  // Injection des dépendances dans le Payment Service.
  const app = createApp(config, {
    db,
    getRegistrationById,
    confirmRegistration,
    getEventById,
    notify
  });

  const server = app.listen(config.port, () => {
    console.log(`payment-service listening on http://localhost:${config.port}`);
    console.log(`database: ${config.db.database} on ${config.db.host}:${config.db.port}`);
    console.log(`registration-service: ${config.registrationServiceUrl}`);
    console.log(`event-service: ${config.eventServiceUrl}`);
  });

  const shutdown = () => {
    server.close(() => db.end().finally(() => process.exit(0)));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});