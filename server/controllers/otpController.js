/**
 * OTP Controller
 * Handles OTP generation and verification
 */

const OTP = require('../models/OTP');
const crypto = require('crypto');

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * @desc    Generate and send OTP
 * @route   POST /api/auth/otp/generate
 * @access  Public
 */
exports.generateOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing unverified OTPs for this email
    await OTP.deleteMany({ 
      email: email.toLowerCase(), 
      verified: false 
    });

    // Create new OTP
    const otpRecord = await OTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // In development, return OTP in response
    // In production, this would be sent via email/SMS
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      data: {
        email: email.toLowerCase(),
        ...(isDevelopment && { otp }), // Only show OTP in development
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Generate OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP generation',
      error: error.message
    });
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/otp/verify
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find the most recent unverified OTP for this email
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      verified: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Please generate a new OTP.'
      });
    }

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please generate a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        email: email.toLowerCase(),
        verified: true
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: error.message
    });
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/otp/resend
 * @access  Public
 */
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Delete existing OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Generate new OTP (reuse generateOTP logic)
    return exports.generateOTP(req, res);
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP resend',
      error: error.message
    });
  }
};
