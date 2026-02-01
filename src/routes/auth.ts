import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import bcrypt from 'bcryptjs';

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
    const { username, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ username, email, password, role: 'viewer' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Email login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
  try {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/');
  }
});

// Protected route example
router.get('/me', protectAuth as any, async (req, res) => {
  res.json((req as any).user);
});

export default router;  