import express from 'express';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth';
import User from '../models/User';
import { register, login } from '../controllers/authController';
import passport from 'passport';

const router = express.Router();

// Existing routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
  try {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/login');
  }
});

// Protected route example
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

export default router;