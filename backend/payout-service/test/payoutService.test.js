const { createPayoutService, isValidIban, maskIban } = require('../src/services/payoutService');
const { VALID_IBAN, payment, createFakeRepository, createFakePaymentClient } = require('./helpers');

function setup(payments = []) {
  const repository = createFakeRepository();
  const paymentClient = createFakePaymentClient(payments);
  const service = createPayoutService({ repository, paymentClient });
  return { repository, paymentClient, service };
}

const ACCOUNT = { holderName: 'Sami Ben Ali', bankName: 'BIAT', iban: VALID_IBAN };
const THREE_PAYMENTS = () => [
  payment(1, 3, 10, 50000, 2500),   // 50 TND, commission 2.5, net 47.5
  payment(2, 3, 10, 30000, 1500),   // 30 TND, commission 1.5, net 28.5
  payment(3, 3, 11, 20000, 1000)    // 20 TND, commission 1,   net 19
];

describe('IBAN', () => {
  test('accepts a valid Tunisian IBAN, with or without spaces and in lower case', () => {
    expect(isValidIban('TN59 1420 7207 1007 0712 9648')).toBe(true);
    expect(isValidIban('tn5914207207100707129648')).toBe(true);
  });
  test('refuses a wrong checksum, a short value and garbage', () => {
    expect(isValidIban('TN59 1420 7207 1007 0712 9649')).toBe(false);
    expect(isValidIban('TN59')).toBe(false);
    expect(isValidIban('hello world')).toBe(false);
    expect(isValidIban(undefined)).toBe(false);
  });
  test('the masked IBAN never shows the middle digits', () => {
    expect(maskIban(VALID_IBAN)).toBe('TN59 **** 9648');
  });
});

describe('bank account', () => {
  test('is saved, and the response never contains the full IBAN', async () => {
    const { service } = setup();
    const account = await service.saveMyAccount(3, ACCOUNT);
    expect(account.iban_masked).toBe('TN59 **** 9648');
    expect(JSON.stringify(account)).not.toContain('1420');
  });
  test('a second save replaces the first one', async () => {
    const { service } = setup();
    await service.saveMyAccount(3, ACCOUNT);
    const account = await service.saveMyAccount(3, { ...ACCOUNT, bankName: 'STB' });
    expect(account.bank_name).toBe('STB');
  });
  test.each([
    [{ ...ACCOUNT, iban: 'TN00' }, 'Invalid IBAN'],
    [{ ...ACCOUNT, holderName: '  ' }, 'holderName is required'],
    [{ ...ACCOUNT, bankName: undefined }, 'bankName is required'],
    [undefined, 'holderName is required']
  ])('refuses invalid data %#', async (body, message) => {
    const { service } = setup();
    await expect(service.saveMyAccount(3, body)).rejects.toMatchObject({ statusCode: 400, message });
  });
  test('404 when the organizer has no account', async () => {
    const { service } = setup();
    await expect(service.getMyAccount(3)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('create a payout', () => {
  test('sums the payments, links them in payment-service and becomes "pending"', async () => {
    const { service, paymentClient } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);

    const payout = await service.createPayout(3, 1);

    expect(payout).toMatchObject({
      organizer_id: 3,
      status: 'pending',
      payments_count: 3,
      total_amount: 100,
      total_commission: 5,
      net_amount: 95,
      created_by: 1,
      iban_masked: 'TN59 **** 9648'
    });
    expect(payout.items).toHaveLength(3);
    expect(paymentClient.state.linkCalls).toEqual([{ payoutId: payout.id, paymentIds: [1, 2, 3] }]);
  });

  test('uses only the payments of that organizer', async () => {
    const { service } = setup([...THREE_PAYMENTS(), payment(4, 8, 20, 90000, 4500)]);
    await service.saveMyAccount(3, ACCOUNT);
    const payout = await service.createPayout(3, 1);
    expect(payout.payments_count).toBe(3);
  });

  test('ignores a payment that is not "paid" or already paid out (defence in depth)', async () => {
    const list = THREE_PAYMENTS();
    list[0].status = 'refunded';
    list[1].payout_id = 99;
    const { service } = setup(list);
    await service.saveMyAccount(3, ACCOUNT);
    const payout = await service.createPayout(3, 1);
    expect(payout.payments_count).toBe(1);
    expect(payout.net_amount).toBe(19);
  });

  test('409 without bank account', async () => {
    const { service } = setup(THREE_PAYMENTS());
    await expect(service.createPayout(3, 1)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('409 when there is nothing to pay out', async () => {
    const { service } = setup([]);
    await service.saveMyAccount(3, ACCOUNT);
    await expect(service.createPayout(3, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Nothing to pay out for this organizer'
    });
  });

  test('a second payout right after the first finds nothing (no double payment)', async () => {
    const { service } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    await service.createPayout(3, 1);
    await expect(service.createPayout(3, 1)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('two payouts at the same time cannot take the same payments', async () => {
    const { service, repository } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    const results = await Promise.allSettled([service.createPayout(3, 1), service.createPayout(3, 2)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected');
    expect(failed.reason.statusCode).toBe(409);
    expect(repository._items).toHaveLength(3);
  });

  test('refuses a wrong organizer id', async () => {
    const { service } = setup();
    await expect(service.createPayout('abc', 1)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.createPayout(undefined, 1)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('payment-service refuses the link (409): payout cancelled and payments released', async () => {
    const { service, paymentClient, repository } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    paymentClient.state.linkResult = 'conflict';

    await expect(service.createPayout(3, 1)).rejects.toMatchObject({ statusCode: 409 });

    expect(repository._payouts[0].status).toBe('cancelled');
    expect(repository._items).toHaveLength(0);
    // the payments can be used again
    paymentClient.state.linkResult = 'ok';
    const payout = await service.createPayout(3, 1);
    expect(payout.status).toBe('pending');
  });

  test('payment-service down: payout stays "linking", payments stay reserved, relink finishes it', async () => {
    const { service, paymentClient, repository } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    paymentClient.state.linkResult = 'down';

    const error = await service.createPayout(3, 1).catch((e) => e);
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain('relink');
    expect(repository._payouts[0].status).toBe('linking');

    // while "linking", a new payout cannot take the same payments
    await expect(service.createPayout(3, 1)).rejects.toMatchObject({ statusCode: 409 });

    paymentClient.state.linkResult = 'ok';
    const done = await service.relinkPayout(error.payoutId);
    expect(done.status).toBe('pending');
    expect(done.items).toHaveLength(3);
  });

  test('relink refuses a payout that is not "linking"', async () => {
    const { service } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    const payout = await service.createPayout(3, 1);
    await expect(service.relinkPayout(payout.id)).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.relinkPayout(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('mark a payout as paid', () => {
  async function pendingPayout() {
    const ctx = setup(THREE_PAYMENTS());
    await ctx.service.saveMyAccount(3, ACCOUNT);
    const payout = await ctx.service.createPayout(3, 1);
    return { ...ctx, payout };
  }

  test('pending -> paid, with the admin and a generated bank reference', async () => {
    const { service, payout } = await pendingPayout();
    const paid = await service.markPaid(payout.id, 1);
    expect(paid.status).toBe('paid');
    expect(paid.paid_by).toBe(1);
    expect(paid.paid_at).toBeTruthy();
    expect(paid.bank_reference).toMatch(/^TRF-\d+-[0-9A-F]{8}$/);
  });

  test('keeps the bank reference given by the admin', async () => {
    const { service, payout } = await pendingPayout();
    const paid = await service.markPaid(payout.id, 1, 'VIR-2026-0042');
    expect(paid.bank_reference).toBe('VIR-2026-0042');
  });

  test('refuses a bad bank reference', async () => {
    const { service, payout } = await pendingPayout();
    await expect(service.markPaid(payout.id, 1, 'x')).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.markPaid(payout.id, 1, '<script>')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cannot be paid twice', async () => {
    const { service, payout } = await pendingPayout();
    await service.markPaid(payout.id, 1);
    await expect(service.markPaid(payout.id, 1)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('a payout in "linking" cannot be paid', async () => {
    const { service, paymentClient } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    paymentClient.state.linkResult = 'down';
    const error = await service.createPayout(3, 1).catch((e) => e);
    await expect(service.markPaid(error.payoutId, 1)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('404 for an unknown payout', async () => {
    const { service } = setup();
    await expect(service.markPaid(42, 1)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('reading', () => {
  test('an organizer sees only his own payouts, and gets 404 for the others', async () => {
    const { service } = setup([...THREE_PAYMENTS(), payment(4, 8, 20, 90000, 4500)]);
    await service.saveMyAccount(3, ACCOUNT);
    await service.saveMyAccount(8, ACCOUNT);
    const mine = await service.createPayout(3, 1);
    const other = await service.createPayout(8, 1);

    expect(await service.listMine(3)).toHaveLength(1);
    expect((await service.getPayout(mine.id, { id: 3, role: 'ORGANIZER' })).items).toHaveLength(3);
    await expect(service.getPayout(other.id, { id: 3, role: 'ORGANIZER' })).rejects.toMatchObject({ statusCode: 404 });
    expect((await service.getPayout(other.id, { id: 1, role: 'ADMIN' })).organizer_id).toBe(8);
  });

  test('admin list can be filtered by status, and refuses an unknown status', async () => {
    const { service } = setup(THREE_PAYMENTS());
    await service.saveMyAccount(3, ACCOUNT);
    const p = await service.createPayout(3, 1);
    expect(await service.listAll({ status: 'pending' })).toHaveLength(1);
    expect(await service.listAll({ status: 'paid' })).toHaveLength(0);
    await service.markPaid(p.id, 1);
    expect(await service.listAll({ status: 'paid' })).toHaveLength(1);
    await expect(service.listAll({ status: 'hacked' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('balance of an organizer: earned, paid out and still to pay (in TND)', async () => {
    const list = THREE_PAYMENTS();
    list[2].payout_id = 5; // the 3rd payment (net 19) is already paid out
    const { service } = setup(list);
    const balance = await service.getMyBalance(3);
    expect(balance).toMatchObject({
      has_bank_account: false,
      total_amount: 100,
      total_commission: 5,
      total_net: 95,
      unpaid_net: 76,
      paid_out_net: 19
    });
    expect(balance.events).toHaveLength(2);
  });

  test('admin balances: who can be paid now', async () => {
    const { service } = setup([...THREE_PAYMENTS(), payment(4, 8, 20, 90000, 4500)]);
    await service.saveMyAccount(3, ACCOUNT);
    const { organizers } = await service.getAdminBalances();
    const o3 = organizers.find((o) => o.organizer_id === 3);
    const o8 = organizers.find((o) => o.organizer_id === 8);
    expect(o3).toMatchObject({ has_bank_account: true, can_pay_out: true, unpaid_net: 95 });
    expect(o8).toMatchObject({ has_bank_account: false, can_pay_out: false, unpaid_net: 85.5 });
  });
});
