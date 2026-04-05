import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = 10 } = req.query;

    // ✅ Guard: empty or missing query returns empty array instead of crashing
    if (!q || (q as string).trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const safeQ = (q as string).trim();

    const users = await User.find({
      $or: [
        { username: { $regex: safeQ, $options: 'i' } },
        { email:    { $regex: safeQ, $options: 'i' } },
        { fullName: { $regex: safeQ, $options: 'i' } }, // ✅ also search full name
      ]
    })
    .select('username email fullName avatar role')  // ✅ include email in response
    .limit(Number(limit));

    res.json({ success: true, data: users });
  } catch (error) { next(error); }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updateMembership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.membershipLevel = req.body.level;
    user.membershipExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const banUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { duration, reason } = req.body;
    const adminId = req.user._id;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const durationMs = {
      '1day': 24*60*60*1000,
      '3day': 3*24*60*60*1000,
      '1week': 7*24*60*60*1000,
      '1month': 30*24*60*60*1000,
      '3month': 90*24*60*60*1000,
      'lifetime': 100 * 365 *24*60*60*1000 // ~100 years
    }[duration];

    if (!durationMs) return res.status(400).json({ success: false, message: 'Invalid duration' });

    user.banned = {
      until: new Date(Date.now() + durationMs),
      reason: reason || 'No reason provided',
      bannedBy: adminId.toString(),
      duration
    };

    await user.save();

    res.json({ success: true, message: 'User banned successfully', data: user });
  } catch (error) { 
    next(error); 
  }
};

export const unbanUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.banned = undefined;
    await user.save();

    res.json({ success: true, message: 'User unbanned successfully', data: user });
  } catch (error) { 
    next(error); 
  }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.role = req.body.role;
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export default { 
  searchUsers, getUsers, getUser, getProfile, 
  updateProfile, updateRole, updateMembership, banUser, unbanUser 
 };


