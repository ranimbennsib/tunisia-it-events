const crypto = require('crypto');
const express = require('express');
const { pool } = require('./db');
const config = require('./config');
const { HttpError } = require('./errors');

const router = express.Router();

// Routes réservées aux autres services (Payment Service...).
// Elles exigent l'en-tête "X-Internal-Key".
router.use((req, res, next) => {
  const expected = Buffer.from(config.internalKey);
  const provided = Buffer.from(String(req.headers['x-internal-key'] || ''));

  const valid =
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (!valid) {
    throw new HttpError(401, 'Invalid internal key');
  }
  next();
});

function toId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid registration id');
  }
  return id;
}

// GET /internal/registrations/:id
// Utilisé par le Payment Service pour lire une inscription.
router.get('/:id', async (req, res) => {
  const id = toId(req.params.id);

  const result = await pool.query(
    'SELECT id, account_id, event_id, status FROM registrations WHERE id = $1',
    [id]
  );

  const row = result.rows[0];
  if (!row) {
    throw new HttpError(404, 'Registration not found');
  }

  res.json({
    id: row.id,
    userId: row.account_id,
    eventId: row.event_id,
    status: row.status
  });
});

// POST /internal/registrations/:id/confirm
// Appelé par le Payment Service après un paiement réussi.
// PENDING_PAYMENT -> CONFIRMED. Rejouer l'appel est sans danger.
router.post('/:id/confirm', async (req, res) => {
  const id = toId(req.params.id);

  const found = await pool.query(
    'SELECT id, account_id, event_id, status FROM registrations WHERE id = $1',
    [id]
  );

  const row = found.rows[0];
  if (!row) {
    throw new HttpError(404, 'Registration not found');
  }

  if (row.status === 'CANCELLED') {
    throw new HttpError(409, 'Registration is cancelled');
  }

  if (row.status === 'PENDING_PAYMENT') {
    await pool.query(
      "UPDATE registrations SET status = 'CONFIRMED' WHERE id = $1 AND status = 'PENDING_PAYMENT'",
      [id]
    );
  }

  res.json({
    id: row.id,
    userId: row.account_id,
    eventId: row.event_id,
    status: 'CONFIRMED'
  });
});

module.exports = router;