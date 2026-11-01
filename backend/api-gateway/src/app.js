const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const requestId = require('./middlewares/requestId');
const blockInternal = require('./middlewares/blockInternal');
const createAuthMiddleware = require('./middlewares/auth');
const createRateLimiters = require('./middlewares/rateLimit');
const createProxies = require('./proxy');
const { sendError } = require('./errors');

function createApp(config, { logger = true } = {}) {
  const app = express();
  app.disable('x-powered-by');

  const limiters = createRateLimiters(config);

  app.use(requestId);
  if (logger) {
    morgan.token('id', (req) => req.id);
    app.use(morgan(':id :remote-addr :method :url :status :res[content-length] - :response-time ms'));
  }
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // no Origin header = not a browser (curl, Postman, server to server)
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600
    })
  );

  // health check (no JWT, no rate limit)
  app.get('/health', (req, res) => res.json({ status: 'UP', service: 'api-gateway' }));

  app.use(blockInternal);
  app.use(limiters.global);
  app.use(limiters.authOnly);
  app.use(createAuthMiddleware(config));

  // IMPORTANT: no express.json() here, the proxy must forward the raw body untouched
  createProxies(config).forEach((proxy) => app.use(proxy));

  app.use((req, res) => sendError(req, res, 404, 'Route not found'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (!logger) return sendError(req, res, 500, 'Unexpected error');
    console.error(`[${req.id}]`, err);
    sendError(req, res, 500, 'Unexpected error');
  });

  return app;
}

module.exports = createApp;