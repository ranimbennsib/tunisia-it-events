const { rateLimit } = require('express-rate-limit');
const { authRateLimitedPattern } = require('../routes');
const { sendError } = require('../errors');

function buildLimiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => sendError(req, res, 429, message)
  });
}

// global: all requests of one IP. auth: sign in / sign up only (brute force protection)
function createRateLimiters(config) {
  const global = buildLimiter(
    config.rateLimit.globalWindowMs,
    config.rateLimit.globalMax,
    'Too many requests, please slow down'
  );
  const auth = buildLimiter(
    config.rateLimit.authWindowMs,
    config.rateLimit.authMax,
    'Too many sign in / sign up attempts, try again later'
  );

  const authOnly = (req, res, next) => {
    if (req.method === 'POST' && authRateLimitedPattern.test(req.path)) {
      return auth(req, res, next);
    }
    next();
  };

  return { global, authOnly };
}

module.exports = createRateLimiters;