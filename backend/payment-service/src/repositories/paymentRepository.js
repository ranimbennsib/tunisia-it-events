function createPaymentRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('A valid PostgreSQL pool must be provided');
  }

  async function create(payment) {
    const query = `
      INSERT INTO payment (
        registration_id,
        user_id,
        event_id,
        organizer_id,
        amount,
        currency,
        method,
        status,
        gateway_provider,
        transaction_ref,
        card_brand,
        card_last4,
        commission_rate,
        commission_amount,
        net_amount,
        failure_reason
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      )
      RETURNING *;
    `;

    const values = [
      payment.registrationId,
      payment.userId,
      payment.eventId,
      payment.organizerId,
      payment.amount,
      payment.currency || 'TND',
      payment.method,
      payment.status || 'pending',
      payment.gatewayProvider,
      payment.transactionRef || null,
      payment.cardBrand || null,
      payment.cardLast4 || null,
      payment.commissionRate,
      payment.commissionAmount,
      payment.netAmount,
      payment.failureReason || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async function findById(id) {
    const result = await pool.query(
      'SELECT * FROM payment WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async function findByRegistrationId(registrationId) {
    const result = await pool.query(
      `SELECT * FROM payment
       WHERE registration_id = $1
       ORDER BY created_at DESC`,
      [registrationId]
    );

    return result.rows;
  }

  async function findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM payment
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async function findAll() {
    const result = await pool.query(
      `SELECT * FROM payment
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  async function updateStatus(
    id,
    status,
    transactionRef = null,
    failureReason = null,
    cardBrand = null,
    cardLast4 = null
  ) {
    // $1::varchar évite l'erreur PostgreSQL 42P08
    // (paramètre $1 utilisé avec deux types différents).
    const query = `
      UPDATE payment
      SET
        status = $1::varchar,
        transaction_ref = COALESCE($2, transaction_ref),
        failure_reason = $3,
        card_brand = COALESCE($4, card_brand),
        card_last4 = COALESCE($5, card_last4),
        paid_at = CASE
          WHEN $1::varchar = 'paid' THEN NOW()
          ELSE paid_at
        END,
        refunded_at = CASE
          WHEN $1::varchar = 'refunded' THEN NOW()
          ELSE refunded_at
        END
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      status,
      transactionRef,
      failureReason,
      cardBrand,
      cardLast4,
      id
    ];

    const result = await pool.query(query, values);

    return result.rows[0] || null;
  }

  // Paiements réussis d'un événement (liste des payeurs).
  // organizerId : si fourni, on ne renvoie que les paiements de CET organisateur.
  async function findPaidByEventId(eventId, organizerId = null) {
    const result = await pool.query(
      `SELECT * FROM payment
       WHERE event_id = $1
         AND status = 'paid'
         AND ($2::bigint IS NULL OR organizer_id = $2::bigint)
       ORDER BY paid_at DESC`,
      [eventId, organizerId]
    );

    return result.rows;
  }

  // Paiements réussis pas encore rattachés à un virement (payout_id NULL).
  async function findUnpaidOut(organizerId = null) {
    const result = await pool.query(
      `SELECT * FROM payment
       WHERE status = 'paid'
         AND payout_id IS NULL
         AND ($1::bigint IS NULL OR organizer_id = $1::bigint)
       ORDER BY organizer_id, event_id, paid_at`,
      [organizerId]
    );

    return result.rows;
  }

  // Résumé par organisateur et par événement (montants en millimes).
  async function summaryByEvent(organizerId = null) {
    const result = await pool.query(
      `SELECT
         organizer_id,
         event_id,
         COUNT(*)::bigint                                   AS payments_count,
         SUM(amount)::bigint                                AS total_amount,
         SUM(commission_amount)::bigint                     AS total_commission,
         SUM(net_amount)::bigint                            AS total_net,
         COALESCE(SUM(net_amount) FILTER (WHERE payout_id IS NULL), 0)::bigint
                                                            AS unpaid_net,
         COALESCE(SUM(net_amount) FILTER (WHERE payout_id IS NOT NULL), 0)::bigint
                                                            AS paid_out_net
       FROM payment
       WHERE status = 'paid'
         AND ($1::bigint IS NULL OR organizer_id = $1::bigint)
       GROUP BY organizer_id, event_id
       ORDER BY organizer_id, event_id`,
      [organizerId]
    );

    return result.rows;
  }

  // Rattache des paiements à un virement, en UNE seule requête (tout ou rien).
  // Éligible : status = 'paid' et payout_id NULL (ou déjà égal à ce payoutId,
  // ce qui rend l'appel répétable sans danger).
  // Retourne les lignes modifiées, ou [] si au moins un paiement n'est pas éligible.
  async function markPaidOut(paymentIds, payoutId) {
    const result = await pool.query(
      `WITH eligible AS (
         SELECT id FROM payment
         WHERE id = ANY($2::bigint[])
           AND status = 'paid'
           AND (payout_id IS NULL OR payout_id = $1::bigint)
         FOR UPDATE
       )
       UPDATE payment
       SET payout_id = $1::bigint
       WHERE id IN (SELECT id FROM eligible)
         AND (SELECT COUNT(*) FROM eligible) = $3::int
       RETURNING *`,
      [payoutId, paymentIds, paymentIds.length]
    );

    return result.rows;
  }

  return {
    create,
    findById,
    findByRegistrationId,
    findByUserId,
    findAll,
    updateStatus,
    findPaidByEventId,
    findUnpaidOut,
    summaryByEvent,
    markPaidOut
  };
}

// Compatibilité temporaire avec les anciens tests
// qui utilisent directement le Repository sans injection.
function getLegacyRepository() {
  const pool = require('../config/database');
  return createPaymentRepository(pool);
}

const legacyRepository = {
  create: (...args) => getLegacyRepository().create(...args),
  findById: (...args) => getLegacyRepository().findById(...args),
  findByRegistrationId: (...args) =>
    getLegacyRepository().findByRegistrationId(...args),
  findByUserId: (...args) =>
    getLegacyRepository().findByUserId(...args),
  findAll: (...args) => getLegacyRepository().findAll(...args),
  updateStatus: (...args) =>
    getLegacyRepository().updateStatus(...args),
  findPaidByEventId: (...args) =>
    getLegacyRepository().findPaidByEventId(...args),
  findUnpaidOut: (...args) =>
    getLegacyRepository().findUnpaidOut(...args),
  summaryByEvent: (...args) =>
    getLegacyRepository().summaryByEvent(...args),
  markPaidOut: (...args) =>
    getLegacyRepository().markPaidOut(...args)
};

module.exports = {
  ...legacyRepository,
  createPaymentRepository
};