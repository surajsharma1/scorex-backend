import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { validateRequest, registerSchema, loginSchema } from '../utils/validation';
import auditLogger from '../utils/auditLogger';

export const register = [
  validateRequest(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Register attempt:', req.body);
      const { username, email, password } = req.body;
      const userExists = await User.findOne({ email });
      if (userExists) {
        auditLogger.logSystemAction('USER_REGISTRATION_FAILED', 'User', undefined, { reason: 'Email already exists', email });
        res.status(400).json({ message: 'User already exists' });
        return;
      }
      const user = await User.create({ username, email, password, role: 'viewer' });
      const token = jwt.sign(
        { 
          id: user._id, 
          role: user.role, 
          membership: user.membership,
          membershipExpiresAt: null
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      // Audit log successful registration
      auditLogger.logUserAction(
        user._id.toString(),
        'USER_REGISTERED',
        'User',
        user._id.toString(),
        { username, email },
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({ token });
    } catch (error: any) {
      console.error('Register error:', error.message, error.stack);
      auditLogger.logSystemAction('USER_REGISTRATION_ERROR', 'User', undefined, { error: error.message, email: req.body.email });
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

export const login = [
  validateRequest(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Login attempt for email:', req.body.email);
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (user && user.password && (await bcrypt.compare(password, user.password))) {
        // Check if membership has expired
        let membership = user.membership;
        let membershipExpiresAt = user.membershipExpiry;
        
        if (membership !== 'free' && membershipExpiresAt) {
          const expiryDate = new Date(membershipExpiresAt);
          if (expiryDate < new Date()) {
            // Membership has expired, reset to free
            membership = 'free';
            membershipExpiresAt = undefined;
            await User.findByIdAndUpdate(user._id, {
              membership: 'free',
              membershipExpiry: null
            });
          }
        }
        
        const token = jwt.sign(
          { 
            id: user._id, 
            role: user.role, 
            membership: membership,
            membershipExpiresAt: membershipExpiresAt ? membershipExpiresAt.toISOString() : null
          },
          process.env.JWT_SECRET!,
          { expiresIn: '30d' }
        );
        res.json({ token });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error: any) {
      console.error('Login error:', error.message, error.stack);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];
