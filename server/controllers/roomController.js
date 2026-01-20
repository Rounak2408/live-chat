/**
 * Room Controller
 * Handles room-related operations
 */

const Room = require('../models/Room');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

/**
 * @desc    Create a new room
 * @route   POST /api/rooms
 * @access  Private
 */
exports.createRoom = async (req, res) => {
  try {
    const { roomName, members } = req.body;
    const adminId = req.user.id;

    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'Room name is required'
      });
    }

    // Check if room name already exists
    const existingRoom = await Room.findOne({ roomName });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room name already exists'
      });
    }

    // Add admin to members if not already included
    const roomMembers = members && Array.isArray(members) 
      ? [...new Set([adminId, ...members])] 
      : [adminId];

    // Create associated chat first
    const chat = await Chat.create({
      participants: roomMembers,
      isGroup: true
    });

    // Create room and link chatId
    const room = await Room.create({
      roomName,
      members: roomMembers,
      adminId,
      chatId: chat._id
    });

    await room.populate('members', 'name email');
    await room.populate('adminId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room, chatId: chat._id.toString() }
    });
  } catch (error) {
    console.error('Create Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get all rooms for a user
 * @route   GET /api/rooms
 * @access  Private
 */
exports.getUserRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({
      members: { $in: [userId] }
    })
      .populate('members', 'name email')
      .populate('adminId', 'name email')
      .populate('chatId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: { rooms }
    });
  } catch (error) {
    console.error('Get Rooms Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get a single room by ID
 * @route   GET /api/rooms/:roomId
 * @access  Private
 */
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({
      _id: roomId,
      members: { $in: [userId] }
    })
      .populate('members', 'name email')
      .populate('adminId', 'name email')
      .populate('chatId');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Ensure chatId is a string
    const chatIdString = room.chatId ? (room.chatId.toString ? room.chatId.toString() : (room.chatId._id ? room.chatId._id.toString() : room.chatId)) : null;

    res.status(200).json({
      success: true,
      data: { room, chatId: chatIdString }
    });
  } catch (error) {
    console.error('Get Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Join a room by name (and get/create its chat)
 * @route   GET /api/rooms/join/:roomName
 * @access  Private
 */
exports.joinRoomByName = async (req, res) => {
  try {
    const { roomName } = req.params;
    const userId = req.user.id;

    let room = await Room.findOne({ roomName })
      .populate('members', 'name email')
      .populate('adminId', 'name email')
      .populate('chatId');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Add user to members if not already present
    const isMember = room.members.some(m => m._id.toString() === userId);
    if (!isMember) {
      room.members.push(userId);
      await room.save();
    }

    // Ensure a chat exists and is linked
    let chatId = room.chatId;
    if (!chatId) {
      const chat = await Chat.create({
        participants: room.members,
        isGroup: true
      });
      room.chatId = chat._id;
      await room.save();
      chatId = chat._id;
    }

    // Ensure the chat's participants list includes this user
    const chatDoc = await Chat.findById(chatId);
    if (chatDoc) {
      const hasParticipant = chatDoc.participants.some(
        (p) => p.toString() === userId
      );
      if (!hasParticipant) {
        chatDoc.participants.push(userId);
        await chatDoc.save();
      }
    }

    // Ensure chatId is a string (not ObjectId object)
    const chatIdString = chatId.toString ? chatId.toString() : (chatId._id ? chatId._id.toString() : chatId);

    res.status(200).json({
      success: true,
      message: 'Joined room successfully',
      data: { room, chatId: chatIdString }
    });
  } catch (error) {
    console.error('Get Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Add members to a room
 * @route   PUT /api/rooms/:roomId/members
 * @access  Private
 */
exports.addMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { members } = req.body;
    const userId = req.user.id;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Members array is required'
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is admin
    if (room.adminId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can add members'
      });
    }

    // Add new members (avoid duplicates)
    const existingMembers = room.members.map(m => m.toString());
    const newMembers = members.filter(m => !existingMembers.includes(m));
    
    if (newMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All members are already in the room'
      });
    }

    room.members.push(...newMembers);
    await room.save();

    // Update associated chat
    const chat = await Chat.findOne({
      participants: { $all: room.members },
      isGroup: true
    });
    
    if (chat) {
      chat.participants = room.members;
      await chat.save();
    }

    await room.populate('members', 'name email');

    res.status(200).json({
      success: true,
      message: 'Members added successfully',
      data: { room }
    });
  } catch (error) {
    console.error('Add Members Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Remove a member from a room
 * @route   DELETE /api/rooms/:roomId/members/:memberId
 * @access  Private
 */
exports.removeMember = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is admin or removing themselves
    if (room.adminId.toString() !== userId && memberId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can remove other members'
      });
    }

    // Cannot remove admin
    if (room.adminId.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove room admin'
      });
    }

    room.members = room.members.filter(
      m => m.toString() !== memberId
    );
    await room.save();

    // Update associated chat
    const chat = await Chat.findOne({
      participants: { $all: room.members },
      isGroup: true
    });
    
    if (chat) {
      chat.participants = room.members;
      await chat.save();
    }

    await room.populate('members', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: { room }
    });
  } catch (error) {
    console.error('Remove Member Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
