const Watch = require('../models/Watch');
const Change = require('../models/Change');
const Snapshot = require('../models/Snapshot');
const { AppError } = require('../middleware/errorHandler');
const { assertUrlIsSafe } = require('../utils/ssrfProtection');
const env = require('../config/env');

async function assertUnderWatchLimit(userId) {
  const count = await Watch.countDocuments({ userId, status: { $ne: 'deleted' } });
  if (count >= env.MAX_WATCHES_PER_USER) {
    throw new AppError(
      `You have reached the maximum of ${env.MAX_WATCHES_PER_USER} watches. Delete or pause an existing watch first.`,
      400
    );
  }
}

function computeNextCheckAt(intervalMinutes) {
  return new Date(Date.now() + intervalMinutes * 60 * 1000);
}

async function createWatch(userId, payload) {
  await assertUrlIsSafe(payload.url); // throws if unsafe (SSRF)
  await assertUnderWatchLimit(userId);

  if (payload.interval < env.MIN_CHECK_INTERVAL_MINUTES) {
    throw new AppError(
      `Minimum monitoring interval is ${env.MIN_CHECK_INTERVAL_MINUTES} minutes`,
      400
    );
  }

  if (payload.monitoringMode === 'selected' && !payload.selector) {
    throw new AppError('A selector is required when monitoring a selected element', 400);
  }

  const watch = await Watch.create({
    userId,
    name: payload.name,
    url: payload.url,
    monitoringMode: payload.monitoringMode || 'selected',
    selector: payload.selector || null,
    selectorType: payload.selectorType || 'css',
    selectorFallbacks: payload.selectorFallbacks || [],
    selectedText: payload.selectedText || null,
    requiresJs: !!payload.requiresJs,
    interval: payload.interval,
    notificationPreference: payload.notificationPreference || 'every_change',
    status: 'active',
    nextCheckAt: new Date(), // check immediately to capture the initial snapshot
  });

  return watch;
}

async function getOwnedWatch(userId, watchId) {
  const watch = await Watch.findOne({ _id: watchId, userId, status: { $ne: 'deleted' } });
  if (!watch) {
    throw new AppError('Watch not found', 404);
  }
  return watch;
}

async function listWatches(userId, { status } = {}) {
  const filter = { userId, status: { $ne: 'deleted' } };
  if (status) filter.status = status;
  return Watch.find(filter).sort({ createdAt: -1 });
}

async function updateWatch(userId, watchId, updates) {
  const watch = await getOwnedWatch(userId, watchId);

  if (updates.url && updates.url !== watch.url) {
    await assertUrlIsSafe(updates.url);
    watch.url = updates.url;
  }
  if (updates.name !== undefined) watch.name = updates.name;
  if (updates.interval !== undefined) {
    if (updates.interval < env.MIN_CHECK_INTERVAL_MINUTES) {
      throw new AppError(
        `Minimum monitoring interval is ${env.MIN_CHECK_INTERVAL_MINUTES} minutes`,
        400
      );
    }
    watch.interval = updates.interval;
  }
  if (updates.notificationPreference !== undefined) {
    watch.notificationPreference = updates.notificationPreference;
  }
  if (updates.selector !== undefined) watch.selector = updates.selector;
  if (updates.selectorType !== undefined) watch.selectorType = updates.selectorType;
  if (updates.monitoringMode !== undefined) watch.monitoringMode = updates.monitoringMode;

  await watch.save();
  return watch;
}

async function deleteWatch(userId, watchId) {
  const watch = await getOwnedWatch(userId, watchId);
  watch.status = 'deleted';
  await watch.save();
  return watch;
}

async function pauseWatch(userId, watchId) {
  const watch = await getOwnedWatch(userId, watchId);
  if (watch.status === 'deleted') throw new AppError('Watch not found', 404);
  watch.status = 'paused';
  await watch.save();
  return watch;
}

async function resumeWatch(userId, watchId) {
  const watch = await getOwnedWatch(userId, watchId);
  if (watch.status === 'deleted') throw new AppError('Watch not found', 404);
  watch.status = 'active';
  watch.failureCount = 0;
  watch.lastError = null;
  watch.nextCheckAt = new Date();
  await watch.save();
  return watch;
}

async function requestImmediateCheck(userId, watchId) {
  const watch = await getOwnedWatch(userId, watchId);
  watch.nextCheckAt = new Date();
  await watch.save();
  return watch;
}

async function listChanges(userId, watchId, { limit = 50, skip = 0 } = {}) {
  await getOwnedWatch(userId, watchId); // authorization check
  return Change.find({ watchId }).sort({ detectedAt: -1 }).skip(skip).limit(limit);
}

async function getChangeById(userId, changeId) {
  const change = await Change.findOne({ _id: changeId, userId });
  if (!change) {
    throw new AppError('Change not found', 404);
  }
  return change;
}

async function getDashboardStats(userId) {
  const [total, active, error, changesCount, recentChanges] = await Promise.all([
    Watch.countDocuments({ userId, status: { $ne: 'deleted' } }),
    Watch.countDocuments({ userId, status: 'active' }),
    Watch.countDocuments({ userId, status: 'error' }),
    Change.countDocuments({ userId }),
    Change.find({ userId }).sort({ detectedAt: -1 }).limit(10).populate('watchId', 'name url'),
  ]);

  return {
    totalWatches: total,
    activeWatches: active,
    watchesWithErrors: error,
    changesDetected: changesCount,
    recentChanges,
  };
}

module.exports = {
  createWatch,
  getOwnedWatch,
  listWatches,
  updateWatch,
  deleteWatch,
  pauseWatch,
  resumeWatch,
  requestImmediateCheck,
  listChanges,
  getChangeById,
  getDashboardStats,
  computeNextCheckAt,
};
