const { sendError } = require('../errors');

// 1) refuses suspicious paths (.., encoded slashes, backslashes)
// 2) blocks every "internal" path: /internal/** and /api/internal/**
function blockInternal(req, res, next) {
  const rawPath = req.originalUrl.split('?')[0];

  if (/%2f|%5c|\\|%00/i.test(rawPath)) {
    return sendError(req, res, 400, 'Invalid path');
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return sendError(req, res, 400, 'Invalid path');
  }

  const segments = decoded.toLowerCase().split('/').filter(Boolean);

  if (segments.includes('..') || segments.includes('.') || decoded.includes('//')) {
    return sendError(req, res, 400, 'Invalid path');
  }

  if (segments.some((s) => s === 'internal' || s.startsWith('internal;'))) {
    return sendError(req, res, 403, 'Internal routes are not exposed');
  }

  next();
}

module.exports = blockInternal;