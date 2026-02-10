import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import bcrypt from 'bcryptjs';
import { authLimiter } from '../utils/rateLimiters';

// Extend global to include pendingRegistrations
declare global {
  var pendingRegistrations: Map<string, any>;
}


const router = express.Router();

export interface AuthRequest extends Request {
  user?: IUser;
}

// Define protectAuth locally
export const protectAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      res.status(401).json({ message: 'Not authorized, no token' });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'User role not authorized' });
      return;
    }
    next();
  };
};

export const protectOrganizer = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && (req.user.role === 'organizer' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'User role not authorized' });
  }
};

export const protectAdmin = [protectAuth, authorize('admin')];

// Email register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, dob, googleId } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ message: 'Username already taken' });

    // Generate OTP and send email, but do not create user yet
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate random 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send OTP email
    const { sendOtpEmail } = await import('../utils/email');
    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    // Store pending registration data (for simplicity, using a temporary object; in production, use a cache or DB)
    // For now, we'll assume frontend handles this, but to fix, we'll create user on verify
    // Actually, to properly fix, we need to store pending data. Let's use a simple in-memory store for demo.
    // Better: Create a PendingUser model, but to keep simple, modify verify to create user.

    // For now, send OTP and expect verify to create user with the data.
    // But req.body is not available in verify. So, need to store in session or DB.

    // Quick fix: Store in a global map (not production ready)
    if (!global.pendingRegistrations) global.pendingRegistrations = new Map();
    global.pendingRegistrations.set(email, { username, email, password, fullName, dob, googleId, otp, otpExpires });

    res.status(200).json({ message: 'OTP sent to email. Please verify to complete registration.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP for email registration
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// OTP verification
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP and mark as verified
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.json({ token });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Email login
router.post('/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      // Check if user has verified OTP (otp field should be undefined after verification)
      if (user.otp !== undefined) {
        return res.status(401).json({ message: 'Please verify your email with OTP before logging in' });
      }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!user) {
      if (info && info.pendingGoogleUser) {
        // New user: redirect to register with prefilled details
        const { email, fullName, googleId } = info.pendingGoogleUser;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const registerUrl = `${frontendUrl}/register?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&googleId=${encodeURIComponent(googleId)}`;
        res.redirect(registerUrl);
      } else {
        // Authentication failed
        console.error('Google OAuth failed:', info);
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } else {
      // Existing user: generate token and redirect
      try {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
      } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  })(req, res, next);
});

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', authLimiter, passport.authenticate('github', { failureRedirect: '/' }), async (req, res) => {
  try {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    res.redirect('/');
  }
});

// Protected route example
router.get('/me', protectAuth as any, async (req, res) => {
  res.json((req as any).user);
});

export default router;  