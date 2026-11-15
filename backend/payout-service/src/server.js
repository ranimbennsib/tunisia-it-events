require('dotenv').config();

const { buildConfig } = require('./config');
const createApp = require('./app');
const { createPool } = require('./db/pool');
const { migrate } = require('./db/migrate');

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

  const app = createApp(config, { db });

  const server = app.listen(config.port, () => {
    console.log(`payout-service listening on http://localhost:${config.port}`);
    console.log(`database: ${config.db.database} on ${config.db.host}:${config.db.port}`);
    console.log(`payment-service: ${config.paymentServiceUrl}`);
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
