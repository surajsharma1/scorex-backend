import express from 'express';
import { getNotificationPreferences, updateNotificationPreferences, getProfile, updateProfile, searchUsers } from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public route - anyone can search users
router.get('/search', searchUsers as any);

// Protected routes - require authentication
router.use(protect as any);

// Notification preferences
router.get('/notifications/preferences', getNotificationPreferences);
router.put('/notifications/preferences', updateNotificationPreferences);

// Profile management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);


export default router;
