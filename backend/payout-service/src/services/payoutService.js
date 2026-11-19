const crypto = require('crypto');

const MAX_PAYMENTS_PER_PAYOUT = 500; // same limit as payment-service (mark-paid-out)

function createServiceError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

// ---------- IBAN ----------

function normalizeIban(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

// Format + checksum (ISO 13616, modulo 97). Works for the Tunisian IBAN (24 characters).
function isValidIban(value) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

// "TN59 **** **** **** **** 9648": the full IBAN is never sent back to the client.
function maskIban(value) {
  const iban = normalizeIban(value);
  if (iban.length < 8) return '****';
  return `${iban.slice(0, 4)} **** ${iban.slice(-4)}`;
}

// ---------- Money / views ----------

// Millimes (database) -> dinars (API response): 50000 -> 50
function toTnd(millimes) {
  return millimes === null || millimes === undefined
    ? millimes
    : Number((Number(millimes) / 1000).toFixed(3));
}

function accountView(row) {
  return {
    organizer_id: Number(row.organizer_id),
    holder_name: row.holder_name,
    bank_name: row.bank_name,
    iban_masked: maskIban(row.iban),
    updated_at: row.updated_at
  };
}

function itemView(item) {
  return {
    payment_id: Number(item.payment_id),
    event_id: Number(item.event_id),
    amount: toTnd(item.amount),
    commission_amount: toTnd(item.commission_amount),
    net_amount: toTnd(item.net_amount)
  };
}

function payoutView(row, items) {
  const view = {
    id: Number(row.id),
    organizer_id: Number(row.organizer_id),
    status: row.status,
    currency: row.currency,
    payments_count: row.payments_count,
    total_amount: toTnd(row.total_amount),
    total_commission: toTnd(row.total_commission),
    net_amount: toTnd(row.net_amount),
    holder_name: row.holder_name,
    bank_name: row.bank_name,
    iban_masked: maskIban(row.iban),
    created_by: Number(row.created_by),
    created_at: row.created_at,
    paid_by: row.paid_by === null || row.paid_by === undefined ? null : Number(row.paid_by),
    paid_at: row.paid_at,
    bank_reference: row.bank_reference,
    cancel_reason: row.cancel_reason
  };
  if (items) view.items = items.map(itemView);
  return view;
}

const STATUSES = ['linking', 'pending', 'paid', 'cancelled'];
function formatAmount(millimes, currency) {
  return `${(Number(millimes) / 1000).toFixed(3)} ${currency || 'TND'}`;
}

function createPayoutService({ repository, paymentClient, notify=null,adminNotify = null }) {
  function safeNotify(organizerId, type, variables) {
    if (typeof notify !== 'function') return;
    try {
      notify(Number(organizerId), type, variables);
    } catch (error) {
      console.error(`Notification ${type} not sent for organizer ${organizerId}:`, error.message);
    }
  }
  function safeAdmin(fn) {
    if (!adminNotify) return;
    try {
      fn(adminNotify);
    } catch (error) {
      console.error('Admin notification not sent:', error.message);
    }
  }
  
  function toId(value, label) {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n <= 0) {
      throw createServiceError(400, `Invalid ${label}`);
    }
    return n;
  }

  function cleanText(value, label, max) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) throw createServiceError(400, `${label} is required`);
    if (text.length > max) throw createServiceError(400, `${label} is too long (max ${max})`);
    return text;
  }

  // ============================================================
  // Bank account (organizer)
  // ============================================================

  async function saveMyAccount(organizerId, body) {
    const input = body || {};
    const holderName = cleanText(input.holderName, 'holderName', 120);
    const bankName = cleanText(input.bankName, 'bankName', 120);
    const iban = normalizeIban(input.iban);
    if (!isValidIban(iban)) {
      throw createServiceError(400, 'Invalid IBAN');
    }
    const row = await repository.upsertAccount({ organizerId, holderName, bankName, iban });
    return accountView(row);
  }

  async function getMyAccount(organizerId) {
    const row = await repository.findAccountByOrganizer(organizerId);
    if (!row) throw createServiceError(404, 'No bank account registered');
    return accountView(row);
  }

  // ============================================================
  // Balances (what is still to be paid)
  // ============================================================

  // Sums the per-event rows of payment-service (millimes).
  function sumEvents(events) {
    const total = {
      payments_count: 0,
      total_amount: 0,
      total_commission: 0,
      total_net: 0,
      unpaid_net: 0,
      paid_out_net: 0
    };
    for (const e of events) {
      total.payments_count += Number(e.payments_count);
      total.total_amount += Number(e.total_amount);
      total.total_commission += Number(e.total_commission);
      total.total_net += Number(e.total_net);
      total.unpaid_net += Number(e.unpaid_net);
      total.paid_out_net += Number(e.paid_out_net);
    }
    return total;
  }

  function balanceView(total) {
    return {
      payments_count: total.payments_count,
      total_amount: toTnd(total.total_amount),
      total_commission: toTnd(total.total_commission),
      total_net: toTnd(total.total_net),
      unpaid_net: toTnd(total.unpaid_net),
      paid_out_net: toTnd(total.paid_out_net)
    };
  }

  async function getMyBalance(organizerId) {
    const events = await paymentClient.getSummary(organizerId);
    const account = await repository.findAccountByOrganizer(organizerId);
    return {
      unit: 'TND',
      has_bank_account: Boolean(account),
      ...balanceView(sumEvents(events)),
      events: events.map((e) => ({
        event_id: Number(e.event_id),
        ...balanceView(sumEvents([e]))
      }))
    };
  }

  // Admin: one line per organizer, with what can be paid out now.
  async function getAdminBalances() {
    const events = await paymentClient.getSummary();
    const withAccount = new Set(await repository.organizerIdsWithAccount());

    const byOrganizer = new Map();
    for (const e of events) {
      const key = Number(e.organizer_id);
      if (!byOrganizer.has(key)) byOrganizer.set(key, []);
      byOrganizer.get(key).push(e);
    }

    const organizers = [...byOrganizer.entries()].map(([organizerId, rows]) => {
      const total = sumEvents(rows);
      return {
        organizer_id: organizerId,
        has_bank_account: withAccount.has(organizerId),
        can_pay_out: withAccount.has(organizerId) && total.unpaid_net > 0,
        ...balanceView(total)
      };
    });

    return { unit: 'TND', organizers };
  }

  // ============================================================
  // Payouts (admin)
  // ============================================================

  // Asks payment-service to link the payments. Called by create and by relink.
  async function link(payout, paymentIds) {
    let result;
    try {
      result = await paymentClient.markPaidOut(Number(payout.id), paymentIds);
    } catch (error) {
      // The answer is unknown: the payments may or may not be linked.
      // The payout stays "linking" (its payments stay reserved) and the admin can retry.
      throw createServiceError(
        error.statusCode || 503,
        `${error.message}. Payout ${payout.id} is kept in "linking": retry with POST /api/admin/payouts/${payout.id}/relink`,
        { payoutId: Number(payout.id) }
      );
    }

    if (!result.linked) {
      // 409 from payment-service = all or nothing, so nothing was linked: we can cancel.
      await repository.cancelLinking(
        payout.id,
        'Payment service refused the link (payments changed)'
      );
      throw createServiceError(
        409,
        'Payments changed in the meantime (refund or other payout). Nothing was paid out: try again',
        { payoutId: Number(payout.id) }
      );
    }

    const updated = await repository.markLinked(payout.id);
     // Email « virement programmé », seulement par l'appel qui l'a vraiment passé à pending
    // (un appel parallèle qui le trouve déjà pending n'envoie rien : pas de doublon).
    if (updated) {
      safeNotify(updated.organizer_id, 'PAYOUT_SCHEDULED', {
        payoutId: updated.id,
        amount: formatAmount(updated.net_amount, updated.currency),
        paymentsCount: updated.payments_count,
        bank: `${updated.bank_name} - ${maskIban(updated.iban)}`
      });
      
      // Notification dans l'application : les admins doivent envoyer puis confirmer le virement.
      safeAdmin((admin) => admin.payoutToConfirm(updated.id, updated.net_amount, updated.currency));
    }
    // Already moved to pending by a parallel retry: read it again.
    return updated || (await repository.findById(payout.id));
  }

  async function createPayout(organizerIdValue, adminId) {
    const organizerId = toId(organizerIdValue, 'organizer ID');

    const account = await repository.findAccountByOrganizer(organizerId);
    if (!account) {
      safeNotify(organizerId, 'PAYOUT_FAILED', { failureReason: 'no_bank_account' });
      throw createServiceError(409, 'This organizer has not registered a bank account yet');
    }

    const unpaid = await paymentClient.getUnpaid(organizerId);
    // payment-service already filters, we check again (never trust blindly)
    const eligible = unpaid.filter(
      (p) =>
        Number(p.organizer_id) === organizerId &&
        p.status === 'paid' &&
        (p.payout_id === null || p.payout_id === undefined)
    );
    if (eligible.length === 0) {
      throw createServiceError(409, 'Nothing to pay out for this organizer');
    }

    const batch = eligible.slice(0, MAX_PAYMENTS_PER_PAYOUT);
    const items = batch.map((p) => ({
      paymentId: Number(p.id),
      eventId: Number(p.event_id),
      amount: Number(p.amount),
      commissionAmount: Number(p.commission_amount),
      netAmount: Number(p.net_amount)
    }));
    const sum = (key) => items.reduce((acc, it) => acc + it[key], 0);

    let payout;
    try {
      payout = await repository.createWithItems(
        {
          organizerId,
          totalAmount: sum('amount'),
          totalCommission: sum('commissionAmount'),
          netAmount: sum('netAmount'),
          holderName: account.holder_name,
          bankName: account.bank_name,
          iban: account.iban,
          createdBy: adminId
        },
        items
      );
    } catch (error) {
      if (error.code === '23505') {
        throw createServiceError(409, 'Some payments are already part of another payout');
      }
      throw error;
    }

    const linked = await link(payout, items.map((it) => it.paymentId));
    return payoutView(linked, await repository.findItems(payout.id));
  }

  // Retry the link of a payout stuck in "linking" (payment-service was unreachable).
  async function relinkPayout(idValue) {
    const id = toId(idValue, 'payout ID');
    const payout = await repository.findById(id);
    if (!payout) throw createServiceError(404, 'Payout not found');
    if (payout.status !== 'linking') {
      throw createServiceError(409, `Payout is "${payout.status}": only a "linking" payout can be retried`);
    }
    const items = await repository.findItems(id);
    const linked = await link(payout, items.map((it) => Number(it.payment_id)));
    return payoutView(linked, await repository.findItems(id));
  }

  // The admin confirms that the bank transfer was sent.
  async function markPaid(idValue, adminId, bankReference) {
    const id = toId(idValue, 'payout ID');
    const payout = await repository.findById(id);
    if (!payout) throw createServiceError(404, 'Payout not found');
    if (payout.status !== 'pending') {
      throw createServiceError(
        409,
        `Payout is "${payout.status}": only a "pending" payout can be marked as paid`
      );
    }

    let reference;
    if (bankReference === undefined || bankReference === null || bankReference === '') {
      reference = `TRF-${id}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    } else if (typeof bankReference === 'string' && /^[A-Za-z0-9._-]{3,100}$/.test(bankReference.trim())) {
      reference = bankReference.trim();
    } else {
      throw createServiceError(400, 'bankReference must be 3 to 100 characters (letters, digits, . _ -)');
    }

    const updated = await repository.markPaid(id, { adminId, bankReference: reference });
    if (!updated) {
      throw createServiceError(409, 'This payout was already handled by someone else');
    }
        // Email « virement effectué » (jamais l'IBAN complet : banque + IBAN masqué)
    safeNotify(updated.organizer_id, 'PAYOUT_SENT', {
      payoutId: updated.id,
      amount: formatAmount(updated.net_amount, updated.currency),
      paymentsCount: updated.payments_count,
      bank: `${updated.bank_name} - ${maskIban(updated.iban)}`,
      bankReference: updated.bank_reference,
      paidAt: new Date(updated.paid_at || Date.now()).toISOString()
    });
    // Le virement est confirmé : la notification des admins passe en « lue ».
    safeAdmin((admin) => admin.payoutConfirmed(updated.id));
    return payoutView(updated, await repository.findItems(id));
  }

  // ============================================================
  // Reading payouts
  // ============================================================

  async function listMine(organizerId) {
    const rows = await repository.findByOrganizer(organizerId);
    return rows.map((r) => payoutView(r));
  }

  async function listAll({ status, organizerId } = {}) {
    let statusFilter = null;
    if (status !== undefined && status !== '') {
      if (!STATUSES.includes(status)) {
        throw createServiceError(400, `status must be one of: ${STATUSES.join(', ')}`);
      }
      statusFilter = status;
    }
    const organizerFilter =
      organizerId === undefined || organizerId === '' ? null : toId(organizerId, 'organizer ID');

    const rows = await repository.findAll({ status: statusFilter, organizerId: organizerFilter });
    return rows.map((r) => payoutView(r));
  }

  // ORGANIZER: only his own payouts (404 for the others, to not reveal they exist). ADMIN: all.
  async function getPayout(idValue, user) {
    const id = toId(idValue, 'payout ID');
    const payout = await repository.findById(id);
    if (!payout || (user.role !== 'ADMIN' && Number(payout.organizer_id) !== user.id)) {
      throw createServiceError(404, 'Payout not found');
    }
    return payoutView(payout, await repository.findItems(id));
  }

  return {
    saveMyAccount,
    getMyAccount,
    getMyBalance,
    getAdminBalances,
    createPayout,
    relinkPayout,
    markPaid,
    listMine,
    listAll,
    getPayout
  };
}

module.exports = { createPayoutService, isValidIban, maskIban, normalizeIban };
