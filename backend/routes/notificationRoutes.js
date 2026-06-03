const express = require('express');
const { body, validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Register/update push token
// POST body: { user_id, push_token }
router.post(
  '/register',
  [
    body('user_id').notEmpty(),
    body('push_token').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { user_id, push_token } = req.body;
      await notificationService.registerToken(user_id, push_token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Update notification settings
// PUT body: { user_id, notifications_enabled?, inactivity_nudge_enabled?,
//             risk_window_nudge_enabled?, risk_windows? }
router.put(
  '/settings',
  [body('user_id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { user_id, ...settings } = req.body;
      await notificationService.updateSettings(user_id, settings);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Snooze all nudges
// POST body: { user_id, hours? } — defaults to 1 hour
router.post(
  '/snooze',
  [body('user_id').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { user_id, hours = 1 } = req.body;
      await notificationService.snooze(user_id, hours);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Disable a specific nudge type
// POST body: { user_id, type: 'inactivity' | 'risk_window' }
router.post(
  '/disable',
  [body('user_id').notEmpty(), body('type').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { user_id, type } = req.body;
      await notificationService.disableNudgeType(user_id, type);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
