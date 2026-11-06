const jwt = require('jsonwebtoken');
const { isPublic } = require('../routes');
const { sendError } = require('../errors');

// jjwt (Spring) chooses HS256, HS384 or HS512 according to the length of the secret,
// so the gateway accepts the three HMAC algorithms (same secret, never "none" or RSA).
const ALGORITHMS = ['HS256', 'HS384', 'HS512'];

// Checks the JWT on every route that is not public.
// Also protects /api/admin/** (ADMIN only). Each service re-checks the token and the role itself.
function createAuthMiddleware(config) {
  return function authenticate(req, res, next) {
    if (isPublic(req.method, req.path)) return next();

    const header = req.headers.authorization || '';
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) {
      return sendError(req, res, 401, 'Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ALGORITHMS });
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return sendError(req, res, 401, message);
    }

    // account-service puts "type": "access" or "refresh" in its tokens.
    // A refresh token must never open a protected route.
    if (payload.type !== 'access') {
      return sendError(req, res, 401, 'Access token required');
    }

    if (!payload.sub || !['USER', 'ORGANIZER', 'ADMIN'].includes(payload.role)) {
      return sendError(req, res, 401, 'Invalid token');
    }

    req.auth = { accountId: String(payload.sub), role: payload.role };

    if (req.path.startsWith('/api/admin/') && payload.role !== 'ADMIN') {
      return sendError(req, res, 403, 'Access denied: ADMIN role required');
    }

    next();
  };
}

module.exports = createAuthMiddleware;