import { Request, Response } from 'express';
import Tournament from '../models/Tournament';

export const getTournaments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournaments = await Tournament.find().populate('createdBy', 'username');
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('createdBy', 'username');
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
interface AuthRequest extends Request {
  user?: any;
}
export const createTournament = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json({ message: 'Tournament deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const goLive = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, { isLive: true }, { new: true });
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLiveScores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scores } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, { liveScores: scores }, { new: true });
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};