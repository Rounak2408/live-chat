/**
 * Message Routes
 */

const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getChatMessages
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.post('/', sendMessage);
router.get('/:chatId', getChatMessages);

module.exports = router;
