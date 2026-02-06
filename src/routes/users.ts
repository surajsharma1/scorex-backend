import express from 'express';
import { getNotificationPreferences, updateNotificationPreferences, getProfile, updateProfile } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Notification preferences
router.get('/notifications/preferences', getNotificationPreferences);
router.put('/notifications/preferences', updateNotificationPreferences);

// Profile management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
