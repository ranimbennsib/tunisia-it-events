const http = require('http');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildConfig } = require('../src/config');
const createApp = require('../src/app');

const SECRET = 'test-secret-test-secret-test-secret-123';
let upstream;
let upstreamUrl;

function token(role = 'USER', sub = '7', options = { expiresIn: '10m' }, secret = SECRET) {
  const { type = 'access', algorithm = 'HS256', ...rest } = options;
  return jwt.sign({ role, type }, secret, { algorithm, subject: sub, ...rest });
}

function makeApp(overrides = {}, services) {
  const url = upstreamUrl;
  const env = {
    JWT_SECRET: SECRET,
    CORS_ORIGINS: 'http://localhost:4200',
    ACCOUNT_SERVICE_URL: url,
    PROFILE_SERVICE_URL: url,
    EVENT_SERVICE_URL: url,
    REGISTRATION_SERVICE_URL: url,
    PAYMENT_SERVICE_URL: url,
    PAYOUT_SERVICE_URL: url,
    NOTIFICATION_SERVICE_URL: url,
    ...overrides
  };
  const config = buildConfig(env);
  if (services) Object.assign(config.services, services);
  return createApp(config, { logger: false });
}

beforeAll(async () => {
  // fake service: answers with what it received
  upstream = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
    });
  });
  await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
  upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
});

afterAll(() => new Promise((r) => upstream.close(r)));

describe('health and unknown routes', () => {
  const app = () => makeApp();

  test('GET /health is public', async () => {
    const res = await request(app()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('unknown route gives 404 in the common error format', async () => {
    const res = await request(app()).get('/api/unknown').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(404);
    expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'path', 'status', 'timestamp']);
  });

  test('every response carries an X-Request-Id', async () => {
    const res = await request(app()).get('/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('public routes', () => {
  test.each([
    ['GET', '/api/events'],
    ['GET', '/api/events/12'],
    ['GET', '/api/profiles/organizers/3'],
    ['GET', '/api/registrations/event/5/count']
  ])('%s %s needs no token', async (method, path) => {
    const res = await request(makeApp())[method.toLowerCase()](path);
    expect(res.status).toBe(200);
  });

  test.each([
    '/api/auth/register',
    '/api/auth/signup',
    '/api/auth/signin',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/register/user',
    '/api/auth/register/organizer'
  ])('POST %s needs no token and the body is forwarded', async (path) => {
    const res = await request(makeApp()).post(path).send({ email: 'a@a.com', password: '12345678' });
    expect(res.status).toBe(200);
    expect(res.body.method).toBe('POST');
    expect(JSON.parse(res.body.body)).toEqual({ email: 'a@a.com', password: '12345678' });
  });
});

describe('compatibility with the updated services', () => {
  test.each(['HS256', 'HS384', 'HS512'])('token signed with %s is accepted', async (algorithm) => {
    const res = await request(makeApp())
      .get('/api/events/mine')
      .set('Authorization', `Bearer ${token('ORGANIZER', '3', { expiresIn: '10m', algorithm })}`);
    expect(res.status).toBe(200);
  });

  test('a refresh token cannot open a protected route', async () => {
    const res = await request(makeApp())
      .get('/api/events/mine')
      .set('Authorization', `Bearer ${token('USER', '3', { expiresIn: '10m', type: 'refresh' })}`);
    expect(res.status).toBe(401);
  });

  test('a token without "type" is refused', async () => {
    const t = jwt.sign({ role: 'USER' }, SECRET, { algorithm: 'HS256', subject: '3', expiresIn: '10m' });
    const res = await request(makeApp()).get('/api/events/mine').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(401);
  });

  test('/api/organizers/{id}/events goes to the event service (token required)', async () => {
    const noToken = await request(makeApp()).get('/api/organizers/1/events');
    expect(noToken.status).toBe(401);
    const res = await request(makeApp())
      .post('/api/organizers/1/events/5/publish')
      .set('Authorization', `Bearer ${token('ORGANIZER', '1')}`);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('/api/organizers/1/events/5/publish');
  });

  test('/api/organizers/abc/events is not routed', async () => {
    const res = await request(makeApp())
      .get('/api/organizers/abc/events')
      .set('Authorization', `Bearer ${token('ORGANIZER', '1')}`);
    expect(res.status).toBe(404);
  });
});

describe('protected routes', () => {
  test('GET /api/events/mine without token gives 401 (it is not a public route)', async () => {
    const res = await request(makeApp()).get('/api/events/mine');
    expect(res.status).toBe(401);
  });

  test('POST /api/events without token gives 401', async () => {
    const res = await request(makeApp()).post('/api/events').send({});
    expect(res.status).toBe(401);
  });

  test('valid token is accepted and forwarded with the request id', async () => {
    const t = token('ORGANIZER');
    const res = await request(makeApp()).get('/api/events/mine').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('/api/events/mine');
    expect(res.body.headers.authorization).toBe(`Bearer ${t}`);
    expect(res.body.headers['x-request-id']).toBe(res.headers['x-request-id']);
  });

  test('expired token gives 401', async () => {
    const res = await request(makeApp())
      .get('/api/events/mine')
      .set('Authorization', `Bearer ${token('USER', '1', { expiresIn: -10 })}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expired');
  });

  test('token signed with another secret gives 401', async () => {
    const bad = token('USER', '1', { expiresIn: '10m' }, 'another-secret-another-secret-123456');
    const res = await request(makeApp()).get('/api/events/mine').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  test('token with alg "none" gives 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '1', role: 'ADMIN' })).toString('base64url');
    const res = await request(makeApp())
      .get('/api/events/mine')
      .set('Authorization', `Bearer ${header}.${payload}.`);
    expect(res.status).toBe(401);
  });

  test('token with an unknown role gives 401', async () => {
    const res = await request(makeApp())
      .get('/api/events/mine')
      .set('Authorization', `Bearer ${token('HACKER')}`);
    expect(res.status).toBe(401);
  });

  test('malformed Authorization header gives 401', async () => {
    const res = await request(makeApp()).get('/api/events/mine').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  test('/api/admin/** refuses a USER (403) and accepts an ADMIN', async () => {
    const asUser = await request(makeApp())
      .get('/api/admin/events?status=pending')
      .set('Authorization', `Bearer ${token('USER')}`);
    expect(asUser.status).toBe(403);

    const asAdmin = await request(makeApp())
      .get('/api/admin/events?status=pending')
      .set('Authorization', `Bearer ${token('ADMIN')}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.url).toBe('/api/admin/events?status=pending');
  });
});

describe('internal routes are blocked', () => {
  const t = () => `Bearer ${token('ADMIN')}`;

  test.each([
    '/internal/events/1',
    '/api/internal/events/1',
    '/api/events/internal/x',
    '/INTERNAL/events/1',
    '/api/%69nternal/events/1',
    '/api/events/%49nternal/1'
  ])('%s gives 403 even with an ADMIN token', async (path) => {
    const res = await request(makeApp()).get(path).set('Authorization', t());
    expect(res.status).toBe(403);
  });

  test('path traversal and encoded slashes give 400', async () => {
    const a = await request(makeApp()).get('/api/events/..%2Finternal/1').set('Authorization', t());
    expect(a.status).toBe(400);
    const b = await request(makeApp()).get('/api/events/../internal/1').set('Authorization', t());
    expect([400, 403]).toContain(b.status);
  });

  test('a client cannot send its own X-Internal-Key to a service', async () => {
    const res = await request(makeApp())
      .get('/api/events')
      .set('X-Internal-Key', 'stolen-key');
    expect(res.status).toBe(200);
    expect(res.body.headers['x-internal-key']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  test('sign in is limited per IP (429 after AUTH_RATE_MAX)', async () => {
    const app = makeApp({ AUTH_RATE_MAX: '3' });
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'x' });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });

  test('the sign in limit does not block other routes', async () => {
    const app = makeApp({ AUTH_RATE_MAX: '1' });
    await request(app).post('/api/auth/login').send({});
    await request(app).post('/api/auth/login').send({});
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
  });

  test('global limit gives 429 in the common error format', async () => {
    const app = makeApp({ RATE_MAX: '2' });
    await request(app).get('/api/events');
    await request(app).get('/api/events');
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(429);
    expect(res.body.status).toBe(429);
  });
});

describe('CORS', () => {
  test('preflight from the Angular app is accepted', async () => {
    const res = await request(makeApp())
      .options('/api/events')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  test('another origin gets no CORS headers', async () => {
    const res = await request(makeApp())
      .options('/api/events')
      .set('Origin', 'http://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('routing', () => {
  test('each prefix reaches its own service', async () => {
    const seen = {};
    const mk = (name) =>
      http.createServer((req, res) => {
        seen[name] = req.url;
        res.end('{}');
      });
    const servers = {};
    const urls = {};
    for (const name of ['account', 'profile', 'event', 'registration', 'payment', 'payout', 'notification']) {
      servers[name] = mk(name);
      await new Promise((r) => servers[name].listen(0, '127.0.0.1', r));
      urls[name] = `http://127.0.0.1:${servers[name].address().port}`;
    }
    const app = makeApp({}, urls);
    const t = `Bearer ${token('ADMIN')}`;

    const cases = [
      ['/api/accounts/me', 'account'],
      ['/api/admin/accounts', 'account'],
      ['/api/profiles/me', 'profile'],
      ['/api/events/mine', 'event'],
      ['/api/registrations/mine', 'registration'],
      ['/api/favorites', 'registration'],
      ['/api/payments/mine', 'payment'],
      ['/api/payout-accounts', 'payout'],
      ['/api/payouts/mine', 'payout'],
      ['/api/notifications', 'notification']
    ];
    for (const [path, name] of cases) {
      await request(app).get(path).set('Authorization', t).expect(200);
      expect(seen[name]).toBe(path);
    }
    await Promise.all(Object.values(servers).map((s) => new Promise((r) => s.close(r))));
  });

  test('STRIP_API_PREFIX=true removes /api before forwarding', async () => {
    const res = await request(makeApp({ STRIP_API_PREFIX: 'true' })).get('/api/events/5');
    expect(res.body.url).toBe('/events/5');
  });
});

describe('unavailable service', () => {
  test('gives 503 in the common error format when a service is down', async () => {
    const app = makeApp({}, { event: 'http://127.0.0.1:1' });
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/event-service is unavailable/);
  });
});

describe('config', () => {
  test('refuses a missing or short JWT_SECRET', () => {
    expect(() => buildConfig({})).toThrow(/JWT_SECRET/);
    expect(() => buildConfig({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});