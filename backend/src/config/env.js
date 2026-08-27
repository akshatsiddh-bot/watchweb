require('dotenv').config();

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/watchweb'),
  JWT_SECRET: required('JWT_SECRET', 'dev_insecure_secret_change_me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  EXTENSION_ID: process.env.EXTENSION_ID || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  AI_PROVIDER: process.env.AI_PROVIDER || 'none',
  AI_API_KEY: process.env.AI_API_KEY || '',

  MAX_WATCHES_PER_USER: parseInt(process.env.MAX_WATCHES_PER_USER || '50', 10),
  MIN_CHECK_INTERVAL_MINUTES: parseInt(process.env.MIN_CHECK_INTERVAL || '15', 10),
  MAX_RESPONSE_SIZE_BYTES: parseInt(process.env.MAX_RESPONSE_SIZE || String(5 * 1024 * 1024), 10),
  MAX_PAGE_LOAD_TIME_MS: parseInt(process.env.MAX_PAGE_LOAD_TIME || '30000', 10),
  MAX_CONCURRENT_PAGES: parseInt(process.env.MAX_CONCURRENT_PAGES || '5', 10),

  SNAPSHOT_RETENTION_DAYS: parseInt(process.env.SNAPSHOT_RETENTION_DAYS || '90', 10),
};

module.exports = env;
