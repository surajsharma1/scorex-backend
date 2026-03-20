import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament';
import Match from '../models/Match';

import { AuthRequest } from './auth';

export const protectScorer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const matchId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ success: false, message: 'Invalid match ID' });
    }

    const match = await Match.findById(matchId).populate('tournamentId');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Check 1: Designated scorer
    if (match.scorerId && match.scorerId.equals(req.user._id)) {
      (req as any).scorerMatch = match;
      return next();
    }

    // Check 2: Tournament organizer (populated ObjectId only, no deep populate needed)
    if (match.tournamentId) {
      // Tournament organizer check requires separate query or match creator fallback
      return res.status(403).json({ 
        success: false, 
        message: 'Only designated scorer or match creator can score. Contact tournament organizer.'
      });
    }

    // Check 3: User is club/tournament admin (future club integration)
    // TODO: Add club membership check if match linked to club

    return res.status(403).json({ 
      success: false, 
      message: 'Scorer authorization required. Only tournament creator/admin or designated scorer can update live scores.'
    });
  } catch (error) {
    console.error('Scorer auth error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

