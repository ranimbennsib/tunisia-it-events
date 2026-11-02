const { STATUS_CODES } = require('http');

// Same error format in every service: { timestamp, status, error, message, path }
function sendError(req, res, status, message) {
  res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: STATUS_CODES[status] || 'Error',
    message,
    path: req.originalUrl.split('?')[0]
  });
}

module.exports = { sendError };