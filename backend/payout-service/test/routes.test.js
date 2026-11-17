const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildConfig } = require('../src/config');
const createApp = require('../src/app');
const { SECRET, VALID_IBAN, token, payment, createFakeRepository, createFakePaymentClient } = require('./helpers');

function makeApp(payments = []) {
  const config = buildConfig({
    JWT_SECRET: SECRET,
    INTERNAL_KEY: 'internal-key-for-the-tests',
    DB_PASSWORD: 'x',
    NODE_ENV: 'test'
  });
  return createApp(config, {
    payoutRepository: createFakeRepository(),
    paymentClient: createFakePaymentClient(payments)
  });
}

const bearer = (role, id, options) => ({ Authorization: `Bearer ${token(role, id, options)}` });
const ACCOUNT = { holderName: 'Sami Ben Ali', bankName: 'BIAT', iban: VALID_IBAN };

describe('security', () => {
  test.each([
    ['get', '/api/payouts/me'],
    ['get', '/api/payouts/balance'],
    ['get', '/api/payout-accounts/me'],
    ['get', '/api/admin/payouts'],
    ['post', '/api/admin/payouts']
  ])('%s %s without token gives 401', async (method, url) => {
    const res = await request(makeApp())[method](url);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ status: 401, path: url });
  });

  test('a refresh token and a token signed with another secret give 401', async () => {
    const app = makeApp();
    const refresh = await request(app).get('/api/payouts/me').set(bearer('ORGANIZER', 3, { type: 'refresh' }));
    expect(refresh.status).toBe(401);
    const forged = jwt.sign({ role: 'ADMIN', type: 'access' }, 'another-secret-another-secret-12345', { subject: '1' });
    const res = await request(app).get('/api/admin/payouts').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('a USER cannot use any payout route (403)', async () => {
    const app = makeApp();
    for (const [method, url] of [
      ['get', '/api/payouts/me'],
      ['get', '/api/payouts/1'],
      ['put', '/api/payout-accounts/me'],
      ['get', '/api/admin/payouts']
    ]) {
      const res = await request(app)[method](url).set(bearer('USER', 7));
      expect(res.status).toBe(403);
    }
  });

  test('an ORGANIZER cannot use the admin routes (403)', async () => {
    const app = makeApp();
    const h = bearer('ORGANIZER', 3);
    expect((await request(app).get('/api/admin/payouts').set(h)).status).toBe(403);
    expect((await request(app).get('/api/admin/payouts/balances').set(h)).status).toBe(403);
    expect((await request(app).post('/api/admin/payouts').set(h).send({ organizerId: 3 })).status).toBe(403);
    expect((await request(app).patch('/api/admin/payouts/1/pay').set(h)).status).toBe(403);
  });

  test('an ADMIN has no bank account and no balance of his own (403)', async () => {
    const app = makeApp();
    expect((await request(app).get('/api/payouts/me').set(bearer('ADMIN', 1))).status).toBe(403);
    expect((await request(app).put('/api/payout-accounts/me').set(bearer('ADMIN', 1)).send(ACCOUNT)).status).toBe(403);
  });

  test('the organizer id comes from the token, never from the body', async () => {
    const app = makeApp();
    const res = await request(app)
      .put('/api/payout-accounts/me')
      .set(bearer('ORGANIZER', 3))
      .send({ ...ACCOUNT, organizerId: 99 });
    expect(res.status).toBe(200);
    expect(res.body.account.organizer_id).toBe(3);
  });
});

describe('full flow through the HTTP routes', () => {
  test('account -> balance -> payout -> pay -> history', async () => {
    const app = makeApp([payment(1, 3, 10, 50000, 2500), payment(2, 3, 10, 30000, 1500)]);
    const org = bearer('ORGANIZER', 3);
    const admin = bearer('ADMIN', 1);

    // without a bank account the admin cannot pay
    let res = await request(app).post('/api/admin/payouts').set(admin).send({ organizerId: 3 });
    expect(res.status).toBe(409);

    res = await request(app).put('/api/payout-accounts/me').set(org).send(ACCOUNT);
    expect(res.status).toBe(200);
    expect(res.body.account.iban_masked).toBe('TN59 **** 9648');

    res = await request(app).get('/api/payouts/balance').set(org);
    expect(res.body.balance).toMatchObject({ has_bank_account: true, total_net: 76, unpaid_net: 76 });

    res = await request(app).get('/api/admin/payouts/balances').set(admin);
    expect(res.body.organizers[0]).toMatchObject({ organizer_id: 3, can_pay_out: true });

    res = await request(app).post('/api/admin/payouts').set(admin).send({ organizerId: 3 });
    expect(res.status).toBe(201);
    expect(res.body.payout).toMatchObject({ status: 'pending', net_amount: 76, payments_count: 2 });
    const id = res.body.payout.id;

    // the organizer sees it (pending), then the admin pays it
    res = await request(app).get('/api/payouts/me').set(org);
    expect(res.body.payouts[0]).toMatchObject({ id, status: 'pending' });

    res = await request(app).patch(`/api/admin/payouts/${id}/pay`).set(admin).send({ bankReference: 'VIR-42-ABC' });
    expect(res.status).toBe(200);
    expect(res.body.payout).toMatchObject({ status: 'paid', bank_reference: 'VIR-42-ABC' });

    res = await request(app).patch(`/api/admin/payouts/${id}/pay`).set(admin);
    expect(res.status).toBe(409);

    res = await request(app).get(`/api/payouts/${id}`).set(org);
    expect(res.status).toBe(200);
    expect(res.body.payout.items).toHaveLength(2);

    // another organizer cannot read it
    res = await request(app).get(`/api/payouts/${id}`).set(bearer('ORGANIZER', 8));
    expect(res.status).toBe(404);

    res = await request(app).get('/api/admin/payouts?status=paid').set(admin);
    expect(res.body.payouts).toHaveLength(1);
  });

  test('the response never contains the full IBAN', async () => {
    const app = makeApp([payment(1, 3, 10, 50000, 2500)]);
    await request(app).put('/api/payout-accounts/me').set(bearer('ORGANIZER', 3)).send(ACCOUNT);
    const res = await request(app).post('/api/admin/payouts').set(bearer('ADMIN', 1)).send({ organizerId: 3 });
    expect(JSON.stringify(res.body)).not.toContain('1420 7207');
    expect(JSON.stringify(res.body)).not.toContain('14207207');
  });
});

describe('errors', () => {
  test('invalid JSON gives 400, unknown route gives 404, invalid id gives 400', async () => {
    const app = makeApp();
    const bad = await request(app)
      .put('/api/payout-accounts/me')
      .set(bearer('ORGANIZER', 3))
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(bad.status).toBe(400);
    expect((await request(app).get('/nope')).status).toBe(404);
    expect((await request(app).get('/api/payouts/abc').set(bearer('ORGANIZER', 3))).status).toBe(400);
  });

  test('GET /api/payouts/balance is not taken for an id', async () => {
    const res = await request(makeApp()).get('/api/payouts/balance').set(bearer('ORGANIZER', 3));
    expect(res.status).toBe(200);
  });

  test('/health works without token', async () => {
    const res = await request(makeApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('payout-service');
  });
});
