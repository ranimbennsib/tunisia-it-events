const jwt = require('jsonwebtoken');
const config = require('./config');
const { HttpError } = require('./errors');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Missing or invalid Authorization header');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  if (payload.type !== 'access') {
    throw new HttpError(401, 'Access token required');
  }

  req.user = { id: Number(payload.sub), role: payload.role };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'Forbidden');
    }
    next();
  };
}

module.exports = { authenticate, requireRole };