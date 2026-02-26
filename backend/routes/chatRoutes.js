const express = require('express');
const { body, validationResult } = require('express-validator');
const chatService = require('../services/chatService');
const router = express.Router();

// Middleware to check validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Send message
router.post(
  '/message',
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('user_id').notEmpty().withMessage('User ID is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { message, user_id, session_id } = req.body;
      const result = await chatService.sendMessage(user_id, message, session_id);
      
      // Format response for frontend
      res.json({
        success: true,
        response: result.ai_response.message,
        session_id: result.user_message.session_id,
        user_message_id: result.user_message.id,
        ai_message_id: result.ai_response.id
      });
    } catch (error) {
      console.error('Chat route error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get chat history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await chatService.getChatHistory(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check daily limit (unlimited for beta, returns allowed: true)
router.get('/daily-limit', async (req, res) => {
  res.json({
    allowed: true,
    limit: 999999,
    remaining: 999999,
    is_premium: false
  });
});

module.exports = router;