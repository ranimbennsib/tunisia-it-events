const config = require('./config');

const MAX_VALUE_LENGTH = 500;

// Garde seulement des textes, coupés à 500 caractères (limite de notification-service).
function clean(variables) {
  const result = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== null && value !== undefined && value !== '') {
      result[key] = String(value).slice(0, MAX_VALUE_LENGTH);
    }
  }
  return result;
}

// Demande un email à notification-service.
// Ne bloque jamais l'opération appelante : en cas d'erreur, on écrit seulement un avertissement.
function sendNotification(accountId, type, variables = {}) {
  fetch(`${config.notificationServiceUrl}/internal/notifications/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': config.internalApiKey,
    },
    body: JSON.stringify({ accountId, type, variables: clean(variables) }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (!res.ok) {
        console.warn(`Notification ${type} refused for account ${accountId}: HTTP ${res.status}`);
      }
    })
    .catch((err) => {
      console.warn(`Notification ${type} not sent for account ${accountId}: ${err.message}`);
    });
}

module.exports = { sendNotification };