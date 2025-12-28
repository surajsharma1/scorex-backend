import { Request, Response } from 'express';
import Bracket from '../models/Bracket';
import Tournament from '../models/Tournament';

export const getBrackets = async (req: Request, res: Response) => {
  try {
    const brackets = await Bracket.find().populate('tournament');
    res.json(brackets);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBracket = async (req: Request, res: Response) => {
  try {
    const bracket = await Bracket.findById(req.params.id).populate('tournament');
    if (!bracket) {
      return res.status(404).json({ message: 'Bracket not found' });
    }
    res.json(bracket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBracket = async (req: Request, res: Response) => {
  try {
    const bracket = await Bracket.create(req.body);
    await Tournament.findByIdAndUpdate(req.body.tournament, { bracket: bracket._id });
    res.status(201).json(bracket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBracket = async (req: Request, res: Response) => {
  try {
    const bracket = await Bracket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bracket) {
      return res.status(404).json({ message: 'Bracket not found' });
    }
    res.json(bracket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Fixed: Added error handling in generateBracket
export const generateBracket = async (req: Request, res: Response) => {
  try {
    const { teams } = req.body;
    if (!teams || teams.length === 0) {
      return res.status(400).json({ message: 'Teams are required' });
    }

    // Your existing logic...
    const bracket = await Bracket.findById(req.params.id);
    if (!bracket) {
      return res.status(404).json({ message: 'Bracket not found' });
    }

    // Generate rounds (simplified)
    const rounds = [];
    // ... (rest of your code)

    bracket.rounds = rounds;
    await bracket.save();
    res.json(bracket);
  } catch (error) {
    console.error('Bracket generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};