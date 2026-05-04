import express from 'express';
import passport from 'passport';
import { protect } from '../middleware/auth';
import * as ac from '../controllers/authController';
const router = express.Router();
router.post('/register', ac.register);
router.post('/login', ac.login);
router.post('/logout', ac.logout);
router.post('/forgot-password', ac.forgotPassword);
router.post('/reset-password/:token', ac.resetPassword);
router.post('/complete-google-profile', ac.completeGoogleProfile);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user && info?.needsProfile) {
      // New Google user — redirect to complete-profile page
      const frontendUrl = (process.env.FRONTEND_URL || 'https://scorex-live.vercel.app').replace(/\/$/, '');
      return res.redirect(
        `${frontendUrl}/complete-profile?tempToken=${info.tempToken}&email=${encodeURIComponent(info.email || '')}&name=${encodeURIComponent(info.name || '')}`
      );
    }
    (req as any).user = user || null;
    next();
  })(req, res, next);
}, ac.googleCallback);
router.get('/me', protect, ac.getMe);
router.put('/change-password', protect, ac.changePassword);
export default router;
