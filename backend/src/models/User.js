const mongoose = require('mongoose');

const notificationPreferenceEnum = ['every_change', 'important_only', 'disabled'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    defaultNotificationPreference: {
      type: String,
      enum: notificationPreferenceEnum,
      default: 'every_change',
    },
    defaultMonitoringIntervalMinutes: { type: Number, default: 60 },
    tokenVersion: { type: Number, default: 0 }, // bump to invalidate all existing JWTs
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.notificationPreferenceEnum = notificationPreferenceEnum;
