const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const router = express.Router();

// Middleware to check validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('legalConsent').isBoolean().custom(value => value === true).withMessage('Legal consent is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, legalConsent, phoneNumber } = req.body;
      const result = await authService.register(name, email, password, legalConsent, phoneNumber);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ success: false, error: error.message });
    }
  }
);

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }
    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Request password reset
router.post(
  '/request-password-reset',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// Get current user (protected route)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const user = await authService.getCurrentUser(token);
    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

module.exports = router;
