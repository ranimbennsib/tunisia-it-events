const HOUR = 60 * 60 * 1000;

const LIMITS = {
  ACCOUNT_CREATED: { max: 2, windowMs: 24 * HOUR },
};
const DEFAULT_LIMIT = { max: 10, windowMs: HOUR };

const sent = new Map(); // "accountId:type" -> liste des heures d'envoi

function recent(accountId, type) {
  const { windowMs } = LIMITS[type] || DEFAULT_LIMIT;
  const key = `${accountId}:${type}`;
  const now = Date.now();
  const list = (sent.get(key) || []).filter((t) => now - t < windowMs);
  sent.set(key, list);
  return list;
}

function canSend(accountId, type) {
  const { max } = LIMITS[type] || DEFAULT_LIMIT;
  return recent(accountId, type).length < max;
}

function markSent(accountId, type) {
  recent(accountId, type).push(Date.now());
}

module.exports = { canSend, markSent };