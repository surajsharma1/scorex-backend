import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export interface AuthRequest extends Request { 
  user?: any; 
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
// Removed verbose /clubs/my logging to reduce spam
  
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    console.log('🔐 AUTH: No token found');
    return res.status(401).json({ 
      success: false, 
      message: 'No token, authorization denied' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    // console.log('🔐 AUTH: Token decoded for user ID:', decoded.id); // Disabled verbose logging
    
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.log('🔐 AUTH: User not found for ID:', decoded.id);
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // console.log('🔐 AUTH: User loaded:', req.user.email, 'Role:', req.user.role); // Disabled verbose logging

    // Check ban status
    if (req.user.isBanned()) {
      const until = req.user.banned!.until;
      const reason = req.user.banned!.reason || 'No reason provided';
      return res.status(403).json({
        success: false,
        message: `Account banned until ${until.toISOString().split('T')[0]}. Reason: ${reason}`
      });
    }

    next();
  } catch (error) {
    console.log('🔐 AUTH: Token verification failed:', error.message);
    res.status(401).json({ 
      success: false, 
      message: 'Token invalid' 
    });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

