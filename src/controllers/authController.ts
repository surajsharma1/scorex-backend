import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { registerSchema, loginSchema } from '../utils/validation';

interface AuthRequest extends Request { user?: any; }

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({ username, email, password });
    await user.populate('membership');
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) { next(error); }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    
    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) { next(error); }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id).populate('membership');
  res.json({ success: true, data: user });
};

export const logout = (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Logged out' });
};

export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Email logic stub
  res.json({ success: true, message: 'Password reset email sent' });
};

export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Token verification + password update
  res.json({ success: true, message: 'Password reset successful' });
};

export const googleCallback = (req: any, res: Response) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
  // Production frontend URLs - Render backend uses these
  const frontendUrl = process.env.FRONTEND_URL || 
    (req.get('host')?.includes('onrender.com') || req.get('host')?.includes('vercel.app') ? 'https://scorex-live.vercel.app' : 'http://localhost:5173');
  
  res.cookie('authToken', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });
  
  // For existing users with username (your case) - direct dashboard with token
  const fragment = `token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`;
  res.redirect(`${frontendUrl}/oauth/callback#${fragment}`);
};

export const githubCallback = googleCallback;

export default {
  register, login, logout, forgotPassword, resetPassword,
  getMe, googleCallback, githubCallback
};

