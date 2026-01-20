/**
 * Message Controller
 * Handles message-related operations
 */

const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const BlockedUser = require('../models/BlockedUser');

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const senderId = req.user.id;

    if (!chatId || !text) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and message text are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat'
      });
    }

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if sender is blocked by any participant
    const participants = chat.participants.filter(p => p.toString() !== senderId);
    for (const participantId of participants) {
      const isBlocked = await BlockedUser.findOne({
        userId: participantId,
        blockedUserId: senderId
      });
      if (isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'You are blocked by a participant'
        });
      }
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId,
      text: text.trim()
    });

    await message.populate('senderId', 'name email');
    await message.populate('chatId');

    // Update chat's updatedAt
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });
  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get all messages for a chat
 * @route   GET /api/messages/:chatId
 * @access  Private
 */
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Get messages
    const messages = await Message.find({ chatId })
      .populate('senderId', 'name email')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: { messages }
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
