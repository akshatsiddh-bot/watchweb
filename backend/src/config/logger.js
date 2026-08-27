const pino = require('pino');
const env = require('./env');

// Redact fields that must never be logged: passwords, JWTs, tokens, page content.
const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'jwt',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.content',
      '*.normalizedContent',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

module.exports = logger;
