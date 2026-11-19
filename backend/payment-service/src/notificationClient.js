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

// Retourne une fonction sendNotification(accountId, type, variables),
// ou null si l'URL ou la clé ne sont pas configurées (aucun email n'est alors envoyé).
// La fonction ne bloque jamais l'opération appelante : en cas d'erreur, un avertissement seulement.
function createNotificationClient({ baseUrl, internalKey }) {
  if (!baseUrl || !internalKey) {
    console.warn('Emails disabled: NOTIFICATION_SERVICE_URL or NOTIFICATION_INTERNAL_KEY is missing');
    return null;
  }

  return function sendNotification(accountId, type, variables = {}) {
    fetch(`${baseUrl}/internal/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey
      },
      body: JSON.stringify({ accountId, type, variables: clean(variables) }),
      signal: AbortSignal.timeout(5000)
    })
      .then((res) => {
        if (!res.ok) {
          console.warn(`Notification ${type} refused for account ${accountId}: HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        console.warn(`Notification ${type} not sent for account ${accountId}: ${err.message}`);
      });
  };
}

module.exports = { createNotificationClient };