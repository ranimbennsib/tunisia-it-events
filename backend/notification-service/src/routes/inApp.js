const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Toutes les routes exigent un token valide : chacun ne voit que SES notifications.
router.use(auth);

// Si la base est indisponible, on répond 503 sans montrer de détail technique.
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('Notifications dans l\'application : erreur :', err.message);
    res.status(503).json({ error: 'Notifications are temporarily unavailable' });
  }
};

const format = (row) => ({
  id: Number(row.id),
  type: row.type,
  message: row.message,
  eventId: row.event_id === null ? null : Number(row.event_id),
  read: row.is_read,
  sentAt: row.sent_at,
});

// GET /api/notifications?page=0&size=20&unreadOnly=false
router.get('/', handle(async (req, res) => {
  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 20, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
  const unreadOnly = req.query.unreadOnly === 'true';

  const rows = await pool.query(
    `SELECT id, type, message, event_id, is_read, sent_at
     FROM notification
     WHERE account_id = $1 AND ($2::boolean = false OR is_read = false)
     ORDER BY sent_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [req.user.id, unreadOnly, size, page * size]
  );
  const unread = await pool.query(
    'SELECT COUNT(*)::int AS n FROM notification WHERE account_id = $1 AND is_read = false',
    [req.user.id]
  );

  res.json({
    notifications: rows.rows.map(format),
    unreadCount: unread.rows[0].n,
    page,
    size,
  });
}));

// GET /api/notifications/unread-count  (pour le petit chiffre de la cloche)
router.get('/unread-count', handle(async (req, res) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS n FROM notification WHERE account_id = $1 AND is_read = false',
    [req.user.id]
  );
  res.json({ count: result.rows[0].n });
}));

// PATCH /api/notifications/read-all  (tout marquer comme lu)
router.patch('/read-all', handle(async (req, res) => {
  const result = await pool.query(
    'UPDATE notification SET is_read = true WHERE account_id = $1 AND is_read = false',
    [req.user.id]
  );
  res.json({ updated: result.rowCount });
}));

// PATCH /api/notifications/:id/read  (marquer une notification comme lue)
router.patch('/:id/read', handle(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  // account_id est dans le WHERE : la notification d'un autre ressemble à une inexistante (404)
  const result = await pool.query(
    `UPDATE notification SET is_read = true
     WHERE id = $1 AND account_id = $2
     RETURNING id, type, message, event_id, is_read, sent_at`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  res.json(format(result.rows[0]));
}));

module.exports = router;