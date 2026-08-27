const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['*.content', '*.normalizedContent', '*.passwordHash', '*.token'],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
