const crypto = require('crypto');
const { sendError } = require('../errors');

// Routes under /internal are for other services only (payout-service, registration-service).
// They need the shared key in the "X-Internal-Key" header.
function internalAuth(config) {
  const expected = Buffer.from(config.internalKey);

  return (req, res, next) => {
    const provided = Buffer.from(String(req.headers['x-internal-key'] || ''));
    const valid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    if (!valid) {
      return sendError(req, res, 401, 'Invalid internal key');
    }
    return next();
  };
}

module.exports = { internalAuth };