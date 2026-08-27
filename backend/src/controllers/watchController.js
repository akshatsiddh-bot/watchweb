const watchService = require('../services/watchService');
const Snapshot = require('../models/Snapshot');
const Change = require('../models/Change');
const Watch = require('../models/Watch');

async function createWatch(req, res, next) {
  try {
    const watch = await watchService.createWatch(req.userId, req.body);
    return res.status(201).json({ watch });
  } catch (err) {
    return next(err);
  }
}

async function listWatches(req, res, next) {
  try {
    const watches = await watchService.listWatches(req.userId, { status: req.query.status });
    return res.json({ watches });
  } catch (err) {
    return next(err);
  }
}

async function getWatch(req, res, next) {
  try {
    const watch = await watchService.getOwnedWatch(req.userId, req.params.id);
    let latestSnapshot = null;
    if (watch.latestSnapshotId) {
      latestSnapshot = await Snapshot.findById(watch.latestSnapshotId);
    }
    return res.json({ watch, latestSnapshot });
  } catch (err) {
    return next(err);
  }
}

async function updateWatch(req, res, next) {
  try {
    const watch = await watchService.updateWatch(req.userId, req.params.id, req.body);
    return res.json({ watch });
  } catch (err) {
    return next(err);
  }
}

async function deleteWatch(req, res, next) {
  try {
    await watchService.deleteWatch(req.userId, req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function pauseWatch(req, res, next) {
  try {
    const watch = await watchService.pauseWatch(req.userId, req.params.id);
    return res.json({ watch });
  } catch (err) {
    return next(err);
  }
}

async function resumeWatch(req, res, next) {
  try {
    const watch = await watchService.resumeWatch(req.userId, req.params.id);
    return res.json({ watch });
  } catch (err) {
    return next(err);
  }
}

async function checkNow(req, res, next) {
  try {
    const watch = await watchService.requestImmediateCheck(req.userId, req.params.id);
    return res.json({ watch, message: 'Check has been queued' });
  } catch (err) {
    return next(err);
  }
}

async function listChanges(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = parseInt(req.query.skip, 10) || 0;
    const changes = await watchService.listChanges(req.userId, req.params.id, { limit, skip });
    return res.json({ changes });
  } catch (err) {
    return next(err);
  }
}

async function getChange(req, res, next) {
  try {
    const change = await watchService.getChangeById(req.userId, req.params.id);
    return res.json({ change });
  } catch (err) {
    return next(err);
  }
}

async function dashboardStats(req, res, next) {
  try {
    const stats = await watchService.getDashboardStats(req.userId);
    return res.json({ stats });
  } catch (err) {
    return next(err);
  }
}

// Polled by the extension's background service worker to discover changes
// that should trigger a chrome.notifications.create() call. Scoped strictly
// to the authenticated user's own watches.
async function pendingNotifications(req, res, next) {
  try {
    const userWatchIds = await Watch.find({ userId: req.userId }).distinct('_id');
    const changes = await Change.find({
      watchId: { $in: userWatchIds },
      notificationStatus: 'pending',
    })
      .sort({ detectedAt: -1 })
      .limit(20)
      .populate('watchId', 'name url');
    return res.json({ changes });
  } catch (err) {
    return next(err);
  }
}

async function acknowledgeNotification(req, res, next) {
  try {
    const change = await Change.findOne({ _id: req.params.id, userId: req.userId });
    if (!change) {
      return res.status(404).json({ error: 'Change not found' });
    }
    change.notificationStatus = 'sent';
    await change.save();
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createWatch,
  listWatches,
  getWatch,
  updateWatch,
  deleteWatch,
  pauseWatch,
  resumeWatch,
  checkNow,
  listChanges,
  getChange,
  dashboardStats,
  pendingNotifications,
  acknowledgeNotification,
};
