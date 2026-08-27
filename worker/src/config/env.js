require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/watchweb',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  AI_PROVIDER: process.env.AI_PROVIDER || 'none',
  AI_API_KEY: process.env.AI_API_KEY || '',

  POLL_INTERVAL_MS: parseInt(process.env.WORKER_POLL_INTERVAL_MS || '15000', 10),
  BATCH_SIZE: parseInt(process.env.WORKER_BATCH_SIZE || '10', 10),

  MAX_RESPONSE_SIZE_BYTES: parseInt(process.env.MAX_RESPONSE_SIZE || String(5 * 1024 * 1024), 10),
  MAX_PAGE_LOAD_TIME_MS: parseInt(process.env.MAX_PAGE_LOAD_TIME || '30000', 10),
  MAX_CONCURRENT_PAGES: parseInt(process.env.MAX_CONCURRENT_PAGES || '5', 10),
  HTTP_TIMEOUT_MS: parseInt(process.env.WORKER_HTTP_TIMEOUT_MS || '15000', 10),

  MAX_CONTENT_CHARS: parseInt(process.env.WORKER_MAX_CONTENT_CHARS || '20000', 10),
  MAX_FAILURES_BEFORE_ERROR_STATUS: parseInt(process.env.WORKER_MAX_FAILURES || '5', 10),
  SNAPSHOT_RETENTION_DAYS: parseInt(process.env.SNAPSHOT_RETENTION_DAYS || '90', 10),
};

module.exports = env;
