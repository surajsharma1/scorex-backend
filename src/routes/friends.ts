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
router.use(protect as any);

// Send friend request
router.post('/:userId/request', sendFriendRequest as any);

// Accept friend request
router.put('/request/:requestId/accept', acceptFriendRequest as any);

// Reject friend request
router.delete('/request/:requestId/reject', rejectFriendRequest as any);

// Get user's friends
router.get('/', getFriends as any);

// Get pending friend requests
router.get('/requests', getFriendRequests as any);

// Remove friend
router.delete('/:friendId', removeFriend as any);

export default router;
