import express from 'express';
import { protect } from '../middleware/auth';
import User from '../models/User';

interface AuthRequest extends express.Request {
  user?: {
    id: string;
    role?: string;
  };
}

const router = express.Router();

// Public route - anyone can search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || (q as string).length < 2) {
      return res.json({ users: [] });
    }
    
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('username email fullName profilePicture')
      .limit(20);
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply auth middleware to all routes below
router.use(protect as any);

// Admin middleware check helper
const isAdminMiddleware = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

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

// Get current user's profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update current user's profile
router.put('/profile', async (req, res) => {
  try {
    const { fullName, bio, profilePicture } = req.body;
    
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (fullName) user.fullName = fullName;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification preferences
router.get('/notifications/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user?.id).select('notificationPreferences');
    res.json(user?.notificationPreferences || {});
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update notification preferences
router.put('/notifications/preferences', async (req, res) => {
  try {
    const { email, push, sms, tournamentUpdates, matchResults, systemAnnouncements } = req.body;
    
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.notificationPreferences = {
      email: email ?? user.notificationPreferences?.email ?? true,
      push: push ?? user.notificationPreferences?.push ?? true,
      sms: sms ?? user.notificationPreferences?.sms ?? false,
      tournamentUpdates: tournamentUpdates ?? user.notificationPreferences?.tournamentUpdates ?? true,
      matchResults: matchResults ?? user.notificationPreferences?.matchResults ?? true,
      systemAnnouncements: systemAnnouncements ?? user.notificationPreferences?.systemAnnouncements ?? true
    };
    
    await user.save();
    
    res.json({ 
      message: 'Preferences updated',
      notificationPreferences: user.notificationPreferences 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all users (including banned/deleted)
router.get('/all', isAdminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Ban user
router.put('/:id/ban', isAdminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Soft delete (mark as deleted)
    user.deleted = true;
    user.deletedAt = new Date();
    await user.save();
    
    res.json({ message: 'User banned successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Unban user
router.put('/:id/unban', isAdminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.deleted = false;
    user.deletedAt = undefined;
    await user.save();
    
    res.json({ message: 'User unbanned successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
router.put('/:id/role', isAdminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['viewer', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.role = role;
    await user.save();
    
    res.json({ message: 'Role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user membership (admin can grant premium for custom duration)
router.put('/:id/membership', isAdminMiddleware, async (req, res) => {
  try {
    const { level, durationMonths } = req.body;
    
    if (typeof level !== 'number' || level < 0 || level > 2) {
      return res.status(400).json({ message: 'Invalid membership level. Must be 0 (Free), 1 (Basic), or 2 (Premium)' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update membership level (cast to proper type)
    user.membershipLevel = level as 0 | 1 | 2;
    
    // Calculate expiry date if duration is provided
    if (durationMonths && level > 0) {
      if (durationMonths === 999) {
        // Lifetime membership
        user.membershipExpiresAt = new Date('2099-12-31');
      } else {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
        user.membershipExpiresAt = expiryDate;
      }
    } else if (level === 0) {
      // Reset to free
      user.membershipExpiresAt = undefined;
    }
    
    await user.save();
    
    res.json({ 
      message: 'Membership updated successfully', 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        membershipLevel: user.membershipLevel,
        membershipExpiry: user.membershipExpiresAt
      }
    });
  } catch (error) {
    console.error('Membership update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

