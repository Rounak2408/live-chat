/**
 * Socket.io Handlers
 * Handles real-time messaging and user status updates
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../config/jwt');
const UserStatus = require('../models/UserStatus');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const BlockedUser = require('../models/BlockedUser');

// Store active socket connections
const activeUsers = new Map(); // userId -> socketId

module.exports = function setupSocketHandlers(io) {
  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);

    /**
     * Event: user-online
     * When a user connects, update their online status
     */
    socket.on('user-online', async () => {
      try {
        const userId = socket.userId;
        
        if (!userId) {
          return;
        }

        // Store socket connection
        activeUsers.set(userId, socket.id);

        // Update user status to online
        await UserStatus.findOneAndUpdate(
          { userId },
          { status: 'online', lastSeen: new Date() },
          { upsert: true, new: true }
        );

        // Notify all clients about updated online status
        io.emit('user-status-updated', {
          userId,
          status: 'online'
        });

        console.log(`👤 User ${userId} is now online`);
      } catch (error) {
        console.error('Error in user-online:', error);
      }
    });

    /**
     * Event: join-chat
     * User joins a chat room
     */
    socket.on('join-chat', async (data) => {
      try {
        let { chatId } = data;
        const userId = socket.userId;

        if (!chatId || !userId) {
          return;
        }

        // If client accidentally sent a whole chat object, try to extract _id
        if (typeof chatId === 'object') {
          if (chatId._id) {
            chatId = chatId._id.toString();
          } else if (chatId.chatId) {
            chatId = chatId.chatId.toString();
          }
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
          console.error('Invalid chatId received in join-chat:', chatId);
          return;
        }

        // Verify chat exists (no strict participant check to avoid blocking)
        const chat = await Chat.findById(chatId);
        if (chat) {
          socket.join(`chat-${chatId}`);
          console.log(`🚪 User ${userId} joined chat ${chatId}`);
        }
      } catch (error) {
        console.error('Error in join-chat:', error);
      }
    });

    /**
     * Event: leave-chat
     * User leaves a chat room
     */
    socket.on('leave-chat', (data) => {
      try {
        const { chatId } = data;
        if (chatId) {
          socket.leave(`chat-${chatId}`);
          console.log(`🚪 User left chat ${chatId}`);
        }
      } catch (error) {
        console.error('Error in leave-chat:', error);
      }
    });

    /**
     * Event: send-message
     * Handle real-time message sending
     */
    socket.on('send-message', async (data) => {
      try {
        let { chatId, text } = data;
        const senderId = socket.userId;

        if (!chatId || !text || !senderId) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // If client accidentally sent a whole chat object, try to extract _id
        if (typeof chatId === 'object') {
          if (chatId._id) {
            chatId = chatId._id.toString();
          } else if (chatId.chatId) {
            chatId = chatId.chatId.toString();
          }
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
          socket.emit('error', { message: 'Invalid chat' });
          return;
        }

        // Verify chat exists
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check if sender is blocked
        const participants = chat.participants.filter(p => p.toString() !== senderId);
        for (const participantId of participants) {
          const isBlocked = await BlockedUser.findOne({
            userId: participantId,
            blockedUserId: senderId
          });
          if (isBlocked) {
            socket.emit('error', { message: 'You are blocked' });
            return;
          }
        }

        // Create and save message
        const message = await Message.create({
          chatId,
          senderId,
          text: text.trim()
        });

        await message.populate('senderId', 'name email');
        await message.populate('chatId');

        // Update chat's updatedAt
        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

        // Broadcast message to all users in the chat room
        io.to(`chat-${chatId}`).emit('new-message', {
          success: true,
          data: { message }
        });

        console.log(`💭 Message sent in chat ${chatId} by user ${senderId}`);
      } catch (error) {
        console.error('Error in send-message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Event: message-seen
     * Receiver acknowledges they have seen a message
     */
    socket.on('message-seen', async (data) => {
      try {
        const { chatId, messageId } = data || {};
        if (!chatId || !messageId) return;
        if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(messageId)) return;

        // Broadcast seen receipt to everyone in room (sender will update UI)
        io.to(`chat-${chatId}`).emit('message-seen', { chatId, messageId });
      } catch (error) {
        console.error('Error in message-seen:', error);
      }
    });

    /**
     * Event: typing-start
     * User starts typing
     */
    socket.on('typing-start', (data) => {
      try {
        const { chatId } = data;
        const userId = socket.userId;

        if (chatId && userId) {
          socket.to(`chat-${chatId}`).emit('user-typing', {
            chatId,
            userId,
            isTyping: true
          });
        }
      } catch (error) {
        console.error('Error in typing-start:', error);
      }
    });

    /**
     * Event: typing-stop
     * User stops typing
     */
    socket.on('typing-stop', (data) => {
      try {
        const { chatId } = data;
        const userId = socket.userId;

        if (chatId && userId) {
          socket.to(`chat-${chatId}`).emit('user-typing', {
            chatId,
            userId,
            isTyping: false
          });
        }
      } catch (error) {
        console.error('Error in typing-stop:', error);
      }
    });

    /**
     * Event: disconnect
     * Handle user disconnection
     */
    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;

        if (userId) {
          // Remove from active users
          activeUsers.delete(userId);

          // Update user status to offline
          await UserStatus.findOneAndUpdate(
            { userId },
            { status: 'offline', lastSeen: new Date() }
          );

          // Notify all clients about updated online status
          io.emit('user-status-updated', {
            userId,
            status: 'offline'
          });

          console.log(`❌ User ${userId} disconnected`);
        }
      } catch (error) {
        console.error('Error in disconnect:', error);
      }
    });
  });
};
