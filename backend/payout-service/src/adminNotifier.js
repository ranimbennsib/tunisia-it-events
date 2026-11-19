// Notifications dans l'application pour les admins (cloche), via notification-service.
// Retourne null si l'URL ou la clé ne sont pas configurées (rien n'est alors envoyé).
// Les appels ne bloquent jamais un virement : en cas d'erreur, un avertissement seulement.
function createAdminNotifier({ baseUrl, internalKey }) {
  if (!baseUrl || !internalKey) {
    return null;
  }

  function post(path, body, label) {
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    })
      .then((res) => {
        if (!res.ok) {
          console.warn(`Admin notification (${label}) refused: HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        console.warn(`Admin notification (${label}) not sent: ${err.message}`);
      });
  }

  return {
    // Un virement attend la confirmation d'un admin (amount en millimes).
    payoutToConfirm(payoutId, netAmount, currency) {
      post(
        '/internal/notifications/in-app/payout',
        {
          type: 'PAYOUT_TO_CONFIRM',
          payoutId: Number(payoutId),
          netAmount: Number(netAmount),
          currency: currency || 'TND'
        },
        `payout ${payoutId} to confirm`
      );
    },

    // Le virement est confirmé : la notification n'a plus de raison d'être non lue.
    payoutConfirmed(payoutId) {
      post(
        '/internal/notifications/in-app/payout/resolve',
        { type: 'PAYOUT_TO_CONFIRM', payoutId: Number(payoutId) },
        `payout ${payoutId} confirmed`
      );
    }
  };
}

module.exports = { createAdminNotifier };