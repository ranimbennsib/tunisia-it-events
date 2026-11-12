const express = require('express');
const { pool } = require('./db');
const { authenticate, requireRole } = require('./auth');
const { HttpError } = require('./errors');
const { getEvent } = require('./eventClient');

const router = express.Router();

// GET /api/registrations/me  (any logged-in user)
router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM registrations WHERE account_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(result.rows);
});

// POST /api/registrations  (USER only)
router.post('/', authenticate, requireRole('USER'), async (req, res) => {
  const eventId = req.body.eventId;

  // 1. eventId must be a positive integer
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new HttpError(400, 'eventId must be a positive integer');
  }

  // 2. the event must exist and be APPROVED
  const event = await getEvent(eventId);
  if (!event || event.status !== 'APPROVED') {
    throw new HttpError(404, 'Event not found');
  }

  // 3. the event must not have started
  // NOTE: the field name (startDate) is a guess, we will check it against your event JSON
  if (new Date(event.startDate) <= new Date()) {
    throw new HttpError(400, 'Event has already started');
  }

  // 4. is this person already registered?
  const existing = await pool.query(
    'SELECT * FROM registrations WHERE event_id = $1 AND account_id = $2',
    [eventId, req.user.id]
  );
  const old = existing.rows[0];
  if (old && old.status !== 'CANCELLED') {
    throw new HttpError(409, 'Already registered');
  }

  // 5. capacity: count active registrations
  const count = await pool.query(
    `SELECT COUNT(*)::int AS n FROM registrations
     WHERE event_id = $1 AND status <> 'CANCELLED'`,
    [eventId]
  );
  if (event.capacity != null && count.rows[0].n >= event.capacity) {
    throw new HttpError(409, 'Event is full');
  }

  // 6. status depends on the payment mode
  const status = event.paymentMode === 'ONLINE' ? 'PENDING_PAYMENT' : 'CONFIRMED';

  // 7. reactivate the old row, or insert a new one
  let saved;
  if (old) {
    saved = await pool.query(
      'UPDATE registrations SET status = $1, created_at = NOW() WHERE id = $2 RETURNING *',
      [status, old.id]
    );
  } else {
    saved = await pool.query(
      'INSERT INTO registrations (event_id, account_id, status) VALUES ($1, $2, $3) RETURNING *',
      [eventId, req.user.id, status]
    );
  }

  res.status(201).json(saved.rows[0]);
});

// GET /api/registrations/event/:id/count  (public)
router.get('/event/:id/count', async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new HttpError(400, 'Invalid event id');
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM registrations
     WHERE event_id = $1 AND status <> 'CANCELLED'`,
    [eventId]
  );
  res.json({ eventId, count: result.rows[0].n });
});

// GET /api/registrations/event/:id  (owning organizer or admin)
router.get('/event/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new HttpError(400, 'Invalid event id');
  }

  const event = await getEvent(eventId);
  if (!event) {
    throw new HttpError(404, 'Event not found');
  }

  if (req.user.role !== 'ADMIN' && Number(event.organizerId) !== req.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const result = await pool.query(
    'SELECT * FROM registrations WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  res.json(result.rows);
});

// DELETE /api/registrations/:id  (the owner)
router.delete('/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(404, 'Registration not found');
  }

  // account_id is in the WHERE clause, so someone else's registration
  // looks exactly like one that doesn't exist (404).
  const result = await pool.query(
    `UPDATE registrations SET status = 'CANCELLED'
     WHERE id = $1 AND account_id = $2 AND status <> 'CANCELLED'
     RETURNING *`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Registration not found');
  }
  res.json(result.rows[0]);
});

module.exports = router;