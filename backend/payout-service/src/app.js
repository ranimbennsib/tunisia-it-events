const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { sendError } = require('./errors');
const createRoutes = require('./routes');
const { createPayoutService } = require('./services/payoutService');
const { createPayoutRepository } = require('./repositories/payoutRepository');
const { createPaymentClient } = require('./clients/paymentClient');

// "deps" lets the tests replace the database and payment-service by fakes.
function createApp(config, deps = {}) {
  const { db } = deps;

  const repository = deps.payoutRepository || (db ? createPayoutRepository(db) : undefined);
  const paymentClient =
    deps.paymentClient ||
    createPaymentClient({
      baseUrl: config.paymentServiceUrl,
      internalKey: config.internalKey
    });
  const payoutService =
    deps.payoutService || createPayoutService({ repository, paymentClient,  notify: deps.notify || null,adminNotify: deps.adminNotify || null});

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  if (config.logRequests) app.use(morgan('dev'));
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', async (req, res) => {
    let dbStatus = 'UNKNOWN';
    if (db) {
      try {
        await db.query('SELECT 1');
        dbStatus = 'UP';
      } catch (err) {
        dbStatus = 'DOWN';
      }
    }
    const healthy = dbStatus !== 'DOWN';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'UP' : 'DEGRADED',
      service: 'payout-service',
      db: dbStatus
    });
  });

  app.use(createRoutes(config, payoutService));

  app.use((req, res) => sendError(req, res, 404, 'Route not found'));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return sendError(req, res, 400, 'Invalid JSON body');
    if (err.type === 'entity.too.large') return sendError(req, res, 413, 'Request body too large');
    console.error(err);
    return sendError(req, res, 500, 'Internal server error');
  });

  return app;
}

module.exports = createApp;
