const mongoose = require('mongoose');

const ALLOWED_INTERVALS_MINUTES = [15, 30, 60, 360, 720, 1440];
const STATUS_ENUM = ['active', 'paused', 'error', 'deleted'];
const MONITORING_MODE_ENUM = ['selected', 'whole_page'];
const SELECTOR_TYPE_ENUM = ['css', 'xpath'];
const NOTIFICATION_PREFERENCE_ENUM = ['every_change', 'important_only', 'disabled'];

const watchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },

    monitoringMode: { type: String, enum: MONITORING_MODE_ENUM, default: 'selected' },

    // Selector info - only required when monitoringMode === 'selected'
    selector: { type: String, default: null },
    selectorType: { type: String, enum: SELECTOR_TYPE_ENUM, default: 'css' },
    selectorFallbacks: [{ type: String }], // ordered list of alternative selectors
    selectedText: { type: String, default: null, maxlength: 5000 }, // preview only

    requiresJs: { type: Boolean, default: false }, // hint: use Playwright for this watch

    interval: {
      type: Number,
      enum: ALLOWED_INTERVALS_MINUTES,
      default: 60,
      required: true,
    },

    status: { type: String, enum: STATUS_ENUM, default: 'active', index: true },

    notificationPreference: {
      type: String,
      enum: NOTIFICATION_PREFERENCE_ENUM,
      default: 'every_change',
    },

    lastCheckedAt: { type: Date, default: null },
    lastChangedAt: { type: Date, default: null },
    nextCheckAt: { type: Date, default: () => new Date(), index: true },

    failureCount: { type: Number, default: 0 },
    lastError: { type: String, default: null },

    latestSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot', default: null },
  },
  { timestamps: true }
);

watchSchema.index({ status: 1, nextCheckAt: 1 });
watchSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Watch', watchSchema);
module.exports.ALLOWED_INTERVALS_MINUTES = ALLOWED_INTERVALS_MINUTES;
module.exports.STATUS_ENUM = STATUS_ENUM;
module.exports.MONITORING_MODE_ENUM = MONITORING_MODE_ENUM;
module.exports.SELECTOR_TYPE_ENUM = SELECTOR_TYPE_ENUM;
module.exports.NOTIFICATION_PREFERENCE_ENUM = NOTIFICATION_PREFERENCE_ENUM;
