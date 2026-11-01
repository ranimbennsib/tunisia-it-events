const { randomUUID } = require('crypto');

// One id per request, sent back to the client and forwarded to the services
function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const valid = typeof incoming === 'string' && /^[A-Za-z0-9._-]{8,64}$/.test(incoming);
  req.id = valid ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;