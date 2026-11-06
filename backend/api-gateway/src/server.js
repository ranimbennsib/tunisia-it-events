require('dotenv').config();
const { buildConfig } = require('./config');
const createApp = require('./app');

const config = buildConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`api-gateway listening on http://localhost:${config.port}`);
  console.log(`CORS origins : ${config.corsOrigins.join(', ')}`);
  console.log(`Strip /api   : ${config.stripApiPrefix}`);
  Object.entries(config.services).forEach(([name, url]) => console.log(`  ${name.padEnd(13)} -> ${url}`));
});