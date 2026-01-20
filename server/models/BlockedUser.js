/**
 * Blocked User Model
 * Tracks which users have blocked other users
 */

const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  blockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Blocked User ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Prevent duplicate blocks
blockedUserSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });

// Prevent users from blocking themselves
blockedUserSchema.pre('save', function(next) {
  if (this.userId.toString() === this.blockedUserId.toString()) {
    next(new Error('Users cannot block themselves'));
  } else {
    next();
  }
});

module.exports = mongoose.model('BlockedUser', blockedUserSchema);
