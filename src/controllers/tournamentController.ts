import { Request, Response } from 'express';
import Tournament from '../models/Tournament';

export const createTournament = async (req: Request, res: Response) => {
  try {
    const tournamentData = {
      ...req.body,
      createdBy: req.user?._id,
    };

    const tournament = await Tournament.create(tournamentData);
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Tournament creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTournaments = async (req: Request, res: Response) => {
  try {
    const tournaments = await Tournament.find({ createdBy: req.user?._id })
      .sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTournament = async (req: Request, res: Response) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTournament = async (req: Request, res: Response) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTournament = async (req: Request, res: Response) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json({ message: 'Tournament deleted' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const goLive = async (req: Request, res: Response) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    tournament.isLive = !tournament.isLive;
    tournament.status = tournament.isLive ? 'active' : 'upcoming';
    await tournament.save();

    res.json(tournament);
  } catch (error) {
    console.error('Go live error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLiveScores = async (req: Request, res: Response) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    tournament.liveScores = {
      ...tournament.liveScores,
      ...req.body,
    };
    await tournament.save();

    res.json(tournament);
  } catch (error) {
    console.error('Update live scores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};