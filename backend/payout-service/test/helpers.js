// Fakes used by the tests: no database and no payment-service needed.
const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-test-secret-test-secret-123';
const VALID_IBAN = 'TN59 1420 7207 1007 0712 9648';

function token(role, sub, options = {}) {
  const { type = 'access', expiresIn = '10m' } = options;
  return jwt.sign({ role, type }, SECRET, { algorithm: 'HS256', subject: String(sub), expiresIn });
}

// A successful payment as payment-service returns it (amounts in millimes).
function payment(id, organizerId, eventId, amount, commission) {
  return {
    id,
    organizer_id: organizerId,
    event_id: eventId,
    status: 'paid',
    payout_id: null,
    amount,
    commission_amount: commission,
    net_amount: amount - commission
  };
}

// In-memory copy of the behaviour of payoutRepository (same rules as the SQL).
function createFakeRepository() {
  const accounts = new Map();
  const payouts = [];
  const items = [];
  let nextId = 1;

  return {
    _payouts: payouts,
    _items: items,
    async findAccountByOrganizer(id) { return accounts.get(Number(id)) || null; },
    async upsertAccount({ organizerId, holderName, bankName, iban }) {
      const row = { organizer_id: organizerId, holder_name: holderName, bank_name: bankName, iban, updated_at: new Date() };
      accounts.set(organizerId, row);
      return row;
    },
    async organizerIdsWithAccount() { return [...accounts.keys()]; },
    async createWithItems(p, list) {
      if (list.some((it) => items.some((x) => x.payment_id === it.paymentId))) {
        const err = new Error('duplicate key');
        err.code = '23505';
        throw err;
      }
      const row = {
        id: nextId++, organizer_id: p.organizerId, status: 'linking', currency: 'TND',
        payments_count: list.length, total_amount: p.totalAmount, total_commission: p.totalCommission,
        net_amount: p.netAmount, holder_name: p.holderName, bank_name: p.bankName, iban: p.iban,
        created_by: p.createdBy, created_at: new Date(), paid_by: null, paid_at: null,
        bank_reference: null, cancel_reason: null
      };
      payouts.push(row);
      list.forEach((it) => items.push({
        payout_id: row.id, payment_id: it.paymentId, event_id: it.eventId,
        amount: it.amount, commission_amount: it.commissionAmount, net_amount: it.netAmount
      }));
      return { ...row };
    },
    async findById(id) { const r = payouts.find((x) => x.id === Number(id)); return r ? { ...r } : null; },
    async findItems(id) { return items.filter((x) => x.payout_id === Number(id)).map((x) => ({ ...x })); },
    async findByOrganizer(id) { return payouts.filter((x) => x.organizer_id === Number(id)).map((x) => ({ ...x })); },
    async findAll({ status, organizerId } = {}) {
      return payouts
        .filter((x) => (!status || x.status === status) && (!organizerId || x.organizer_id === organizerId))
        .map((x) => ({ ...x }));
    },
    async markLinked(id) {
      const r = payouts.find((x) => x.id === Number(id) && x.status === 'linking');
      if (!r) return null;
      r.status = 'pending';
      return { ...r };
    },
    async cancelLinking(id, reason) {
      const r = payouts.find((x) => x.id === Number(id) && x.status === 'linking');
      if (!r) return null;
      r.status = 'cancelled';
      r.cancel_reason = reason;
      for (let i = items.length - 1; i >= 0; i--) if (items[i].payout_id === r.id) items.splice(i, 1);
      return { ...r };
    },
    async markPaid(id, { adminId, bankReference }) {
      const r = payouts.find((x) => x.id === Number(id) && x.status === 'pending');
      if (!r) return null;
      Object.assign(r, { status: 'paid', paid_by: adminId, paid_at: new Date(), bank_reference: bankReference });
      return { ...r };
    }
  };
}

// Fake payment client. "linkResult" can be changed by a test.
function createFakePaymentClient(initialPayments = []) {
  const state = { payments: initialPayments, linkResult: 'ok', linkCalls: [] };
  return {
    state,
    async getUnpaid(organizerId) {
      return state.payments.filter((p) => !organizerId || p.organizer_id === Number(organizerId));
    },
    async getSummary(organizerId) {
      const rows = new Map();
      for (const p of state.payments) {
        if (organizerId && p.organizer_id !== Number(organizerId)) continue;
        const key = `${p.organizer_id}-${p.event_id}`;
        const r = rows.get(key) || {
          organizer_id: p.organizer_id, event_id: p.event_id, payments_count: 0, total_amount: 0,
          total_commission: 0, total_net: 0, unpaid_net: 0, paid_out_net: 0
        };
        r.payments_count += 1;
        r.total_amount += p.amount;
        r.total_commission += p.commission_amount;
        r.total_net += p.net_amount;
        if (p.payout_id) r.paid_out_net += p.net_amount; else r.unpaid_net += p.net_amount;
        rows.set(key, r);
      }
      return [...rows.values()];
    },
    async markPaidOut(payoutId, paymentIds) {
      state.linkCalls.push({ payoutId, paymentIds });
      if (state.linkResult === 'down') {
        const err = new Error('Payment service is unavailable');
        err.statusCode = 503;
        throw err;
      }
      if (state.linkResult === 'conflict') return { linked: false };
      state.payments.forEach((p) => { if (paymentIds.includes(p.id)) p.payout_id = payoutId; });
      return { linked: true };
    }
  };
}

module.exports = { SECRET, VALID_IBAN, token, payment, createFakeRepository, createFakePaymentClient };
