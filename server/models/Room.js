/**
 * Room Model
 * Represents a group chat room with admin and members
 */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Room name cannot be more than 50 characters']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
roomSchema.index({ roomName: 1 });
roomSchema.index({ members: 1 });
roomSchema.index({ adminId: 1 });

module.exports = mongoose.model('Room', roomSchema);
