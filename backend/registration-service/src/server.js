const config = require('./config');
const { initDb } = require('./db');
const app = require('./app');

async function start() {
  await initDb();
  console.log(`Connected to database ${config.db.database} on ${config.db.host}:${config.db.port}`);

  app.listen(config.port, () => {
    console.log(`registration-service listening on port ${config.port}`);
    console.log(`Event service: ${config.eventServiceUrl}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});