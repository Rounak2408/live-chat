/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe
} = require('../controllers/authController');
const {
  generateOTP,
  verifyOTP,
  resendOTP
} = require('../controllers/otpController');
const { protect } = require('../middleware/auth');

// OTP routes
router.post('/otp/generate', generateOTP);
router.post('/otp/verify', verifyOTP);
router.post('/otp/resend', resendOTP);

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
