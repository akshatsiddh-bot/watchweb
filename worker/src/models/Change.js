const mongoose = require('mongoose');

const CHANGE_TYPE_ENUM = [
  'text_added',
  'text_removed',
  'text_modified',
  'price_changed',
  'availability_changed',
  'structure_changed',
  'unknown',
];

const NOTIFICATION_STATUS_ENUM = ['pending', 'sent', 'skipped', 'failed'];

const diffPartSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['equal', 'added', 'removed'], required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const changeSchema = new mongoose.Schema(
  {
    watchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Watch', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    previousSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot', default: null },
    currentSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot', required: true },

    changeType: { type: String, enum: CHANGE_TYPE_ENUM, default: 'unknown' },
    diff: [diffPartSchema], // structured word-level diff for rendering
    summary: { type: String, required: true, maxlength: 1000 },

    beforeExcerpt: { type: String, maxlength: 2000 },
    afterExcerpt: { type: String, maxlength: 2000 },

    detectedAt: { type: Date, default: () => new Date(), index: true },
    notificationStatus: { type: String, enum: NOTIFICATION_STATUS_ENUM, default: 'pending' },
  },
  { timestamps: true }
);

changeSchema.index({ watchId: 1, detectedAt: -1 });
changeSchema.index({ userId: 1, detectedAt: -1 });

module.exports = mongoose.model('Change', changeSchema);
module.exports.CHANGE_TYPE_ENUM = CHANGE_TYPE_ENUM;
module.exports.NOTIFICATION_STATUS_ENUM = NOTIFICATION_STATUS_ENUM;
