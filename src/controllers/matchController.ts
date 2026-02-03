import { Request, Response } from 'express';
import Match from '../models/Match';
import { io } from '../server'; // Fixed: Import io from server.ts

export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournament } = req.query;
    const matches = await Match.find(tournament ? { tournament } : {}).populate('team1 team2');
    res.json(matches);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMatch = async (req: Request, res: Response): Promise<void> => {
  console.log('Create match request body:', req.body); // Add logging
  try {
    const { tournament, team1, team2, date, venue } = req.body;

    // Validation: Check required fields
    if (!tournament || !team1 || !team2 || !date) {
      res.status(400).json({ message: 'Missing required fields: tournament, team1, team2, date' });
      return;
    }

    // Optional: Validate ObjectIds (if using mongoose)
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(tournament) || !mongoose.Types.ObjectId.isValid(team1) || !mongoose.Types.ObjectId.isValid(team2)) {
      res.status(400).json({ message: 'Invalid ObjectId for tournament, team1, or team2' });
      return;
    }

    // Cast req to access user (assuming auth middleware sets req.user)
    const authReq = req as any; // Cast to any to access user
    if (!authReq.user || !authReq.user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Create the match with createdBy from authenticated user
    const matchData = { ...req.body, createdBy: authReq.user._id };
    const match = await Match.create(matchData);
    console.log('Match created successfully:', match); // Add logging
    res.status(201).json(match);
  } catch (error) {
    console.error('Create match error:', error); // Log the full error
    const err = error as Error; // Cast to Error
    res.status(500).json({ message: 'Server error', details: err.message }); // Include error details for debugging
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
    console.error('Update match error:', error);
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
    console.error('Update match score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Match deleted' });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};