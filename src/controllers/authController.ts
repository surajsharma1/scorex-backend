import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import { validateRequest, registerSchema, loginSchema } from '../utils/validation';
import auditLogger from '../utils/auditLogger';

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to convert membershipLevel to string for token
const getMembershipString = (level: number): string => {
  switch (level) {
    case 1: return 'basic';
    case 2: return 'premium';
    default: return 'free';
  }
};

// Helper to generate JWT Token
const signToken = (user: any) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role, 
      membership: getMembershipString(user.membershipLevel || 0),
      membershipExpiresAt: user.membershipExpiresAt ? user.membershipExpiresAt.toISOString() : null
    },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
};

// --- REGISTER (No OTP - instant registration) ---
export const register = [
  validateRequest(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;
      
      console.log('Register attempt:', { email, username });

      // Check if user exists
      const existingUser = await User.findOne({ email });
      
      // If user exists, stop. 
      if (existingUser) {
        auditLogger.logSystemAction('USER_REGISTRATION_FAILED', 'User', undefined, { reason: 'Email already exists', email });
        res.status(400).json({ message: "Email already exists" });
        return;
      }

      // Create new user - no OTP verification needed
      const newUser = await User.create({
        username,
        email,
        password,
        role: 'viewer',
        membershipLevel: 0,
        isVerified: true // Auto-verify - no OTP
      });

      // Generate token directly
      const token = signToken(newUser);

      auditLogger.logSystemAction('USER_REGISTERED', 'User', newUser._id, { email, username });

      // Return success with token
      res.status(200).json({ 
        message: "Registration successful!",
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          membership: 'free'
        }
      });

    } catch (error: any) {
      console.error('Register error:', error);
      res.status(500).json({ message: error.message });
    }
  }
];

// --- LOGIN ---
export const login = [
  validateRequest(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Login attempt for email:', req.body.email);
      const { email, password } = req.body;
      
      // Explicitly select password if your model has select: false
      const user = await User.findOne({ email }).select('+password');
      
      if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      // Check Verification Status (now always true since we auto-verify)
      if (user.isVerified === false) {
         res.status(403).json({ message: 'Email not verified. Please register again.' });
         return;
      }

      // Check Membership Expiry
      if (user.membershipLevel !== 0 && user.membershipExpiresAt) {
        const expiryDate = new Date(user.membershipExpiresAt);
        if (expiryDate < new Date()) {
          user.membershipLevel = 0;
          user.membershipExpiresAt = undefined;
          await user.save();
        }
      }

      const token = signToken(user);

      auditLogger.logUserAction(
        user._id.toString(),
        'USER_LOGIN',
        'User',
        user._id.toString(),
        {}, 
        req.ip || '',
        req.get('User-Agent') || ''
      );

      res.json({ 
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          membership: getMembershipString(user.membershipLevel || 0)
        }
      });

    } catch (error: any) {
      console.error('Login error:', error.message, error.stack);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if(!payload || !payload.email) {
       res.status(400).json({ message: "Invalid Google Token" });
       return;
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
       user = await User.create({
         username: payload.name || payload.email.split('@')[0],
         email: payload.email,
         password: crypto.randomBytes(16).toString('hex'),
         isVerified: true,
         role: 'viewer',
         membershipLevel: 0
       });
    }

    const jwtToken = signToken(user);
    res.json({ token: jwtToken, user });

  } catch (err: any) {
    console.error('Google login error:', err);
    res.status(500).json({ message: "Google Login Failed" });
  }
};
