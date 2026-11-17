const crypto = require('crypto');
const express = require('express');
const { pool } = require('./db');
const config = require('./config');
const { HttpError } = require('./errors');
const { sendNotification } = require('./notificationClient');

const router = express.Router();

const ALLOWED_TYPES = ['EVENT_UPDATED', 'EVENT_CANCELLED'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => crypto.createHash('sha256').update(String(value)).digest();

// Réservé à event-services : en-tête "X-Internal-Key" (config.internalApiKey).
router.use((req, res, next) => {
  const received = req.get('X-Internal-Key') || '';
  if (!crypto.timingSafeEqual(hash(received), hash(config.internalApiKey))) {
    throw new HttpError(403, 'Forbidden');
  }
  next();
});

// POST /internal/events/:id/notify
// Prévient tous les inscrits actifs d'un événement (modifié ou annulé).
router.post('/:id/notify', async (req, res) => {
  const eventId = Number(req.params.id);
  const { type, eventTitle, refund } = req.body || {};

  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new HttpError(400, 'Invalid event id');
  }
  if (!ALLOWED_TYPES.includes(type)) {
    throw new HttpError(400, 'Invalid notification type');
  }

  const result = await pool.query(
    "SELECT DISTINCT account_id FROM registrations WHERE event_id = $1 AND status <> 'CANCELLED'",
    [eventId]
  );
  const accountIds = result.rows.map((row) => row.account_id);

  // événement supprimé : ses inscriptions sont annulées aussi
  if (type === 'EVENT_CANCELLED') {
    await pool.query(
      "UPDATE registrations SET status = 'CANCELLED' WHERE event_id = $1 AND status <> 'CANCELLED'",
      [eventId]
    );
  }

  res.status(202).json({ recipients: accountIds.length });

  const variables = {
    eventTitle,
    refund: String(refund === true || refund === 'true'),
  };

  // envoi en arrière-plan, un par un, pour ne pas surcharger notification-service
  (async () => {
    for (const accountId of accountIds) {
      sendNotification(accountId, type, variables);
      await sleep(300);
    }
  })();
});

module.exports = router;