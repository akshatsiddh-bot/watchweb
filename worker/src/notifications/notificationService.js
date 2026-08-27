const logger = require('../config/logger');

/**
 * Notification delivery abstraction.
 *
 * Delivery model: the worker does not push directly to the browser (workers
 * have no persistent connection to the user's browser). Instead it marks a
 * Change's `notificationStatus`, and the backend exposes
 * GET /api/notifications/pending, which the extension's background service
 * worker polls periodically and turns into a chrome.notifications.create()
 * call. This keeps the heavy monitoring work entirely server-side (per the
 * "no client-side polling of target websites" requirement) while still
 * supporting near-real-time browser notifications.
 *
 * This module is intentionally provider-agnostic: `notify()` decides
 * in-app/browser eligibility now, and email/Telegram/Discord channels can be
 * added later by adding new branches here without touching calling code.
 */
async function notify(change, watch) {
  if (watch.notificationPreference === 'disabled') {
    change.notificationStatus = 'skipped';
    return change;
  }

  if (watch.notificationPreference === 'important_only') {
    const importantTypes = ['price_changed', 'availability_changed', 'structure_changed'];
    if (!importantTypes.includes(change.changeType)) {
      change.notificationStatus = 'skipped';
      return change;
    }
  }

  // Marking as 'pending' is itself the delivery action for the browser
  // notification channel - the extension picks it up on its next poll.
  change.notificationStatus = 'pending';
  logger.info({ watchId: watch._id.toString(), changeType: change.changeType }, 'Change queued for notification');
  return change;
}

module.exports = { notify };
