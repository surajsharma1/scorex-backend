import { Request, Response } from 'express';
import Match from '../models/Match';
import Tournament from '../models/Tournament';
import { io } from '../server';

export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournament } = req.query;
    const matches = await Match.find(tournament ? { tournament } : {}).populate('team1 team2');
    // Return in format expected by frontend: { matches: [...] }
    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// scorex-backend/src/controllers/matchController.ts

export const getLiveMatches = async (req: Request, res: Response) => {
  try {
    // Include 'live', 'ongoing', and 'scheduled' statuses
    const matches = await Match.find({ status: { $in: ['live', 'ongoing', 'scheduled'] } })
      .populate('team1 team2') // Fixed: Changed from teamA teamB to team1 team2
      .sort({ updatedAt: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching live matches', error });
  }
};

export const getMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1 team2')
      .populate('tournament');
    
    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }
    
    const team1 = match.team1 as any;
    const team2 = match.team2 as any;
    const tournament = match.tournament as any;
    
    const overs2 = match.overs2 || 0;
    const score2 = match.score2 || 0;
    const score1 = match.score1 || 0;
    const currentRunRate = overs2 > 0 ? (score2 / overs2).toFixed(2) : '0.00';
    const target = score1 + 1;
    const remainingRuns = target - score2;
    const remainingOvers = 20 - overs2;
    const requiredRunRate = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '0.00';
    
    res.json({
      _id: match._id,
      tournament: {
        _id: tournament?._id,
        name: tournament?.name || 'Tournament'
      },
      team1: {
        _id: team1?._id,
        name: team1?.name || 'Team 1',
        shortName: team1?.shortName || 'T1',
        players: team1?.players || []
      },
      team2: {
        _id: team2?._id,
        name: team2?.name || 'Team 2',
        shortName: team2?.shortName || 'T2',
        players: team2?.players || []
      },
      score1: match.score1 || 0,
      score2: match.score2 || 0,
      wickets1: match.wickets1 || 0,
      wickets2: match.wickets2 || 0,
      overs1: match.overs1 || 0,
      overs2: match.overs2 || 0,
      
      // Striker/Non-striker data
      striker_name: match.strikerName || '',
      striker_runs: match.strikerRuns || 0,
      striker_balls: match.strikerBalls || 0,
      nonstriker_name: match.nonStrikerName || '',
      nonstriker_runs: match.nonStrikerRuns || 0,
      nonstriker_balls: match.nonStrikerBalls || 0,
      
      // Bowler data
      bowler_name: match.bowlerName || '',
      bowler_overs: match.bowlerOvers || 0,
      bowler_maidens: match.bowlerMaidens || 0,
      bowler_runs: match.bowlerRuns || 0,
      bowler_wickets: match.bowlerWickets || 0,
      
      // Points system
      team1_points: match.team1Points || 0,
      team2_points: match.team2Points || 0,
      
      // Stats
      crr: currentRunRate,
      rrr: requiredRunRate,
      target: target.toString(),
      last5Overs: match.lastFiveOvers || '-',
      
      status: match.status,
      date: match.date,
      venue: match.venue
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMatch = async (req: Request, res: Response): Promise<void> => {
  console.log('Create match request body:', req.body);
  try {
    const { tournament, team1, team2, date, venue } = req.body;

    if (!tournament || !team1 || !team2 || !date) {
      res.status(400).json({ message: 'Missing required fields: tournament, team1, team2, date' });
      return;
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(tournament) || !mongoose.Types.ObjectId.isValid(team1) || !mongoose.Types.ObjectId.isValid(team2)) {
      res.status(400).json({ message: 'Invalid ObjectId for tournament, team1, or team2' });
      return;
    }

    const authReq = req as any;
    if (!authReq.user || !authReq.user._id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Filter out empty strings for optional ObjectId fields to prevent CastError
    const { tossWinner, tossChoice, ...restBody } = req.body;
    
    // Validate tossWinner: must be a non-empty string AND a valid ObjectId (24 hex chars)
    const isValidObjectId = (value: any): boolean => {
      if (typeof value !== 'string' || value.length === 0) return false;
      return mongoose.Types.ObjectId.isValid(value) && value.length === 24 && /^[a-fA-F0-9]+$/.test(value);
    };
    
    // Validate tossChoice: must be a non-empty string and one of the valid enum values
    const isValidTossChoice = (value: any): boolean => {
      return typeof value === 'string' && value.length > 0 && ['bat', 'bowl'].includes(value);
    };
    
    const matchData = {
      ...restBody,
      createdBy: authReq.user._id,
      // Only include tossWinner if it's a valid non-empty ObjectId
      ...(isValidObjectId(tossWinner) && { tossWinner }),
      // Only include tossChoice if it's a valid enum value
      ...(isValidTossChoice(tossChoice) && { tossChoice }),
    };
    
    const match = await Match.create(matchData);
    console.log('Match created successfully:', match);
    res.status(201).json(match);
  } catch (error) {
    console.error('Create match error:');
    const err = error as Error;
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

export const updateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (match) {
      io.emit('scoreUpdate', { matchId: match._id, match });
    }
    res.json(match);
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMatchScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('team1 team2');
    if (match) {
      io.emit('scoreUpdate', { matchId: match._id, match });

      const liveScores = {
        team1: {
          name: (match.team1 as any).name || 'Team 1',
          score: match.score1 || 0,
          wickets: match.wickets1 || 0,
          overs: match.overs1 || 0,
        },
        team2: {
          name: (match.team2 as any).name || 'Team 2',
          score: match.score2 || 0,
          wickets: match.wickets2 || 0,
          overs: match.overs2 || 0,
        },
        currentRunRate: 0,
        requiredRunRate: 0,
        target: 0,
        lastFiveOvers: '-',
      };

      await Tournament.findByIdAndUpdate(match.tournament, { liveScores });
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

export const addCommentary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentary } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { $push: { commentary } },
      { new: true }
    ).populate('team1 team2');

    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }

    io.emit('commentaryUpdate', { matchId: match._id, commentary: match.commentary });

    res.json(match);
  } catch (error) {
    console.error('Add commentary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCommentary = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await Match.findById(req.params.id).select('commentary');
    if (!match) {
      res.status(404).json({ message: 'Match not found' });
      return;
    }
    res.json({ commentary: match.commentary });
  } catch (error) {
    console.error('Get commentary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
