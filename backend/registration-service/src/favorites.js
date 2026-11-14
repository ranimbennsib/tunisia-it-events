const express = require('express');
const { pool } = require('./db');
const { authenticate } = require('./auth');
const { HttpError } = require('./errors');

const router = express.Router();

// All favorites routes need a logged-in user
router.use(authenticate);

// GET /api/favorites
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM favorites WHERE account_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(result.rows);
});

// POST /api/favorites  with {eventId}
router.post('/', async (req, res) => {
  const eventId = req.body.eventId;
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new HttpError(400, 'eventId must be a positive integer');
  }

  // ON CONFLICT DO NOTHING makes adding twice harmless
  await pool.query(
    `INSERT INTO favorites (account_id, event_id) VALUES ($1, $2)
     ON CONFLICT (account_id, event_id) DO NOTHING`,
    [req.user.id, eventId]
  );

  const result = await pool.query(
    'SELECT * FROM favorites WHERE account_id = $1 AND event_id = $2',
    [req.user.id, eventId]
  );
  res.status(201).json(result.rows[0]);
});

// DELETE /api/favorites/:eventId
router.delete('/:eventId', async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new HttpError(400, 'Invalid event id');
  }

  await pool.query(
    'DELETE FROM favorites WHERE account_id = $1 AND event_id = $2',
    [req.user.id, eventId]
  );
  res.status(204).end();
});

module.exports = router;