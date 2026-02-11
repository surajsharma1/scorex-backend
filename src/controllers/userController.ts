  import { Request, Response } from 'express';
import User from '../models/User';
import auditLogger from '../utils/auditLogger';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById((req as any).user._id).select('notificationPreferences');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user.notificationPreferences);
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      (req as any).user._id,
      { notificationPreferences: req.body },
      { new: true }
    ).select('notificationPreferences');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user.notificationPreferences);
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById((req as any).user._id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, profilePicture, bio, fullName, dob } = req.body;
    const updateData: any = { username, email, profilePicture, bio, fullName };
    if (dob) {
      updateData.dob = new Date(dob);
    }
    const user = await User.findByIdAndUpdate(
      (req as any).user._id,
      updateData,
      { new: true }
    ).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const currentUserId = req.user?._id;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Query parameter is required' });
      return;
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      deleted: { $ne: true },
      _id: { $ne: currentUserId } // Exclude current user
    }).select('username email profilePicture bio fullName').limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
