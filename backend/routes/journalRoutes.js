const express = require('express');
const { body, validationResult } = require('express-validator');
const journalService = require('../services/journalService');
const router = express.Router();

// Middleware to check validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Create journal entry
router.post(
  '/',
  [
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('user_id').notEmpty().withMessage('User ID is required'),
    body('mood').optional().isInt({ min: 1, max: 5 })
  ],
  validate,
  async (req, res) => {
    try {
      const { content, mood, user_id } = req.body;
      const entry = await journalService.createEntry(user_id, content, mood || 3);
      res.json(entry);
    } catch (error) {
      console.error('Create journal entry route error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get journal entries
router.get('/entries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    const result = await journalService.getEntries(userId);
    res.json(result);
  } catch (error) {
    console.error('Get journal entries route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
