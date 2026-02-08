import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getFriendRequests,
  removeFriend
} from '../controllers/friendController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All friend routes require authentication
router.use(protect);

// Send friend request
router.post('/request', sendFriendRequest);

// Accept friend request
router.put('/request/:requestId/accept', acceptFriendRequest);

// Reject friend request
router.delete('/request/:requestId/reject', rejectFriendRequest);

// Get user's friends
router.get('/', getFriends);

// Get pending friend requests
router.get('/requests', getFriendRequests);

// Remove friend
router.delete('/:friendId', removeFriend);

export default router;
