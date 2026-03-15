import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = 10 } = req.query;
    const users = await User.find({
      $or: [
        { username: { $regex: q as string, $options: 'i' } },
        { email: { $regex: q as string, $options: 'i' } }
      ]
    }).select('-password').limit(Number(limit));
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
    
    user.membership.level = req.body.level;
    user.membership.expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export default { getUsers, getUser, updateProfile, updateMembership };

