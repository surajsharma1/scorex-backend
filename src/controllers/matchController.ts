import { Request, Response } from 'express';
import Match from '../models/Match';
import { io } from '../server';
import Notification from '../models/Notification';


interface AuthRequest extends Request {
  user?: any;
}

export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.tournament ? { tournament: req.query.tournament } : {};
    const matches = await Match.find(query)
      .populate('tournament', 'name')
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name');
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await Match.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMatchScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { score1, score2, wickets1, wickets2, overs1, overs2, status, winner } = req.body;
    const updateData: any = {};
    if (score1 !== undefined) updateData.score1 = score1;
    if (score2 !== undefined) updateData.score2 = score2;
    if (wickets1 !== undefined) updateData.wickets1 = wickets1;
    if (wickets2 !== undefined) updateData.wickets2 = wickets2;
    if (overs1 !== undefined) updateData.overs1 = overs1;
    if (overs2 !== undefined) updateData.overs2 = overs2;
    if (status) updateData.status = status;
    if (winner) updateData.winner = winner;

    const match = await Match.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name');
    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }
    // Emit real-time update
    io.emit('scoreUpdate', { matchId: match._id, match });
    // Create notification (ensure teams are populated)
    const populatedMatch = await Match.findById(match._id).populate('team1', 'name').populate('team2', 'name');
    if (populatedMatch && req.user) {
      await Notification.create({
        user: req.user._id,
        message: `Score updated for match: ${(populatedMatch.team1 as any).name} vs ${(populatedMatch.team2 as any).name}`,
        type: 'info',
      });
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};