class HttpError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function notFound(req, res) {
  res.status(404).json({
    status: 404,
    message: 'Route not found',
    errors: [],
    timestamp: new Date().toISOString(),
  });
}

// Express recognises an error handler by its 4 parameters.
// Keep all four, even if `next` is unused.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    status,
    message: status === 500 ? 'Internal server error' : err.message,
    errors: err.errors || [],
    timestamp: new Date().toISOString(),
  });
}

module.exports = { HttpError, errorHandler, notFound };