// Calls to the /internal routes of payment-service (header X-Internal-Key).
// Amounts stay in MILLIMES between the services.

function serviceError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createPaymentClient({ baseUrl, internalKey, timeoutMs = 5000, fetchImpl = fetch }) {
  async function call(path, options = {}) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...options,
        headers: {
          'X-Internal-Key': internalKey,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      // network error or timeout: we do NOT know if the request was handled
      throw serviceError(503, 'Payment service is unavailable');
    }
    return response;
  }

  // Successful payments not yet paid out. organizerId is optional.
  async function getUnpaid(organizerId) {
    const query = organizerId ? `?organizerId=${encodeURIComponent(organizerId)}` : '';
    const response = await call(`/internal/payments/unpaid${query}`);
    if (!response.ok) {
      throw serviceError(503, `Payment service returned HTTP ${response.status}`);
    }
    const body = await response.json();
    return body.payments || [];
  }

  // Amounts per organizer and per event (all organizers when organizerId is omitted).
  async function getSummary(organizerId) {
    const query = organizerId ? `?organizerId=${encodeURIComponent(organizerId)}` : '';
    const response = await call(`/internal/payments/summary${query}`);
    if (!response.ok) {
      throw serviceError(503, `Payment service returned HTTP ${response.status}`);
    }
    const body = await response.json();
    return body.events || [];
  }

  // Links payments to a payout. Repeating the same call is safe (idempotent).
  // Returns { linked: true }, or { linked: false } when payment-service answers 409
  // (all or nothing: in this case NOTHING was linked).
  async function markPaidOut(payoutId, paymentIds) {
    const response = await call('/internal/payments/mark-paid-out', {
      method: 'POST',
      body: JSON.stringify({ payoutId, paymentIds })
    });
    if (response.status === 409) return { linked: false };
    if (!response.ok) {
      throw serviceError(503, `Payment service returned HTTP ${response.status}`);
    }
    return { linked: true };
  }

  return { getUnpaid, getSummary, markPaidOut };
}

module.exports = { createPaymentClient };
