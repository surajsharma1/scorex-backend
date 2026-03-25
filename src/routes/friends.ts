import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getFriendRequests,
  removeFriend,
  searchUsers,
  getOnlineFriends,
} from '../controllers/friendController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All friend routes require authentication
router.use(protect as any);

// Search users (must be before /:friendId to avoid collision)
router.get('/search', searchUsers as any);

// Get online friends
router.get('/online', getOnlineFriends as any);

// Get pending friend requests (incoming + outgoing)
router.get('/requests', getFriendRequests as any);

// Get user's accepted friends list
router.get('/', getFriends as any);

// Send friend request
router.post('/:userId/request', sendFriendRequest as any);

// Accept friend request — support both PUT and POST (frontend uses PUT)
router.put('/request/:id/accept', acceptFriendRequest as any);
router.post('/requests/:id/accept', acceptFriendRequest as any);

// Reject friend request — support both DELETE and POST
router.delete('/request/:id/reject', rejectFriendRequest as any);
router.post('/requests/:id/reject', rejectFriendRequest as any);

// Remove friend
router.delete('/:friendId', removeFriend as any);

export default router;
