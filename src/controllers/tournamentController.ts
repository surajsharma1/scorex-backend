import { Request, Response } from 'express';
import Tournament from '../models/Tournament';
import Match from '../models/Match';

// Public endpoint for Ticker/Carousel
export const getTournaments = async (req: Request, res: Response) => {
  try {
    // 1. Get recent tournaments
    const tournaments = await Tournament.find({ deleted: false })
      .sort({ startDate: -1 })
      .limit(10)
      .lean(); // Convert to plain JS objects for modification

    // 2. Enhance with live match data if needed (Optional but "creative")
    // This is a simple implementation to get "current runs"
    const enhancedTournaments = await Promise.all(tournaments.map(async (t: any) => {
      if (t.status === 'ongoing') {
        // Find the latest ongoing match for this tournament
        const activeMatch = await Match.findOne({ 
          tournament: t._id, 
          status: 'ongoing' 
        }).select('score1 wickets1 score2 wickets2 battingTeam').sort({ updatedAt: -1 });
        
        if (activeMatch) {
          t.activeMatch = activeMatch;
        }
      }
      return t;
    }));

    // Return in format expected by frontend: { tournaments: [...] }
    res.status(200).json({ tournaments: enhancedTournaments });
  } catch (error: any) {
    console.error('Fetch tournaments error:', error);
    res.status(500).json({ message: 'Failed to fetch tournaments' });
  }
};

export const getTournament = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error: any) {
    console.error('Fetch tournament error:', error);
    res.status(500).json({ message: 'Failed to fetch tournament' });
  }
};

export const createTournament = async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, format, teams } = req.body;
    // Ensure user is attached by auth middleware
    const organizer = (req as any).user ? (req as any).user._id : null; 
    
    const newTournament = await Tournament.create({
      name, startDate, endDate, format, teams, organizer, status: 'upcoming'
    });
    res.status(201).json(newTournament);
  } catch(e: any) {
    res.status(500).json({message: e.message});
  }
};

export const updateTournament = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const tournament = await Tournament.findByIdAndUpdate(id, updates, { new: true });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error: any) {
    console.error('Update tournament error:', error);
    res.status(500).json({ message: 'Failed to update tournament' });
  }
};

export const deleteTournament = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findByIdAndUpdate(id, { deleted: true }, { new: true });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json({ message: 'Tournament deleted successfully' });
  } catch (error: any) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ message: 'Failed to delete tournament' });
  }
};

export const goLive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findByIdAndUpdate(id, { status: 'ongoing' }, { new: true });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error: any) {
    console.error('Go live error:', error);
    res.status(500).json({ message: 'Failed to start tournament' });
  }
};

export const updateLiveScores = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scores } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(id, { liveScores: scores }, { new: true });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error: any) {
    console.error('Update live scores error:', error);
    res.status(500).json({ message: 'Failed to update live scores' });
  }
};
