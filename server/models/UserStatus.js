/**
 * User Status Model
 * Tracks user online/offline status and last seen time
 */

const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userStatusSchema.index({ userId: 1 });
userStatusSchema.index({ status: 1 });

module.exports = mongoose.model('UserStatus', userStatusSchema);
