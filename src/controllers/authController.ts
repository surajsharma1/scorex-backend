/**
 * Auth Controller
 * Complete authentication system with email validation, OAuth, JWT
 * Following PROJECT_ALGORITHM.md specifications
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// ==========================================
// TYPES
// ==========================================

interface AuthRequest extends Request {
  user?: any;
}

// ==========================================
// CONFIG
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET || 'scorex-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ==========================================
// DISPOSABLE EMAIL DOMAINS
// ==========================================

const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'sharklasers.com', 'spam4.me', 'trashmail.com',
  'yopmail.com', 'mintemail.com', 'fakeinbox.com', 'maildrop.cc'
];

// ==========================================
// EMAIL VALIDATION (per algorithm)
// ==========================================

const validateEmail = (email: string): { valid: boolean; reason?: string } => {
  // Check valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  
  // Extract domain
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, reason: 'Invalid email domain' };
  }
  
  // Check disposable domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, reason: 'Disposable emails are not allowed' };
  }
  
  return { valid: true };
};

// ==========================================
// TOKEN GENERATION
// ==========================================

const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// ==========================================
// CONTROLLERS
// ==========================================

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, fullName } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }
    
    // Validate email per algorithm
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.reason
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }
    
    // Create user (no OTP required per algorithm)
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      fullName: fullName || username,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true // Per algorithm - no OTP verification required
    });
    
    // Generate token
    const token = generateToken(user._id.toString());
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          membershipLevel: user.membershipLevel
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login (optional)
    user.save();
    
    // Generate token
    const token = generateToken(user._id.toString());
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          membershipLevel: user.membershipLevel,
          membershipExpiresAt: user.membershipExpiresAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        membershipLevel: user.membershipLevel,
        membershipExpiresAt: user.membershipExpiresAt,
        profilePicture: user.profilePicture,
        bio: user.bio,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, bio, profilePicture, notificationPreferences } = req.body;
    
    const user = await User.findById(req.user?.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update fields
    if (fullName) user.fullName = fullName;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;
    if (notificationPreferences) user.notificationPreferences = notificationPreferences;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }
    
    const user = await User.findById(req.user?.id).select('+password');
    
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Generate new token
    const token = generateToken(user._id.toString());
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      data: { token }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if user exists
    if (!user) {
      return res.json({
        success: true,
        message: 'If email exists, reset link will be sent'
      });
    }
    
    // Generate OTP (for future implementation)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = resetToken;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();
    
    // TODO: Send email with reset token
    
    res.json({
      success: true,
      message: 'If email exists, reset link will be sent',
      // Remove in production - only for testing
      devToken: resetToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP and new password'
      });
    }
    
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      otp,
      otpExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    const token = generateToken(user._id.toString());
    
    res.json({
      success: true,
      message: 'Password reset successful',
      data: { token }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth
// @route   GET /api/v1/auth/google
// @access  Public
export const googleAuth = (req: Request, res: Response) => {
  // OAuth flow handled by Passport - redirect to Google
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    state: req.query.redirectUrl || '/dashboard'
  });
  
  res.redirect(authUrl);
};

// @desc    Google OAuth Callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
export const googleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const { tokens } = await client.getToken(code as string);
    client.setCredentials(tokens);
    
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    
    // Find or create user
    let user = await User.findOne({ googleId: payload.sub });
    
    if (!user) {
      user = await User.findOne({ email: payload.email?.toLowerCase() });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = payload.sub;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          username: payload.name?.replace(/\s/g, '').toLowerCase() || `user_${Date.now()}`,
          email: payload.email?.toLowerCase(),
          fullName: payload.name,
          googleId: payload.sub,
          isVerified: true,
          role: 'viewer'
        });
      }
    }
    
    const token = generateToken(user._id.toString());
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

// @desc    GitHub OAuth
// @route   GET /api/v1/auth/github
// @access  Public
export const githubAuth = (req: Request, res: Response) => {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.BACKEND_URL}/api/v1/auth/github/callback`;
  const scope = 'user:email';
  
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}`);
};

// @desc    GitHub OAuth Callback
// @route   GET /api/v1/auth/github/callback
// @access  Public
export const githubCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    // Get user email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    const emails = await emailResponse.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
    
    if (!primaryEmail) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
    }
    
    // Find or create user
    let user = await User.findOne({ githubId: userData.id.toString() });
    
    if (!user) {
      user = await User.findOne({ email: primaryEmail.toLowerCase() });
      
      if (user) {
        user.githubId = userData.id.toString();
        await user.save();
      } else {
        user = await User.create({
          username: userData.login,
          email: primaryEmail.toLowerCase(),
          fullName: userData.name || userData.login,
          githubId: userData.id.toString(),
          profilePicture: userData.avatar_url,
          isVerified: true,
          role: 'viewer'
        });
      }
    }
    
    const token = generateToken(user._id.toString());
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

export default {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  logout
};

