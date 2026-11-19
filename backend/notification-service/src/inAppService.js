const pool = require('./db');
const { getAdminIds } = require('./accountClient');

// Les messages sont écrits ICI : l'appelant ne fournit jamais le texte.
function pendingReviewMessage(eventTitle, update) {
  const title = String(eventTitle).slice(0, 300);
  return update
    ? `Event updated and waiting for review: "${title}"`
    : `New event to review: "${title}"`;
}

// 95000 millimes -> "95.000 TND"
function formatAmount(millimes, currency) {
  return `${(Number(millimes) / 1000).toFixed(3)} ${currency || 'TND'}`;
}

function payoutToConfirmMessage(payoutId, netAmount, currency) {
  return `Payout #${payoutId} (${formatAmount(netAmount, currency)}) is waiting for your confirmation: send the bank transfer, then confirm it`;
}

// ---------- Événement à valider ----------

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
async function resolvePendingReview(eventId) {
  const result = await pool.query(
    `UPDATE notification SET is_read = true
     WHERE type = 'EVENT_PENDING_REVIEW' AND event_id = $1 AND is_read = false`,
    [eventId]
  );
  return result.rowCount;
}

// ---------- Virement à confirmer ----------

// Une notification « virement à confirmer » pour chaque admin actif (sans doublon non lu).
async function notifyAdminsPayoutToConfirm({ payoutId, netAmount, currency }) {
  const { ids } = await getAdminIds();
  if (ids.length === 0) {
    return 0;
  }

  const result = await pool.query(
    `INSERT INTO notification (account_id, type, message, payout_id)
     SELECT t.admin_id, 'PAYOUT_TO_CONFIRM', $2::varchar, $3::bigint
     FROM unnest($1::bigint[]) AS t(admin_id)
     WHERE NOT EXISTS (
       SELECT 1 FROM notification n
       WHERE n.account_id = t.admin_id
         AND n.type = 'PAYOUT_TO_CONFIRM'
         AND n.payout_id = $3::bigint
         AND n.is_read = false
     )`,
    [ids, payoutToConfirmMessage(payoutId, netAmount, currency), payoutId]
  );
  return result.rowCount;
}

// Le virement a été confirmé : ses notifications passent en « lues ».
async function resolvePayoutToConfirm(payoutId) {
  const result = await pool.query(
    `UPDATE notification SET is_read = true
     WHERE type = 'PAYOUT_TO_CONFIRM' AND payout_id = $1 AND is_read = false`,
    [payoutId]
  );
  return result.rowCount;
}

module.exports = {
  notifyAdminsPendingReview,
  resolvePendingReview,
  notifyAdminsPayoutToConfirm,
  resolvePayoutToConfirm,
};