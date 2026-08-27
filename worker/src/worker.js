const connectDB = require('./config/db');
const logger = require('./config/logger');
const env = require('./config/env');
const { pollAndDispatch } = require('./jobs/scheduler');
const { cleanupOldSnapshots } = require('./jobs/retentionJob');
const { shutdownBrowser } = require('./services/playwrightFetcher');

let pollTimer = null;
let retentionTimer = null;
let stopping = false;

async function tick() {
  if (stopping) return;
  try {
    const { checked } = await pollAndDispatch();
    if (checked > 0) {
      logger.info({ checked }, 'Poll cycle dispatched checks');
    }
  } catch (err) {
    logger.error({ err }, 'Poll cycle failed');
  } finally {
    if (!stopping) {
      pollTimer = setTimeout(tick, env.POLL_INTERVAL_MS);
    }
  }
}

async function retentionTick() {
  if (stopping) return;
  try {
    await cleanupOldSnapshots();
  } catch (err) {
    logger.error({ err }, 'Retention cleanup failed');
  } finally {
    if (!stopping) {
      retentionTimer = setTimeout(retentionTick, 24 * 60 * 60 * 1000); // once per day
    }
  }
}

async function start() {
  await connectDB();
  logger.info({ pollIntervalMs: env.POLL_INTERVAL_MS, batchSize: env.BATCH_SIZE }, 'WatchWeb worker starting');
  tick();
  retentionTick();
}

async function shutdown(signal) {
  logger.info({ signal }, 'Worker shutting down');
  stopping = true;
  if (pollTimer) clearTimeout(pollTimer);
  if (retentionTimer) clearTimeout(retentionTimer);
  await shutdownBrowser();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, 'Worker failed to start');
    process.exit(1);
  });
}

module.exports = { start, shutdown };
