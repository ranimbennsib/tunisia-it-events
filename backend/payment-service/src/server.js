require('dotenv').config();

const { buildConfig } = require('./config');
const createApp = require('./app');
const { createPool } = require('./db/pool');
const { migrate } = require('./db/migrate');

// ============================================================
// TEMPORAIRE — À SUPPRIMER APRÈS LA CONNEXION DU REGISTRATION SERVICE
// Inscription fictive : registrationId = 1, userId = 5, eventId = 4.
// Générer le token avec :  npm run token -- USER 5
// ============================================================
async function getRegistrationById(registrationId) {
  const fakeRegistrations = {
    1: {
      id: 1,
      userId: 1, // CORRECTION : 5 (et non 1), comme le token de test
      eventId: 4
    }
  };

  return fakeRegistrations[Number(registrationId)] || null;
}
// FIN DE LA SIMULATION TEMPORAIRE


// ============================================================
// Connexion réelle avec le Event Service
// ============================================================
async function getEventById(eventId) {
  const baseUrl =
    process.env.EVENT_SERVICE_URL || 'http://localhost:8083';

  let response;

  try {
    response = await fetch(`${baseUrl}/api/events/${eventId}`);
  } catch (error) {
    const serviceError = new Error('Event Service is unavailable');
    serviceError.statusCode = 503;
    throw serviceError;
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const serviceError = new Error(
      `Event Service returned HTTP ${response.status}`
    );
    serviceError.statusCode = 503;
    throw serviceError;
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

  // Injection des dépendances dans le Payment Service.
  const app = createApp(config, {
    db,
    getRegistrationById,
    getEventById
  });

  const server = app.listen(config.port, () => {
    console.log(`payment-service listening on http://localhost:${config.port}`);
    console.log(`database: ${config.db.database} on ${config.db.host}:${config.db.port}`);
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