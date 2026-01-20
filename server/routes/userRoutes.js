/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getOnlineUsers,
  blockUser,
  unblockUser,
  getBlockedUsers
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.get('/', getAllUsers);
router.get('/online', getOnlineUsers);
router.get('/blocked', getBlockedUsers);
router.post('/block', blockUser);
router.delete('/unblock/:blockedUserId', unblockUser);

module.exports = router;
