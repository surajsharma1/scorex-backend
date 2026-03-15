/**
 * User Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. All handlers used (req as any).user._id — auth middleware sets req.user.id
 * 2. searchUsers used req.user?._id — same fix
 */

import { Request, Response } from 'express';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50, page = 1, search } = req.query;
    const query: any = { deleted: { $ne: true } };
    if (search) query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const users = await User.find(query).select('-password').limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: was (req as any).user._id
    const user = await User.findById(req.user?.id).select('notificationPreferences');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user.notificationPreferences });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: was (req as any).user._id
    const user = await User.findByIdAndUpdate(req.user?.id, { notificationPreferences: req.body }, { new: true }).select('notificationPreferences');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user.notificationPreferences });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: was (req as any).user._id
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, profilePicture, bio, fullName, dob } = req.body;
    const updateData: any = {};
    if (username)        updateData.username = username;
    if (profilePicture)  updateData.profilePicture = profilePicture;
    if (bio !== undefined) updateData.bio = bio;
    if (fullName)        updateData.fullName = fullName;
    if (dob)             updateData.dob = new Date(dob);

    // FIX: was (req as any).user._id
    const user = await User.findByIdAndUpdate(req.user?.id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    // FIX: was req.user?._id
    const currentUserId = req.user?.id;
    if (!query || typeof query !== 'string') { res.status(400).json({ success: false, message: 'Query parameter is required' }); return; }
    const users = await User.find({
      $or: [{ username: { $regex: query, $options: 'i' } }, { fullName: { $regex: query, $options: 'i' } }],
      deleted: { $ne: true },
      _id: { $ne: currentUserId }
    }).select('username email profilePicture bio fullName').limit(20);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
