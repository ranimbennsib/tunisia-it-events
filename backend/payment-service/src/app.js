const {
  createPaymentRepository
} = require('./repositories/paymentRepository');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { sendError } = require('./errors');
const createRoutes = require('./routes');
const { createPaymentService } = require('./services/paymentService');

// Dépendance temporairement indisponible
function dependencyUnavailable() {
  const error = new Error(
    'The required microservice is not connected yet'
  );
  error.statusCode = 503;
  throw error;
}

// "deps.db" is optional so that tests can build the app without a database.
function createApp(config, deps = {}) {
  const { db } = deps;
  const paymentRepository =
  deps.paymentRepository ||
  (db ? createPaymentRepository(db) : undefined);
  // 1. Initialiser Payment Service
  const paymentService = deps.paymentService ||
    createPaymentService({
      repository: paymentRepository,
      simulator: deps.bankSimulator,

      // Ces fonctions seront connectées aux API
      // de Registration Service et Event Service plus tard.
      getRegistrationById:
        deps.getRegistrationById || dependencyUnavailable,

      getEventById:
        deps.getEventById || dependencyUnavailable,

      commissionRate: config.paymentCommissionRate
    });

  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());

  // Ne jamais journaliser le contenu du formulaire de paiement.
  if (config.logRequests) {
    app.use(morgan('dev'));
  }

  app.use(express.json({ limit: '10kb' }));

  // Health check
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
      service: 'payment-service',
      db: dbStatus
    });
  });

  // 2. Connecter les routes au Payment Service
  app.use(createRoutes(config, paymentService));

  // Route inexistante
  app.use((req, res) => {
    return sendError(req, res, 404, 'Route not found');
  });

  // Gestion des erreurs
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return sendError(req, res, 400, 'Invalid JSON body');
    }

    if (err.type === 'entity.too.large') {
      return sendError(req, res, 413, 'Request body too large');
    }

    console.error(err);

    return sendError(
      req,
      res,
      500,
      'Internal server error'
    );
  });

  return app;
}

module.exports = createApp;
