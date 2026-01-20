/**
 * Friend / Friend Request controller
 */

const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

/**
 * @desc    Send a friend request
 * @route   POST /api/friends/requests
 * @access  Private
 */
exports.sendRequest = async (req, res) => {
  try {
    const fromUser = req.user.id;
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user is required'
      });
    }

    if (toUserId === fromUser) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }

    const target = await User.findById(toUserId);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let request = await FriendRequest.findOne({ fromUser, toUser: toUserId });
    if (request && request.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }

    if (!request) {
      request = await FriendRequest.create({
        fromUser,
        toUser: toUserId,
        status: 'pending'
      });
    } else {
      request.status = 'pending';
      await request.save();
    }

    await request.populate('fromUser', 'name email');
    await request.populate('toUser', 'name email');

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      data: { request }
    });
  } catch (error) {
    console.error('Send Friend Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get incoming/outgoing friend requests
 * @route   GET /api/friends/requests
 * @access  Private
 */
exports.getRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const incoming = await FriendRequest.find({
      toUser: userId,
      status: 'pending'
    }).populate('fromUser', 'name email');

    const outgoing = await FriendRequest.find({
      fromUser: userId,
      status: 'pending'
    }).populate('toUser', 'name email');

    res.status(200).json({
      success: true,
      data: {
        incoming,
        outgoing
      }
    });
  } catch (error) {
    console.error('Get Friend Requests Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Accept a friend request
 * @route   POST /api/friends/requests/:id/accept
 * @access  Private
 */
exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const request = await FriendRequest.findById(id).populate('fromUser', 'name email');
    if (!request || request.toUser.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    request.status = 'accepted';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      data: { request }
    });
  } catch (error) {
    console.error('Accept Friend Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Reject a friend request
 * @route   POST /api/friends/requests/:id/reject
 * @access  Private
 */
exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const request = await FriendRequest.findById(id);
    if (!request || request.toUser.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    request.status = 'rejected';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject Friend Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get all accepted friends for current user
 * @route   GET /api/friends
 * @access  Private
 */
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.find({
      status: 'accepted',
      $or: [{ fromUser: userId }, { toUser: userId }]
    }).populate('fromUser toUser', 'name email');

    const friends = requests.map((reqItem) => {
      const friend =
        reqItem.fromUser._id.toString() === userId
          ? reqItem.toUser
          : reqItem.fromUser;
      return {
        id: friend._id,
        name: friend.name,
        email: friend.email
      };
    });

    res.status(200).json({
      success: true,
      count: friends.length,
      data: { friends }
    });
  } catch (error) {
    console.error('Get Friends Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

