/**
 * Friend / Friend Request routes
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  getFriends
} = require('../controllers/friendController');

router.use(protect);

router.post('/requests', sendRequest);
router.get('/requests', getRequests);
router.post('/requests/:id/accept', acceptRequest);
router.post('/requests/:id/reject', rejectRequest);
router.get('/', getFriends);

module.exports = router;

