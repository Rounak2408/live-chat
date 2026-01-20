/**
 * Room Routes
 */

const express = require('express');
const router = express.Router();
const {
  createRoom,
  getUserRooms,
  getRoomById,
  addMembers,
  removeMember,
  joinRoomByName
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.post('/', createRoom);
router.get('/', getUserRooms);
router.get('/join/:roomName', joinRoomByName);
router.get('/:roomId', getRoomById);
router.put('/:roomId/members', addMembers);
router.delete('/:roomId/members/:memberId', removeMember);

module.exports = router;
