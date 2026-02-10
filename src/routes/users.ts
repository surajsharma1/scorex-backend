import express from 'express';
import { getNotificationPreferences, updateNotificationPreferences, getProfile, updateProfile, searchUsers } from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(protect as any);

// Notification preferences
router.get('/notifications/preferences', getNotificationPreferences);
router.put('/notifications/preferences', updateNotificationPreferences);

// Profile management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// User search
router.get('/search', searchUsers);

export default router;
