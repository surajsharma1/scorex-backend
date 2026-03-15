import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = Router();

router.get('/google/success', async (req: Request, res: Response) => {
  // Use session user from passport - populate full user
  if (!req.user || ! (req.user as any)._id) {
    console.error('[OAuth Success] No user:', req.user);
    return res.redirect('/login?error=no-user');
  }

  const userId = (req.user as any)._id;
  const user = await User.findById(userId).populate('membership');
  if (!user) {
    console.error('[OAuth Success] User not found:', userId);
    return res.redirect('/login?error=user-missing');
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
  // Frontend redirect with token hash
  const frontendUrl = process.env.FRONTEND_URL || req.query.state as string || 'http://localhost:5173';
  const fragment = `token=${token}&user=${encodeURIComponent(JSON.stringify(user.toObject()))}`;
  const redirectUrl = `${frontendUrl}/oauth/callback#${fragment}`;
  
  console.log('[OAuth Success] Redirect:', redirectUrl);
  
  res.redirect(redirectUrl);
});

export default router;
