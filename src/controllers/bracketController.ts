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

export const generateBracket = async (req: Request, res: Response) => {
  try {
    const { teams, type } = req.body;
    // Bracket generation logic here (simplified)
    const bracket = await Bracket.findByIdAndUpdate(
      req.params.id,
      { rounds: [] }, // Add generated rounds
      { new: true }
    );
    res.json(bracket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};