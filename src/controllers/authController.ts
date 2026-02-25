import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { validateRequest, registerSchema, loginSchema } from '../utils/validation';
import auditLogger from '../utils/auditLogger';
import sendEmail from '../utils/emailService'; 

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

// --- REGISTER (Step 1: Send OTP) ---
export const register = [
  validateRequest(registerSchema), // Keep your validation
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;
      
      console.log('Register attempt:', { email, username });

      // Check if user exists
      const existingUser = await User.findOne({ email });
      
      // If user exists AND is verified, stop. 
      // If they exist but are NOT verified, we can overwrite/resend OTP (optional logic)
      if (existingUser && existingUser.isVerified) {
        auditLogger.logSystemAction('USER_REGISTRATION_FAILED', 'User', undefined, { reason: 'Email already exists', email });
        res.status(400).json({ message: "Email already exists" });
        return;
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

      // If unverified user exists, update them. Else create new.
      if (existingUser && !existingUser.isVerified) {
        existingUser.username = username;
        existingUser.password = password; // Will be hashed by pre-save hook in User model
        existingUser.otp = otp;
        existingUser.otpExpires = otpExpires;
        await existingUser.save();
      } else {
        await User.create({
          username,
          email,
          password,
          role: 'viewer', // Default role
          membershipLevel: 0, // Default free
          otp,
          otpExpires,
          isVerified: false
        });
      }

      // Send OTP Email
      const message = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Welcome to ScoreX!</h1>
          <p>Your verification code is:</p>
          <h2 style="color: #16a34a; letter-spacing: 5px;">${otp}</h2>
          <p>This code expires in 10 minutes.</p>
        </div>
      `;

      try {
        await sendEmail({
          email,
          subject: 'Your ScoreX Verification Code',
          message
        });
        
        auditLogger.logSystemAction('OTP_SENT', 'User', undefined, { email });
        res.status(200).json({ message: "OTP sent to email. Please verify to complete registration." });
      } catch (emailError: any) {
        console.error("Email send failed:", emailError);
        // We still return 200 or 500 depending on if you want to block registration on email fail
        res.status(500).json({ message: "Failed to send OTP email. Please try again." });
      }

    } catch (error: any) {
      console.error('Register error:', error);
      res.status(500).json({ message: error.message });
    }
  }
];

// --- VERIFY OTP (Step 2: Activate User) ---
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    
    // Find user with matching Email, OTP, and check if OTP has not expired
    const user = await User.findOne({ 
      email, 
      otp, 
      otpExpires: { $gt: new Date() } 
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired OTP" });
      return;
    }

    // Activate User
    user.isVerified = true;
    user.otp = undefined;       // Clear OTP
    user.otpExpires = undefined; 
    await user.save();

    // Generate Token
    const token = signToken(user);

    auditLogger.logUserAction(
      user._id.toString(),
      'USER_VERIFIED',
      'User',
      user._id.toString(),
      { email },
      req.ip || '',
      req.get('User-Agent') || ''
    );

    res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

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

      // Check Verification Status
      if (user.isVerified === false) {
         res.status(403).json({ message: 'Email not verified. Please register again to get a new OTP.' });
         return;
      }

      // Check Membership Expiry
      if (user.membershipLevel !== 0 && user.membershipExpiresAt) {
        const expiryDate = new Date(user.membershipExpiresAt);
        if (expiryDate < new Date()) {
          // Membership has expired, reset to free
          user.membershipLevel = 0;
          user.membershipExpiresAt = undefined;
          await user.save();
        }
      }

      const token = signToken(user);

      // Audit Log
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

import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
       // Create new user from Google Data
       user = await User.create({
         username: payload.name || payload.email.split('@')[0],
         email: payload.email,
         password: crypto.randomBytes(16).toString('hex'), // Random password
         isVerified: true, // Auto-verify Google users
         role: 'viewer',
         membershipLevel: 0
       });
    }

    const jwtToken = signToken(user);
    res.json({ token: jwtToken, user });

  } catch (err: any) {
    res.status(500).json({ message: "Google Login Failed" });
  }
};
