const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function notFoundHandler(req, res, _next) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ msg: err.message, path: req.path, method: req.method }, 'Request error');
  }

  const body = { error: err.isOperational ? err.message : 'Internal server error' };
  if (process.env.NODE_ENV !== 'production' && !err.isOperational) {
    body.detail = err.message;
  }
  res.status(statusCode).json(body);
}

module.exports = { AppError, notFoundHandler, errorHandler };
