import express from 'express';
import { getConversations, getMessages, sendMessage, markAsRead, deleteMessage } from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All message routes require authentication
router.use(protect as any);

// Get all conversations
router.get('/conversations', getConversations as any);

// Get messages with a specific user
router.get('/:userId', getMessages as any);

// Send a message
router.post('/', sendMessage as any);

// Mark conversation as read
router.put('/:conversationId/read', markAsRead as any);

// Delete a message
router.delete('/:messageId', deleteMessage as any);

export default router;
