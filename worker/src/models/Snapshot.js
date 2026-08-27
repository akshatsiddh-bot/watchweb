const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema(
  {
    watchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Watch', required: true, index: true },
    content: { type: String, required: true }, // raw extracted text (bounded size, enforced by worker)
    normalizedContent: { type: String, required: true }, // noise-stripped, comparison-ready
    contentHash: { type: String, required: true, index: true }, // sha256 of normalizedContent
    capturedAt: { type: Date, default: () => new Date(), index: true },
    metadata: {
      fetchMethod: { type: String, enum: ['http', 'playwright'], default: 'http' },
      httpStatus: { type: Number, default: null },
      contentLength: { type: Number, default: null },
      truncated: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

snapshotSchema.index({ watchId: 1, capturedAt: -1 });
// TTL-style retention is handled by a scheduled cleanup job rather than a hard TTL index,
// since we want to always retain the most recent snapshot per watch regardless of age.

module.exports = mongoose.model('Snapshot', snapshotSchema);
