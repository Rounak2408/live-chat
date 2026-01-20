/**
 * User Controller
 * Handles user-related operations
 */

const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const BlockedUser = require('../models/BlockedUser');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private
 */
exports.getAllUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const users = await User.find({ _id: { $ne: userId } })
      .select('name email createdAt');

    // Get status for each user
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const status = await UserStatus.findOne({ userId: user._id });
        return {
          ...user.toObject(),
          status: status ? status.status : 'offline',
          lastSeen: status ? status.lastSeen : null
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithStatus.length,
      data: { users: usersWithStatus }
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get online users
 * @route   GET /api/users/online
 * @access  Private
 */
exports.getOnlineUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Consider users "online" only if their lastSeen is recent
    const STALE_MINUTES = 5;
    const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

    const onlineStatuses = await UserStatus.find({
      status: 'online',
      lastSeen: { $gte: cutoff },
      userId: { $ne: userId }
    }).populate('userId', 'name email');

    const onlineUsers = onlineStatuses.map((status) => ({
      id: status.userId._id,
      name: status.userId.name,
      email: status.userId.email,
      status: status.status,
      lastSeen: status.lastSeen
    }));

    res.status(200).json({
      success: true,
      count: onlineUsers.length,
      data: { users: onlineUsers }
    });
  } catch (error) {
    console.error('Get Online Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Block a user
 * @route   POST /api/users/block
 * @access  Private
 */
exports.blockUser = async (req, res) => {
  try {
    const { blockedUserId } = req.body;
    const userId = req.user.id;

    if (!blockedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Blocked user ID is required'
      });
    }

    if (userId === blockedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
      });
    }

    // Check if already blocked
    const existingBlock = await BlockedUser.findOne({
      userId,
      blockedUserId
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    const blockedUser = await BlockedUser.create({
      userId,
      blockedUserId
    });

    res.status(201).json({
      success: true,
      message: 'User blocked successfully',
      data: { blockedUser }
    });
  } catch (error) {
    console.error('Block User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Unblock a user
 * @route   DELETE /api/users/unblock/:blockedUserId
 * @access  Private
 */
exports.unblockUser = async (req, res) => {
  try {
    const { blockedUserId } = req.params;
    const userId = req.user.id;

    const blockedUser = await BlockedUser.findOneAndDelete({
      userId,
      blockedUserId
    });

    if (!blockedUser) {
      return res.status(404).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Unblock User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get blocked users
 * @route   GET /api/users/blocked
 * @access  Private
 */
exports.getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const blockedUsers = await BlockedUser.find({ userId })
      .populate('blockedUserId', 'name email');

    const users = blockedUsers.map(block => ({
      id: block.blockedUserId._id,
      name: block.blockedUserId.name,
      email: block.blockedUserId.email,
      blockedAt: block.createdAt
    }));

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get Blocked Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
