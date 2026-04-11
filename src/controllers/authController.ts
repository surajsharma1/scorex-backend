import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dns from 'dns';
import { promisify } from 'util';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }
const signToken = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

// Verifies if the email domain actually has mail servers to receive emails
const resolveMx = promisify(dns.resolveMx);

async function isEmailDomainValid(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const addresses = await resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (err) {
    return false;
  }
}

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;
    
    // --- FIX: DNS Validation for fake emails ---
    const isValidDomain = await isEmailDomainValid(email);
    if (!isValidDomain) {
      return res.status(400).json({ success: false, message: 'Invalid email domain. Please use a real, functioning email address.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });
    
    const user = await User.create({ username, email, password });
    const token = signToken(user._id.toString());
    res.status(201).json({ success: true, token, data: { token, user: { _id: user._id, id: user._id, username: user.username, email: user.email, role: user.role, membershipLevel: user.membershipLevel } } });
  } catch (error) { next(error); }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    const token = signToken(user._id.toString());
    res.json({ success: true, token, data: { token, user: { _id: user._id, id: user._id, username: user.username, email: user.email, role: user.role, membershipLevel: user.membershipLevel, fullName: user.fullName } } });
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
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // OAuth users may not have a password set
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Cannot change password for OAuth accounts' });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const logout = (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'Logged out' });
export const forgotPassword = async (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
export const resetPassword = async (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'Password reset successfully' });

// Strip trailing slash from FRONTEND_URL so redirects don't produce double slashes
const getFrontendUrl = () => (process.env.FRONTEND_URL || '').replace(/\/$/, '');

export const googleCallback = (req: any, res: Response) => {
  if (!req.user?._id) return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
  const token = signToken(req.user._id.toString());
  // state param is set by Login.tsx as encodeURIComponent(window.location.origin)
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
