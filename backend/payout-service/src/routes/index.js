const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const { sendError } = require('../errors');

function createRoutes(config, payoutService) {
  const router = express.Router();
  const auth = authenticate(config);

  // Same error handling for every route: known errors keep their status, the others give 500.
  function handle(fn) {
    return async (req, res) => {
      try {
        return await fn(req, res);
      } catch (error) {
        if (!error.statusCode) {
          console.error('Unhandled error on', req.method, req.originalUrl, error);
        }
        const status = error.statusCode || 500;
        const message = error.statusCode ? error.message : 'Internal server error';
        return sendError(req, res, status, message);
      }
    };
  }

  // ============================================================
  // ORGANIZER: bank account, balance, own payouts
  // ============================================================

  router.get('/api/payout-accounts/me', auth, requireRole('ORGANIZER'), handle(async (req, res) => {
    const account = await payoutService.getMyAccount(req.user.id);
    res.status(200).json({ success: true, account });
  }));

  // Create or replace the bank account (the full IBAN is never returned)
  router.put('/api/payout-accounts/me', auth, requireRole('ORGANIZER'), handle(async (req, res) => {
    const account = await payoutService.saveMyAccount(req.user.id, req.body);
    res.status(200).json({ success: true, account });
  }));

  // What the organizer earned, and what is still to be paid
  router.get('/api/payouts/balance', auth, requireRole('ORGANIZER'), handle(async (req, res) => {
    const balance = await payoutService.getMyBalance(req.user.id);
    res.status(200).json({ success: true, balance });
  }));

  router.get('/api/payouts/me', auth, requireRole('ORGANIZER'), handle(async (req, res) => {
    const payouts = await payoutService.listMine(req.user.id);
    res.status(200).json({ success: true, unit: 'TND', payouts });
  }));

  // Detail of one payout (declared AFTER /me and /balance). ORGANIZER: his own. ADMIN: all.
  router.get('/api/payouts/:id', auth, requireRole('ORGANIZER', 'ADMIN'), handle(async (req, res) => {
    const payout = await payoutService.getPayout(req.params.id, req.user);
    res.status(200).json({ success: true, unit: 'TND', payout });
  }));

  // ============================================================
  // ADMIN
  // ============================================================

  // Optional filters: ?status=pending&organizerId=3
  router.get('/api/admin/payouts', auth, requireRole('ADMIN'), handle(async (req, res) => {
    const payouts = await payoutService.listAll({
      status: req.query.status,
      organizerId: req.query.organizerId
    });
    res.status(200).json({ success: true, unit: 'TND', payouts });
  }));

  // What each organizer is owed (declared BEFORE /api/admin/payouts/:id)
  router.get('/api/admin/payouts/balances', auth, requireRole('ADMIN'), handle(async (req, res) => {
    const result = await payoutService.getAdminBalances();
    res.status(200).json({ success: true, ...result });
  }));

  // Creates a payout with ALL the unpaid sales of an organizer. Body: { "organizerId": 3 }
  router.post('/api/admin/payouts', auth, requireRole('ADMIN'), handle(async (req, res) => {
    const { organizerId } = req.body || {};
    const payout = await payoutService.createPayout(organizerId, req.user.id);
    res.status(201).json({ success: true, unit: 'TND', payout });
  }));

  router.get('/api/admin/payouts/:id', auth, requireRole('ADMIN'), handle(async (req, res) => {
    const payout = await payoutService.getPayout(req.params.id, req.user);
    res.status(200).json({ success: true, unit: 'TND', payout });
  }));

  // The admin confirms that the bank transfer was sent. Body (optional): { "bankReference": "TRF-123" }
  router.patch('/api/admin/payouts/:id/pay', auth, requireRole('ADMIN'), handle(async (req, res) => {
    const payout = await payoutService.markPaid(
      req.params.id,
      req.user.id,
      (req.body || {}).bankReference
    );
    res.status(200).json({ success: true, unit: 'TND', payout });
  }));

  // Retry the link with payment-service for a payout stuck in "linking"
  router.post('/api/admin/payouts/:id/relink', auth, requireRole('ADMIN'), handle(async (req, res) => {
    const payout = await payoutService.relinkPayout(req.params.id);
    res.status(200).json({ success: true, unit: 'TND', payout });
  }));

  return router;
}

module.exports = createRoutes;
