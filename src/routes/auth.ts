import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import bcrypt from 'bcryptjs';
import { authLimiter } from '../utils/rateLimiters';
import auditLogger from '../utils/auditLogger';
import { validateRequest, registerSchema } from '../utils/validation';
import { sendOtpEmail } from '../utils/email';




const router = express.Router();

// Helper function to generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { username, email, password, fullName, dob, googleId } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      console.log('Missing required fields:', { username: !!username, email: !!email, password: !!password });
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Additional server-side checks
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists with email:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      console.log('Username already taken:', username);
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Check for common weak passwords (additional security layer)
    const weakPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({ message: 'Password is too weak. Please choose a stronger password.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create the user with OTP (user needs to verify before being fully active)
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      dob,
      googleId,
      otp,
      otpExpires,
      role: 'viewer'
    });

    console.log('User created successfully:', user._id);

    // Send OTP via email
    try {
      await sendOtpEmail(email, otp);
      console.log('OTP sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Continue with registration even if email fails - user can request resend
    }

    // Audit log successful registration attempt
    auditLogger.logUserAction(
      user._id.toString(),
      'USER_REGISTERED_PENDING_VERIFICATION',
      'User',
      user._id.toString(),
      { username, email },
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({ 
      message: 'Registration successful. Please verify your email with the OTP sent to your email address.',
      email: email
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already verified (no OTP field means verified)
    if (!user.otp) {
      // Already verified, just generate token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      return res.json({ token, message: 'Email already verified' });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP has expired
    if (user.otpExpires && user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Clear OTP and mark as verified
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

    // Audit log successful verification
    auditLogger.logUserAction(
      user._id.toString(),
      'USER_VERIFIED',
      'User',
      user._id.toString(),
      { username: user.username, email },
      req.ip,
      req.get('User-Agent')
    );

    res.json({ token, message: 'Email verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already verified
    if (!user.otp) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via email
    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
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
