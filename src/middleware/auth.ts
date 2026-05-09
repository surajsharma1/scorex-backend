import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export type AuthRequest = Request & { user?: any };

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (req.user.isBanned && req.user.isBanned()) {
      const until = req.user.banned?.until;
      const reason = req.user.banned?.reason || 'No reason provided';
      const untilStr = until ? new Date(until).toISOString().split('T')[0] : 'indefinitely';
      return res.status(403).json({
        success: false,
        message: `Account suspended until ${untilStr}. Reason: ${reason}`,
      });
    }

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

export const isAdminOrOrganizer = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'organizer') {
    return res.status(403).json({ success: false, message: 'Organizer or admin access required' });
  }
  next();
};
