/**
 * Chat Routes
 */

const express = require('express');
const router = express.Router();
const {
  createOrGetChat,
  getUserChats,
  getChatById
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.post('/', createOrGetChat);
router.get('/', getUserChats);
router.get('/:chatId', getChatById);

module.exports = router;
