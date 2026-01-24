import { Request, Response } from 'express';
import Bracket from '../models/Bracket';
import Tournament from '../models/Tournament';

export const getBrackets = async (req: Request, res: Response): Promise<void> => {
  try {
    const brackets = await Bracket.find({ createdBy: req.user?._id })
      .populate('tournament');
    res.json(brackets);
  } catch (error) {
    console.error('Get brackets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json(bracket);
  } catch (error) {
    console.error('Create bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const generateBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId, teams } = req.body;
    const bracket = await Bracket.findByIdAndUpdate(
      req.params.id,
      { 
        tournament: tournamentId,
        teams: teams,
        status: 'generated'
      },
      { new: true }
    );
    if (!bracket) {
      res.status(404).json({ message: 'Bracket not found' });
      return;
    }
    res.json(bracket);
  } catch (error) {
    console.error('Generate bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bracket) {
      res.status(404).json({ message: 'Bracket not found' });
      return;
    }
    res.json(bracket);
  } catch (error) {
    console.error('Update bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findByIdAndDelete(req.params.id);
    if (!bracket) {
      res.status(404).json({ message: 'Bracket not found' });
      return;
    }
    res.json({ message: 'Bracket deleted' });
  } catch (error) {
    console.error('Delete bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};