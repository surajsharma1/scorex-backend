import express from 'express';
import { getNotificationPreferences, updateNotificationPreferences, getProfile, updateProfile, searchUsers } from '../controllers/userController';
import { protect } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// Public route - anyone can search users
router.get('/search', searchUsers as any);

// Protected routes - require authentication
router.use(protect as any);

// Stats endpoint - returns user statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const organizerUsers = await User.countDocuments({ role: 'organizer' });
    res.json({ totalUsers, adminUsers, organizerUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Notification preferences
router.get('/notifications/preferences', getNotificationPreferences);
router.put('/notifications/preferences', updateNotificationPreferences);

// Profile management
router.get('/profile', getProfile);
router.put('/profile', updateProfile)


export default router;
