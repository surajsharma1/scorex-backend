import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

const signToken = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password are required' });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    // Block single-char local parts (a@b.com style)
    if (email.split('@')[0].length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with that username or email already exists' });
    }

    const user = await User.create({ username: cleanUsername, email: cleanEmail, password });
    const token = signToken(user._id.toString());
    res.status(201).json({
      success: true,
      token,
      data: {
        token,
        user: {
          _id: user._id, id: user._id,
          username: user.username, email: user.email,
          role: user.role, membershipLevel: user.membershipLevel,
        },
      },
    });
  } catch (error) { next(error); }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = signToken(user._id.toString());
    res.json({
      success: true,
      token,
      data: {
        token,
        user: {
          _id: user._id, id: user._id,
          username: user.username, email: user.email,
          role: user.role, membershipLevel: user.membershipLevel,
          fullName: user.fullName,
        },
      },
    });
  } catch (error) { next(error); }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.password)
      return res.status(400).json({ success: false, message: 'Cannot change password for OAuth accounts' });
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const logout = (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'Logged out' });

export const forgotPassword = async (_req: AuthRequest, res: Response) =>
  res.json({ success: true, message: 'If that email exists, a reset link was sent.' });

export const resetPassword = async (_req: AuthRequest, res: Response) =>
  res.json({ success: true, message: 'Password reset successfully' });

const getFrontendUrl = () => (process.env.FRONTEND_URL || '').replace(/\/$/, '');

export const googleCallback = (req: any, res: Response) => {
  if (!req.user?._id) return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
  const token = signToken(req.user._id.toString());
  const frontendUrl = req.query.state
    ? decodeURIComponent(req.query.state as string).replace(/\/$/, '')
    : getFrontendUrl();
  res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
};

export const githubCallback = (req: any, res: Response) => {
  if (!req.user?._id) return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
  const token = signToken(req.user._id.toString());
  res.redirect(`${getFrontendUrl()}/oauth/callback?token=${token}`);
};

export default { register, login, getMe, changePassword, logout, forgotPassword, resetPassword, googleCallback, githubCallback };
