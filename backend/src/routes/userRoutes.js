const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const userController = require('../controllers/userController');
const { notificationPreferenceEnum } = require('../models/User');

const router = express.Router();

router.use(requireAuth);

router.patch(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 1, max: 120 }),
    body('defaultNotificationPreference').optional().isIn(notificationPreferenceEnum),
    body('defaultMonitoringIntervalMinutes').optional().isInt({ min: 15 }),
  ],
  validate,
  userController.updateProfile
);

router.post(
  '/me/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8, max: 128 }),
  ],
  validate,
  userController.changePassword
);

router.post(
  '/me/delete-account',
  [body('password').notEmpty()],
  validate,
  userController.deleteAccount
);

module.exports = router;
