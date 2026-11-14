const jwt = require('jsonwebtoken');
const { sendError } = require('../errors');

const KNOWN_ROLES = ['USER', 'ORGANIZER', 'ADMIN'];

// account-service signs with HMAC (HS256, or HS384/HS512 depending on the secret length).
// Only HMAC algorithms are accepted: never "none", never an asymmetric algorithm.
const ALLOWED_ALGORITHMS = ['HS256', 'HS384', 'HS512'];

// Reads "Authorization: Bearer <token>", checks the signature and the expiry,
// then puts { id, role } in req.user. The identity ALWAYS comes from the token.
function authenticate(config) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return sendError(req, res, 401, 'Missing token');
    }
    const token = header.slice(7).trim();

    let claims;
    try {
      claims = jwt.verify(token, config.jwtSecret, { algorithms: ALLOWED_ALGORITHMS });
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return sendError(req, res, 401, message);
    }

    // A refresh token must never open a route.
    if (claims.type !== 'access') {
      return sendError(req, res, 401, 'Invalid token');
    }
    const id = Number(claims.sub);
    if (!Number.isSafeInteger(id) || id <= 0 || !KNOWN_ROLES.includes(claims.role)) {
      return sendError(req, res, 401, 'Invalid token');
    }

    req.user = { id, role: claims.role };
    return next();
  };
}

// 401: nobody is identified. 403: identified, but the role is not allowed.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendError(req, res, 401, 'Missing token');
    if (!roles.includes(req.user.role)) return sendError(req, res, 403, 'Access denied');
    return next();
  };
}

module.exports = { authenticate, requireRole };