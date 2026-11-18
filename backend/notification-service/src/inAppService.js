const pool = require('./db');
const { getAdminIds } = require('./accountClient');

// Les messages sont écrits ICI : l'appelant ne fournit jamais le texte.
function pendingReviewMessage(eventTitle, update) {
  const title = String(eventTitle).slice(0, 300);
  return update
    ? `Event updated and waiting for review: "${title}"`
    : `New event to review: "${title}"`;
}

// Une notification « événement à valider » pour chaque admin actif.
// Un admin qui a déjà une notification non lue pour le même événement n'en reçoit pas une deuxième.
// Retourne le nombre de notifications créées.
async function notifyAdminsPendingReview({ eventId, eventTitle, update }) {
  const { ids } = await getAdminIds();
  if (ids.length === 0) {
    return 0;
  }

  const result = await pool.query(
    `INSERT INTO notification (account_id, type, message, event_id)
     SELECT t.admin_id, 'EVENT_PENDING_REVIEW', $2::varchar, $3::bigint
     FROM unnest($1::bigint[]) AS t(admin_id)
     WHERE NOT EXISTS (
       SELECT 1 FROM notification n
       WHERE n.account_id = t.admin_id
         AND n.type = 'EVENT_PENDING_REVIEW'
         AND n.event_id = $3::bigint
         AND n.is_read = false
     )`,
    [ids, pendingReviewMessage(eventTitle, update), eventId]
  );
  return result.rowCount;
}

// L'événement a été validé, rejeté ou supprimé : ses notifications passent en « lues ».
// Retourne le nombre de notifications marquées comme lues.
async function resolvePendingReview(eventId) {
  const result = await pool.query(
    `UPDATE notification SET is_read = true
     WHERE type = 'EVENT_PENDING_REVIEW' AND event_id = $1 AND is_read = false`,
    [eventId]
  );
  return result.rowCount;
}

module.exports = { notifyAdminsPendingReview, resolvePendingReview };