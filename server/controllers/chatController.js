/**
 * Chat Controller
 * Handles chat-related operations
 */

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

/**
 * @desc    Create or get a chat
 * @route   POST /api/chats
 * @access  Private
 */
exports.createOrGetChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required'
      });
    }

    // Check if users are blocked
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { userId: userId, blockedUserId: participantId },
        { userId: participantId, blockedUserId: userId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create chat with blocked user'
      });
    }

    // Check if chat already exists (one-on-one)
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [userId, participantId] }
    }).populate('participants', 'name email');

    if (chat) {
      return res.status(200).json({
        success: true,
        data: { chat }
      });
    }

    // Create new chat
    chat = await Chat.create({
      participants: [userId, participantId],
      isGroup: false
    });

    await chat.populate('participants', 'name email');

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: { chat }
    });
  } catch (error) {
    console.error('Create Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get all chats for a user
 * @route   GET /api/chats
 * @access  Private
 */
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: { $in: [userId] }
    })
      .populate('participants', 'name email')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: chats.length,
      data: { chats }
    });
  } catch (error) {
    console.error('Get Chats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get a single chat by ID
 * @route   GET /api/chats/:chatId
 * @access  Private
 */
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $in: [userId] }
    }).populate('participants', 'name email');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { chat }
    });
  } catch (error) {
    console.error('Get Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
