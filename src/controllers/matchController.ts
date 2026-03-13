/**
 * Match Controller
 * Complete cricket match and scoring system
 * Following PROJECT_ALGORITHM.md specifications
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Match from '../models/Match';
import Team from '../models/Team';
import Player from '../models/Player';
import Tournament from '../models/Tournament';
import { OutType } from '../models/Match';

// ==========================================
// TYPES
// ==========================================

interface AuthRequest extends Request {
  user?: any;
}

interface BallData {
  runs: number;
  isWide?: boolean;
  isNoBall?: boolean;
  isWicket?: boolean;
  outType?: OutType;
  byes?: number;
  legByes?: number;
}

// ==========================================
// CONTROLLERS
// ==========================================

// @desc    Get all matches
// @route   GET /api/v1/matches
// @access  Public
export const getMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[MATCHES] GET /matches - Query:`, req.query);
    
    const { status, tournament, team, limit = 20, page = 1 } = req.query;
    
    const query: any = {};
    
    if (status) query.status = status;
    if (tournament) {
      try {
        query.tournamentId = tournament;
      } catch (e) {
        console.warn(`[MATCHES] Invalid tournament ID: ${tournament}`);
      }
    }
    if (team) {
      query.$or = [{ team1: team }, { team2: team }];
    }
    
    const matches = await Match.aggregate([
      { $match: query },
      { $lookup: {
          from: 'teams', 
          localField: 'team1', 
          foreignField: '_id', 
          as: 'team1'
        }},
      { $unwind: { path: '$team1', preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: 'teams', 
          localField: 'team2', 
          foreignField: '_id', 
          as: 'team2'
        }},
      { $unwind: { path: '$team2', preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: 'tournaments', 
          localField: 'tournamentId', 
          foreignField: '_id', 
          as: 'tournamentId'
        }},
      { $unwind: { path: '$tournamentId', preserveNullAndEmptyArrays: true } },
      { $sort: { date: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ]);

    
    const total = await Match.countDocuments(query);
    
    console.log(`[MATCHES] Returning ${matches.length} matches (total: ${total})`);
    
    res.json({
      success: true,
      data: matches,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('[MATCHES] Error:', error);
    next(error);
  }
};

// @desc    Get single match
// @route   GET /api/v1/matches/:id
// @access  Public
export const getMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1', 'name shortName logo players')
      .populate('team2', 'name shortName logo players')
      .populate('tournamentId', 'name')
      .populate('scorerId', 'username email');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new match
// @route   POST /api/v1/matches
// @access  Private (Organizer/Admin)
export const createMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      tournamentId: tournamentIdRaw,
      tournament: tournamentRaw,
      round,
      matchNumber,
      // Accept both naming conventions (team1/team2 or team1Id/team2Id)
      team1: team1Raw,
      team2: team2Raw,
      team1Id,
      team2Id,
      venue,
      // Accept both date and scheduledDate
      date: dateRaw,
      scheduledDate,
      time,
      format
    } = req.body;
    
    const team1 = team1Raw || team1Id;
    const team2 = team2Raw || team2Id;
    const date = dateRaw || scheduledDate;
    // Accept tournamentId from body OR from URL param (when routed via /tournaments/:id/matches)
    const tournamentId = tournamentIdRaw || tournamentRaw || req.params.id;
    
    if (!team1 || !team2) {
      return res.status(400).json({
        success: false,
        message: 'team1 and team2 are required'
      });
    }
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Match date is required'
      });
    }
    
    // Verify teams exist
    const team1Doc = await Team.findById(team1);
    const team2Doc = await Team.findById(team2);
    
    if (!team1Doc || !team2Doc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team IDs'
      });
    }

    // Auto-generate match name if not provided
    const matchName = name || `${team1Doc.name} vs ${team2Doc.name}`;

    const match = await Match.create({
      name: matchName,
      team1Name: team1Doc.name,
      team2Name: team2Doc.name,
      tournamentId,
      round,
      matchNumber,
      team1,
      team2,
      venue,
      date: new Date(date),
      time,
      format: format || 'T20',
      status: 'upcoming',
      scorerId: req.user?.id
    });
    
    // Add to tournament if provided
    if (tournamentId) {
      await Tournament.findByIdAndUpdate(tournamentId, {
        $push: { matches: match._id }
      });
    }
    
await match.populate([
  { path: 'team1', select: 'name shortName' },
  { path: 'team2', select: 'name shortName' },
  { path: 'tossWinner', select: 'name shortName' }
]);
    
    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update match
// @route   PUT /api/v1/matches/:id
// @access  Private
export const updateMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      'team1',
      'team2',
      'tossWinner'
    ], 'name shortName');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Match updated',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete match
// @route   DELETE /api/v1/matches/:id
// @access  Private (Admin)
export const deleteMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Remove from tournament
    if (match.tournamentId) {
      await Tournament.findByIdAndUpdate(match.tournamentId, {
        $pull: { matches: match._id }
      });
    }
    
    await match.deleteOne();
    
    res.json({
      success: true,
      message: 'Match deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start match (after toss)
// @route   POST /api/v1/matches/:id/start
// @access  Private
export const startMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tossWinner, decision } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Match is not in upcoming status'
      });
    }
    
    await match.startMatch(
      new mongoose.Types.ObjectId(tossWinner),
      decision
    );
    
await match.populate([
  { path: 'team1', select: 'name shortName logo' },
  { path: 'team2', select: 'name shortName logo' },
  { path: 'tossWinner', select: 'name shortName logo' }
]);

    res.json({
      success: true,
      message: 'Match started',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add ball to match (SCORING)
// @route   POST /api/v1/matches/:id/score
// @access  Private
export const addBall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ballData: BallData = req.body;
    const { strikerId, nonStrikerId, bowlerId } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'Match is not live'
      });
    }
    
    // Set players if provided
    if (strikerId) match.striker = new mongoose.Types.ObjectId(strikerId);
    if (nonStrikerId) match.nonStriker = new mongoose.Types.ObjectId(nonStrikerId);
    if (bowlerId) match.lastBowler = new mongoose.Types.ObjectId(bowlerId);
    
    // Add the ball
    await match.addBall(ballData);
    
// Reload match with populated data for overlays and live score
    await match.populate([
      { path: 'team1', select: 'name shortName logo' },
      { path: 'team2', select: 'name shortName logo' },
      { path: 'tossWinner', select: 'name shortName logo' }
    ]);

    // Get socket instance for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('scoreUpdate', match.toObject());
    }

    const currentInningsIdx = (match.currentInnings || 1) - 1;
    const currentInnings = match.innings && match.innings[currentInningsIdx];

    res.json({
      success: true,
      message: 'Ball added',
      data: {
        // Flat score fields (backward compat)
        score: match.team1Score,
        wickets: match.team1Wickets,
        overs: match.team1Overs.toFixed(1),
        team2Score: match.team2Score,
        team2Wickets: match.team2Wickets,
        team2Overs: match.team2Overs.toFixed(1),
        currentOver: match.currentOver,
        currentBall: match.currentBall,
        currentInnings: match.currentInnings,
        // Current innings detail
        innings: currentInnings ? {
          score: currentInnings.score,
          wickets: currentInnings.wickets,
          overs: currentInnings.overs,
          balls: currentInnings.balls,
          runRate: currentInnings.runRate,
          requiredRuns: currentInnings.requiredRuns,
          requiredRunRate: currentInnings.requiredRunRate,
          targetScore: currentInnings.targetScore,
          extras: currentInnings.extras
        } : null,
        // Team names for overlay display
        team1: (match.team1 as any)?.name || '',
        team2: (match.team2 as any)?.name || '',
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set striker
// @route   POST /api/v1/matches/:id/striker
// @access  Private
export const setStriker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    match.striker = new mongoose.Types.ObjectId(playerId);
    await match.save();
    
    res.json({
      success: true,
      message: 'Striker set'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set non-striker
// @route   POST /api/v1/matches/:id/non-striker
// @access  Private
export const setNonStriker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    match.nonStriker = new mongoose.Types.ObjectId(playerId);
    await match.save();
    
    res.json({
      success: true,
      message: 'Non-striker set'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set bowler
// @route   POST /api/v1/matches/:id/bowler
// @access  Private
export const setBowler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    match.lastBowler = new mongoose.Types.ObjectId(playerId);
    await match.save();
    
    res.json({
      success: true,
      message: 'Bowler set'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End innings
// @route   POST /api/v1/matches/:id/end-innings
// @access  Private
export const endInnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    await match.endInnings();
    
    // If second innings and target set, set target for team 2
    if (match.currentInnings === 1) {
      const targetScore = match.team1Score + 1;
      
      // Initialize second innings
      match.innings.push({
        teamId: match.team2,
        status: 'in_progress',
        score: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        runRate: 0,
        targetScore,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        fallOfWickets: []
      });
      match.currentInnings = 2;
      match.currentOver = 0;
      match.currentBall = 0;
    }
    
    await match.save();
    await match.populate('team1', 'name shortName');
    await match.populate('team2', 'name shortName');
    
    res.json({
      success: true,
      message: 'Innings ended',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End match
// @route   POST /api/v1/matches/:id/end
// @access  Private
export const endMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { winnerId, resultType, margin, playerOfMatch } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    await match.endMatch(
      winnerId ? new mongoose.Types.ObjectId(winnerId) : undefined,
      resultType
    );
    
    // Update player of match stats
    if (playerOfMatch) {
      const player = await Player.findById(playerOfMatch);
      if (player) {
        await player.updateStats({});
      }
    }
    
    // Update team stats
    if (winnerId) {
      await Team.findById(winnerId).then(async (team) => {
        if (team) {
          team.tournamentStats = {
            ...team.tournamentStats,
            matchesWon: (team.tournamentStats?.matchesWon || 0) + 1,
            matchesPlayed: (team.tournamentStats?.matchesPlayed || 0) + 1
          };
          await team.save();
        }
      });
    }
    
    await match.populate('team1', 'name shortName');
    await match.populate('team2', 'name shortName');
    await match.populate('winner', 'name shortName');
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('matchEnded', match);
    }
    
    res.json({
      success: true,
      message: 'Match ended',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live matches
// @route   GET /api/v1/matches/live
// @access  Public
export const getLiveMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await (Match as any).getLiveMatches();

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming matches
// @route   GET /api/v1/matches/upcoming
// @access  Public
export const getUpcomingMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const matches = await (Match as any).getUpcoming(limit);

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update match status
// @route   PUT /api/v1/matches/:id/status
// @access  Private
export const updateMatchStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    match.status = status;
    await match.save();
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('matchStatusUpdate', {
        matchId: match._id,
        status: match.status
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated',
      data: { status: match.status }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set overlay for match
// @route   PUT /api/v1/matches/:id/overlay
// @access  Private
export const setMatchOverlay = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { overlayId } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    match.overlayId = new mongoose.Types.ObjectId(overlayId);
    await match.save();
    
    res.json({
      success: true,
      message: 'Overlay set'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  startMatch,
  addBall,
  setStriker,
  setNonStriker,
  setBowler,
  endInnings,
  endMatch,
  getLiveMatches,
  getUpcomingMatches,
  updateMatchStatus,
  setMatchOverlay
};