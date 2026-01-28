import { Request, Response } from 'express';
import Match from '../models/Match';
import { io } from '../server'; // Fixed: Import io from server.ts

export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournament } = req.query;
    const matches = await Match.find(tournament ? { tournament } : {}).populate('team1 team2');
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.create(req.body);
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (match) {
      io.emit('scoreUpdate', { matchId: match._id, match }); // Emit real-time update
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMatchScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (match) {
      io.emit('scoreUpdate', { matchId: match._id, match }); // Emit real-time update
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};