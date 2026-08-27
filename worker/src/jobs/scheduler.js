const Watch = require('../models/Watch');
const { runCheck } = require('./checkWatchJob');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * MVP scheduler: polls MongoDB for watches where nextCheckAt <= now and
 * dispatches checks up to a bounded concurrency. This is intentionally
 * simple and horizontally-unsafe-by-default (see README) - the code is
 * structured so this function's body can be swapped for a BullMQ consumer
 * (worker/src/jobs/queue.js) without touching runCheck() or anything
 * downstream, which is what "scale to independent workers" means here.
 */
async function pollAndDispatch() {
  const now = new Date();

  const dueWatches = await Watch.find({
    status: 'active',
    nextCheckAt: { $lte: now },
  })
    .limit(env.BATCH_SIZE)
    .select('_id');

  if (dueWatches.length === 0) return { checked: 0 };

  // Claim watches immediately by pushing nextCheckAt forward so a slow check
  // doesn't get re-picked-up by the next poll tick while still running.
  const claimUntil = new Date(now.getTime() + 5 * 60 * 1000);
  await Watch.updateMany(
    { _id: { $in: dueWatches.map((w) => w._id) } },
    { $set: { nextCheckAt: claimUntil } }
  );

  const results = await Promise.allSettled(dueWatches.map((w) => runCheck(w._id)));

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.error({ count: failed.length, errors: failed.map((f) => f.reason?.message) }, 'Some checks threw unexpectedly');
  }

  return { checked: dueWatches.length };
}

module.exports = { pollAndDispatch };
