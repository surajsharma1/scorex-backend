import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export const register = [
  validateRequest(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Register attempt:', req.body);
      const { username, email, password } = req.body;
      const userExists = await User.findOne({ email });
      if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
      }
      const user = await User.create({ username, email, password, role: 'viewer' });
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      res.status(201).json({ token });
    } catch (error: any) {
      console.error('Register error:', error.message, error.stack);
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
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
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
