import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }
    const user = await User.create({ username, email, password });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id.toString()),  // Fixed: Convert ObjectId to string
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Login attempt:', req.body);  // Debug
    const user = await User.findOne({ email: req.body.email });
    console.log('User found:', !!user);  // Debug
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id.toString()),
      });
    } else {
      console.log('Invalid credentials');  // Debug
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);  // Debug
    res.status(500).json({ message: 'Server error' });
  }
};