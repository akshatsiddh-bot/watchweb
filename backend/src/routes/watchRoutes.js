const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const watchController = require('../controllers/watchController');
const { ALLOWED_INTERVALS_MINUTES, MONITORING_MODE_ENUM, NOTIFICATION_PREFERENCE_ENUM } = require('../models/Watch');

const router = express.Router();

router.use(requireAuth); // every watch route requires authentication

const idParam = param('id').isMongoId().withMessage('Invalid id');

router.get('/dashboard/stats', watchController.dashboardStats);

router.get('/watches', watchController.listWatches);

router.post(
  '/watches',
  [
    body('name').trim().isLength({ min: 1, max: 200 }),
    body('url').isURL({ require_protocol: true }).withMessage('A valid URL is required'),
    body('monitoringMode').optional().isIn(MONITORING_MODE_ENUM),
    body('selector').optional().isString().isLength({ max: 2000 }),
    body('selectorType').optional().isIn(['css', 'xpath']),
    body('selectedText').optional().isString().isLength({ max: 5000 }),
    body('interval').isIn(ALLOWED_INTERVALS_MINUTES).withMessage('Invalid monitoring interval'),
    body('notificationPreference').optional().isIn(NOTIFICATION_PREFERENCE_ENUM),
  ],
  validate,
  watchController.createWatch
);

router.get('/watches/:id', [idParam], validate, watchController.getWatch);

router.patch(
  '/watches/:id',
  [
    idParam,
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('url').optional().isURL({ require_protocol: true }),
    body('interval').optional().isIn(ALLOWED_INTERVALS_MINUTES),
    body('notificationPreference').optional().isIn(NOTIFICATION_PREFERENCE_ENUM),
  ],
  validate,
  watchController.updateWatch
);

router.delete('/watches/:id', [idParam], validate, watchController.deleteWatch);

router.post('/watches/:id/pause', [idParam], validate, watchController.pauseWatch);
router.post('/watches/:id/resume', [idParam], validate, watchController.resumeWatch);
router.post('/watches/:id/check', [idParam], validate, watchController.checkNow);

router.get(
  '/watches/:id/changes',
  [idParam, query('limit').optional().isInt({ min: 1, max: 100 }), query('skip').optional().isInt({ min: 0 })],
  validate,
  watchController.listChanges
);

router.get('/changes/:id', [idParam], validate, watchController.getChange);

router.get('/notifications/pending', watchController.pendingNotifications);
router.post('/notifications/:id/ack', [idParam], validate, watchController.acknowledgeNotification);

module.exports = router;
