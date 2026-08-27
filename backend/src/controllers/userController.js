const User = require('../models/User');
const Watch = require('../models/Watch');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const { AppError } = require('../middleware/errorHandler');

async function updateProfile(req, res, next) {
  try {
    const { name, defaultNotificationPreference, defaultMonitoringIntervalMinutes } = req.body;
    if (name !== undefined) req.user.name = name;
    if (defaultNotificationPreference !== undefined) {
      req.user.defaultNotificationPreference = defaultNotificationPreference;
    }
    if (defaultMonitoringIntervalMinutes !== undefined) {
      req.user.defaultMonitoringIntervalMinutes = defaultMonitoringIntervalMinutes;
    }
    await req.user.save();
    return res.json({ user: req.user.toJSON() });
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const userWithHash = await User.findById(req.userId).select('+passwordHash');
    const valid = await verifyPassword(userWithHash.passwordHash, currentPassword);
    if (!valid) {
      throw new AppError('Current password is incorrect', 401);
    }

    userWithHash.passwordHash = await hashPassword(newPassword);
    userWithHash.tokenVersion += 1; // invalidate existing sessions/tokens
    await userWithHash.save();

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    const userWithHash = await User.findById(req.userId).select('+passwordHash');
    const valid = await verifyPassword(userWithHash.passwordHash, password);
    if (!valid) {
      throw new AppError('Password is incorrect', 401);
    }

    // Soft-delete watches (keeps Change/Snapshot history's userId scoping
    // intact for audit purposes) and hard-delete the account itself.
    await Watch.updateMany({ userId: req.userId }, { $set: { status: 'deleted' } });
    await User.deleteOne({ _id: req.userId });

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { updateProfile, changePassword, deleteAccount };
