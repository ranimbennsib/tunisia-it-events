const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const { internalAuth } = require('../middlewares/internalAuth');
const { sendError } = require('../errors');

// Millimes (base de données) -> dinars (réponse API) : 50000 -> 50
function toTnd(millimes) {
  return millimes === null || millimes === undefined
    ? millimes
    : Number((Number(millimes) / 1000).toFixed(3));
}

function formatPayment(payment) {
  if (!payment) return payment;
  return {
    ...payment,
    amount: toTnd(payment.amount),
    commission_amount: toTnd(payment.commission_amount),
    net_amount: toTnd(payment.net_amount)
  };
}

function formatResult(result) {
  return result.payment
    ? { ...result, payment: formatPayment(result.payment) }
    : result;
}

function createRoutes(config, paymentService) {
  const router = express.Router();
  const auth = authenticate(config);
  const internal = internalAuth(config);

  // Gestion centralisée des erreurs des routes
  function handleError(req, res, error) {
    // On affiche la vraie erreur dans la console
    if (!error.statusCode) {
      console.error('Unhandled error on', req.method, req.originalUrl, error);
    }

    const statusCode = error.statusCode || 500;
    const message = error.statusCode
      ? error.message
      : 'Internal server error';

    return sendError(req, res, statusCode, message);
  }

  // ============================================================
  // PARTICIPANT
  // ============================================================

  // Participant : effectuer un paiement
  router.post(
    '/api/payments',
    auth,
    requireRole('USER'),
    async (req, res) => {
      try {
        const { registrationId, card } = req.body || {};

        const result = await paymentService.createPayment({
          userId: req.user.id,
          registrationId,
          card
        });

        if (!result.success) {
          const statusCode =
            result.type === 'INVALID_CARD' ? 400 : 402;

          return res.status(statusCode).json(formatResult(result));
        }

        return res.status(201).json(formatResult(result));

      } catch (error) {
        return handleError(req, res, error);
      }
    }
  );

  // Participant : consulter son historique
  // (doit être déclarée AVANT /api/payments/:id)
  router.get(
    '/api/payments/me',
    auth,
    requireRole('USER'),
    async (req, res) => {
      try {
        const payments = await paymentService.getMyPayments(req.user.id);

        return res.status(200).json({
          success: true,
          payments: payments.map(formatPayment)
        });

      } catch (error) {
        return handleError(req, res, error);
      }
    }
  );

  // Détail d'un paiement
  // USER : ses paiements / ORGANIZER : ceux de ses événements / ADMIN : tous
  router.get(
    '/api/payments/:id',
    auth,
    requireRole('USER', 'ORGANIZER', 'ADMIN'),
    async (req, res) => {
      try {
        const payment = await paymentService.getPaymentById(
          req.params.id,
          req.user
        );

        return res.status(200).json({
          success: true,
          payment: formatPayment(payment)
        });

      } catch (error) {
        return handleError(req, res, error);
      }
    }
  );

  // ============================================================
  // ORGANISATEUR
  // ============================================================

  // Organisateur : liste des personnes qui ont payé pour son événement
  router.get(
    '/api/organizer/events/:eventId/payments',
    auth,
    requireRole('ORGANIZER'),
    async (req, res) => {
      try {
        const payments = await paymentService.getEventPayments(
          req.params.eventId,
          req.user
        );

        return res.status(200).json({
          success: true,
          count: payments.length,
          payments: payments.map(formatPayment)
        });

      } catch (error) {
        return handleError(req, res, error);
      }
    }
  );

  // ============================================================
  // ADMINISTRATEUR
  // ============================================================

  // Administrateur : consulter tous les paiements
  router.get(
    '/api/admin/payments',
    auth,
    requireRole('ADMIN'),
    async (req, res) => {
      try {
        const payments = await paymentService.getAllPayments();

        return res.status(200).json({
          success: true,
          payments: payments.map(formatPayment)
        });

      } catch (error) {
        return handleError(req, res, error);
      }
    }
  );

  // Administrateur : liste des payeurs d'un événement
  router.get(
    '/api/admin/events/:eventId/payments',
    auth,
    requireRole('ADMIN'),
    async (req, res) => {
      try {
        const payments = await paymentService.getEventPayments(
          req.params.eventId,
          req.user
        );

        return res.status(200).json({
          success: true,
          count: payments.length,
          payments: payments.map(formatPayment)
        });

      } catch (error) {
        return handleError(req, res, error);
      }
    }
  );

  // ============================================================
  // COMMUNICATION INTERNE (Payout Service, etc.)
  // Protégée par l'en-tête X-Internal-Key.
  // Les montants restent en MILLIMES entre les services.
  // ============================================================

  router.get('/internal/ping', internal, (req, res) => {
    res.json({ ok: true, service: 'payment-service' });
  });

  // Paiements réussis pas encore versés. Filtre optionnel : ?organizerId=8
  router.get('/internal/payments/unpaid', internal, async (req, res) => {
    try {
      const payments = await paymentService.getUnpaidOut(
        req.query.organizerId
      );

      return res.status(200).json({
        success: true,
        unit: 'millimes',
        count: payments.length,
        payments
      });

    } catch (error) {
      return handleError(req, res, error);
    }
  });

  // Résumé par organisateur et par événement. Filtre optionnel : ?organizerId=8
  router.get('/internal/payments/summary', internal, async (req, res) => {
    try {
      const events = await paymentService.getSummary(
        req.query.organizerId
      );

      return res.status(200).json({
        success: true,
        unit: 'millimes',
        events
      });

    } catch (error) {
      return handleError(req, res, error);
    }
  });

  // Le Payout Service rattache des paiements à un virement.
  // Corps : { "payoutId": 12, "paymentIds": [3, 4, 5] }
  router.post('/internal/payments/mark-paid-out', internal, async (req, res) => {
    try {
      const { payoutId, paymentIds } = req.body || {};

      const payments = await paymentService.markPaidOut({
        payoutId,
        paymentIds
      });

      return res.status(200).json({
        success: true,
        unit: 'millimes',
        updated: payments.length,
        payments
      });

    } catch (error) {
      return handleError(req, res, error);
    }
  });

  return router;
}

module.exports = createRoutes;