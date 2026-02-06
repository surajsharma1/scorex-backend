import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';


export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {    
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

export const protectAdmin = [protect, authorize('admin')]; // For admins

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const userRole = req.user.role;
    const permissions: { [key: string]: string[] } = {
      'viewer': ['read:tournaments', 'read:teams', 'read:matches'],
      'organizer': ['read:tournaments', 'read:teams', 'read:matches', 'create:tournaments', 'create:teams', 'create:matches', 'update:own_tournaments', 'update:own_teams'],
      'admin': ['read:tournaments', 'read:teams', 'read:matches', 'create:tournaments', 'create:teams', 'create:matches', 'update:tournaments', 'update:teams', 'update:matches', 'delete:tournaments', 'delete:teams', 'delete:matches', 'manage:users']
    };

    if (!permissions[userRole]?.includes(permission)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
