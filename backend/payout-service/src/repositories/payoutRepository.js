// All the SQL of the payout-service. Every query is parameterised ($1, $2...).
function createPayoutRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('A valid PostgreSQL pool must be provided');
  }

  // ---------- Bank account ----------

  async function findAccountByOrganizer(organizerId) {
    const result = await pool.query(
      'SELECT * FROM payout_account WHERE organizer_id = $1',
      [organizerId]
    );
    return result.rows[0] || null;
  }

  // One account per organizer: create it, or replace the details.
  async function upsertAccount({ organizerId, holderName, bankName, iban }) {
    const result = await pool.query(
      `INSERT INTO payout_account (organizer_id, holder_name, bank_name, iban)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organizer_id) DO UPDATE
         SET holder_name = EXCLUDED.holder_name,
             bank_name   = EXCLUDED.bank_name,
             iban        = EXCLUDED.iban,
             updated_at  = now()
       RETURNING *`,
      [organizerId, holderName, bankName, iban]
    );
    return result.rows[0];
  }

  async function organizerIdsWithAccount() {
    const result = await pool.query('SELECT organizer_id FROM payout_account');
    return result.rows.map((r) => Number(r.organizer_id));
  }

  // ---------- Payouts ----------

  // Creates the payout and its items in ONE transaction (all or nothing).
  // A payment already in another payout breaks the UNIQUE(payment_id): error code 23505.
  async function createWithItems(payout, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query(
        `INSERT INTO payout (
           organizer_id, status, currency, payments_count,
           total_amount, total_commission, net_amount,
           holder_name, bank_name, iban, created_by
         )
         VALUES ($1, 'linking', 'TND', $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          payout.organizerId,
          items.length,
          payout.totalAmount,
          payout.totalCommission,
          payout.netAmount,
          payout.holderName,
          payout.bankName,
          payout.iban,
          payout.createdBy
        ]
      );
      const row = created.rows[0];

      for (const it of items) {
        await client.query(
          `INSERT INTO payout_item
             (payout_id, payment_id, event_id, amount, commission_amount, net_amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.id, it.paymentId, it.eventId, it.amount, it.commissionAmount, it.netAmount]
        );
      }

      await client.query('COMMIT');
      return row;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async function findById(id) {
    const result = await pool.query('SELECT * FROM payout WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async function findItems(payoutId) {
    const result = await pool.query(
      'SELECT * FROM payout_item WHERE payout_id = $1 ORDER BY payment_id',
      [payoutId]
    );
    return result.rows;
  }

  async function findByOrganizer(organizerId) {
    const result = await pool.query(
      'SELECT * FROM payout WHERE organizer_id = $1 ORDER BY created_at DESC, id DESC',
      [organizerId]
    );
    return result.rows;
  }

  // Optional filters: status, organizerId.
  async function findAll({ status = null, organizerId = null } = {}) {
    const result = await pool.query(
      `SELECT * FROM payout
       WHERE ($1::text IS NULL OR status = $1::text)
         AND ($2::bigint IS NULL OR organizer_id = $2::bigint)
       ORDER BY created_at DESC, id DESC`,
      [status, organizerId]
    );
    return result.rows;
  }

  // linking -> pending (payment-service confirmed the link)
  async function markLinked(id) {
    const result = await pool.query(
      `UPDATE payout SET status = 'pending'
       WHERE id = $1 AND status = 'linking'
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  // linking -> cancelled, and the payments are released (items deleted) so that
  // they can be part of a new payout. Only valid when payment-service linked NOTHING.
  async function cancelLinking(id, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE payout SET status = 'cancelled', cancel_reason = $2
         WHERE id = $1 AND status = 'linking'
         RETURNING *`,
        [id, reason]
      );
      if (result.rows[0]) {
        await client.query('DELETE FROM payout_item WHERE payout_id = $1', [id]);
      }
      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  // pending -> paid. The WHERE makes it atomic: two admins clicking together, only one wins.
  async function markPaid(id, { adminId, bankReference }) {
    const result = await pool.query(
      `UPDATE payout
       SET status = 'paid', paid_by = $2, paid_at = now(), bank_reference = $3
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, adminId, bankReference]
    );
    return result.rows[0] || null;
  }

  return {
    findAccountByOrganizer,
    upsertAccount,
    organizerIdsWithAccount,
    createWithItems,
    findById,
    findItems,
    findByOrganizer,
    findAll,
    markLinked,
    cancelLinking,
    markPaid
  };
}

module.exports = { createPayoutRepository };
