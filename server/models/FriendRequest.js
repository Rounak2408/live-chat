/**
 * FriendRequest Model
 * Stores pending/accepted friend requests between users
 */

const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

friendRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });
friendRequestSchema.index({ toUser: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);

