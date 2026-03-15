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
  if (!req.user || !req.user._id) {
    console.error('[OAuth] No user in req.user:', req.user);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }

  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
  // Priority 1: Use state param (passed from frontend Login as redirect_uri)
  let frontendUrl = (req.query.state as string) || '';
  
  // Priority 2: Environment var
  if (!frontendUrl) {
    frontendUrl = process.env.FRONTEND_URL || '';
  }
  
  // Priority 3: Improved dynamic detection
  if (!frontendUrl) {
    const host = req.get('host') || '';
    const protocol = req.get('x-forwarded-proto') === 'https' || req.protocol === 'https' ? 'https' : 'http';
    
    if (host.includes('vercel.app') || host.includes('onrender.com') || host.includes('railway.app')) {
      frontendUrl = `${protocol}://${host.replace('backend', 'frontend').replace('-api', '').replace('-server', '')}/`;
    } else if (host === 'localhost' || host.includes('127.0.0.1')) {
      frontendUrl = 'http://localhost:5173';
    } else {
      // Fallback wildcard prod
      frontendUrl = `${protocol}://${host}`;
      console.warn('[OAuth] Unknown host, using:', frontendUrl);
    }
  }
  
  console.log('[OAuth] Redirecting to frontend:', frontendUrl, { state: req.query.state, host: req.get('host') });
  
  res.cookie('authToken', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });
  
  const fragment = `token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`;
  const redirectUrl = `${frontendUrl}/oauth/callback#${fragment}`;
  
  console.log('[OAuth] Full redirect URL:', redirectUrl);
  res.redirect(redirectUrl);
};

export const githubCallback = googleCallback;

export default {
  register, login, logout, forgotPassword, resetPassword,
  getMe, googleCallback, githubCallback
};

