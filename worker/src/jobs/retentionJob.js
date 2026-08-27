const Watch = require('../models/Watch');
const Snapshot = require('../models/Snapshot');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * Deletes snapshots older than the configured retention window, EXCEPT each
 * watch's current latestSnapshotId (always kept so "current content" can
 * still be displayed regardless of age).
 */
async function cleanupOldSnapshots() {
  const cutoff = new Date(Date.now() - env.SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const keepIds = await Watch.distinct('latestSnapshotId', { latestSnapshotId: { $ne: null } });

  const result = await Snapshot.deleteMany({
    capturedAt: { $lt: cutoff },
    _id: { $nin: keepIds },
  });

  if (result.deletedCount > 0) {
    logger.info({ deletedCount: result.deletedCount }, 'Snapshot retention cleanup completed');
  }
  return result.deletedCount;
}

module.exports = { cleanupOldSnapshots };
