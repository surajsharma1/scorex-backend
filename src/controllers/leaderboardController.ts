/**
 * Leaderboard Controller
 * Global and tournament leaderboards
 * Following PROJECT_ALGORITHM.md specifications
 */

import { Request, Response, NextFunction } from 'express';
import Player from '../models/Player';
import Team from '../models/Team';
import Match from '../models/Match';
import Tournament from '../models/Tournament';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get global leaderboard
// @route   GET /api/v1/leaderboard
// @access  Public
export const getGlobalLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'player', limit = 50, page = 1, timeframe = 'all' } = req.query;
    
    let data: any[];
    let query: any = {};
    
    // Filter by timeframe
    if (timeframe !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        default:
          startDate = new Date(0);
      }
      
      query.lastMatchDate = { $gte: startDate };
    }
    
    if (type === 'player') {
      // Get player leaderboard
      data = await Player.find({ ...query, isActive: true })
        .sort({ totalPoints: -1, totalRuns: -1, totalWickets: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('name photo role totalPoints totalRuns totalWickets totalMatches matchesWon')
        .lean();
      
      // Add rank
      data = data.map((player, index) => ({
        ...player,
        rank: (Number(page) - 1) * Number(limit) + index + 1,
        winRate: player.totalMatches > 0 
          ? ((player.matchesWon / player.totalMatches) * 100).toFixed(1)
          : '0'
      }));
      
    } else if (type === 'team') {
      // Get team leaderboard
      data = await Team.find({ ...query, isActive: true })
        .sort({ points: -1, netRunRate: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('name shortName logo points netRunRate tournamentStats')
        .populate('owner', 'username')
        .lean();
      
      data = data.map((team, index) => ({
        ...team,
        rank: (Number(page) - 1) * Number(limit) + index + 1,
        matchesPlayed: team.tournamentStats?.matchesPlayed || 0,
        matchesWon: team.tournamentStats?.matchesWon || 0
      }));
    }
    
    const total = type === 'player' 
      ? await Player.countDocuments(query)
      : await Team.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tournament leaderboard
// @route   GET /api/v1/leaderboard/tournament/:tournamentId
// @access  Public
export const getTournamentLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const { type = 'player', limit = 50 } = req.query;
    
    // Verify tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    let data: any[];
    
    if (type === 'player') {
      // Get players from teams in tournament
      const teams = await Team.find({ tournaments: tournamentId })
        .populate('players');
      
      const playerIds: any[] = [];
      teams.forEach((team: any) => {
        if (team.players) {
          playerIds.push(...team.players.map((p: any) => p._id));
        }
      });
      
      // Get player stats for this tournament
      const matches = await Match.find({
        tournamentId,
        status: 'completed'
      });
      
      // Calculate points per player based on tournament matches
      const playerStats: Map<string, any> = new Map();
      
      for (const match of matches) {
        if (match.scorecard) {
          for (const batsman of match.scorecard.batting) {
            const existing = playerStats.get(batsman.playerId?.toString()) || {
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              catches: 0
            };
            
            existing.runs += batsman.runs || 0;
            existing.balls += batsman.balls || 0;
            existing.fours += batsman.fours || 0;
            existing.sixes += batsman.sixes || 0;
            
            playerStats.set(batsman.playerId?.toString(), existing);
          }
          
          for (const bowler of match.scorecard.bowling) {
            const existing = playerStats.get(bowler.playerId?.toString()) || {
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              catches: 0
            };
            
            existing.wickets += bowler.wickets || 0;
            existing.catches += bowler.catches || 0;
            
            playerStats.set(bowler.playerId?.toString(), existing);
          }
        }
      }
      
      // Get player details and calculate points
      const players = await Player.find({ _id: { $in: playerIds } })
        .select('name photo role')
        .lean();
      
      data = players.map((player, index) => {
        const stats = playerStats.get(player._id.toString()) || {};
        
        // Calculate points per algorithm
        const points = 
          (stats.runs * 1) +
          (stats.fours * 1) +
          (stats.sixes * 2) +
          (stats.wickets * 10) +
          (stats.catches * 5);
        
        return {
          _id: player._id,
          name: player.name,
          photo: player.photo,
          role: player.role,
          points,
          runs: stats.runs,
          wickets: stats.wickets,
          catches: stats.catches,
          rank: index + 1
        };
      });
      
      // Sort by points
      data.sort((a, b) => b.points - a.points);
      data = data.slice(0, Number(limit));
      
    } else if (type === 'team') {
      // Get teams in tournament with their stats
      data = await Team.find({ tournaments: tournamentId })
        .sort({ 'tournamentStats.points': -1, 'tournamentStats.netRunRate': -1 })
        .limit(Number(limit))
        .select('name shortName logo tournamentStats')
        .lean();
      
      data = data.map((team, index) => ({
        ...team,
        points: team.tournamentStats?.points || 0,
        matchesPlayed: team.tournamentStats?.matchesPlayed || 0,
        matchesWon: team.tournamentStats?.matchesWon || 0,
        rank: index + 1
      }));
    }
    
    res.json({
      success: true,
      data,
      tournament: {
        _id: tournament._id,
        name: tournament.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get match leaderboard (for specific match)
// @route   GET /api/v1/leaderboard/match/:matchId
// @access  Public
export const getMatchLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (!match.scorecard) {
      return res.json({
        success: true,
        data: [],
        message: 'No scorecard available'
      });
    }
    
    // Combine batting and bowling stats
    const playerStats: Map<string, any> = new Map();
    
    // Process batting
    if (match.scorecard.batting) {
      for (const batsman of match.scorecard.batting) {
        const playerId = batsman.playerId?.toString();
        if (!playerId) continue;
        
        const existing = playerStats.get(playerId) || {
          playerId,
          name: batsman.name,
          team: batsman.teamId?.toString()
        };
        
        existing.runs = (existing.runs || 0) + (batsman.runs || 0);
        existing.balls = (existing.balls || 0) + (batsman.balls || 0);
        existing.fours = (existing.fours || 0) + (batsman.fours || 0);
        existing.sixes = (existing.sixes || 0) + (batsman.sixes || 0);
        existing.dismissal = batsman.dismissal;
        
        playerStats.set(playerId, existing);
      }
    }
    
    // Process bowling
    if (match.scorecard.bowling) {
      for (const bowler of match.scorecard.bowling) {
        const playerId = bowler.playerId?.toString();
        if (!playerId) continue;
        
        const existing = playerStats.get(playerId) || {
          playerId,
          name: bowler.name,
          team: bowler.teamId?.toString()
        };
        
        existing.wickets = (existing.wickets || 0) + (bowler.wickets || 0);
        existing.overs = (existing.overs || 0) + (bowler.overs || 0);
        existing.runsConceded = (existing.runsConceded || 0) + (bowler.runs || 0);
        
        playerStats.set(playerId, existing);
      }
    }
    
    // Calculate points and create leaderboard
    const data = Array.from(playerStats.values()).map(player => {
      const points = 
        ((player.rays || player.runs) * 1) +
        ((player.fours || 0) * 1) +
        ((player.sixes || 0) * 2) +
        ((player.wickets || 0) * 10);
      
      return {
        ...player,
        runs: player.runs || player.runs,
        wickets: player.wickets,
        points,
        strikeRate: player.balls > 0 
          ? ((player.runs / player.balls) * 100).toFixed(2)
          : '0.00'
      };
    });
    
    // Sort by points
    data.sort((a, b) => b.points - a.points);
    
    // Add MVP award to top player
    if (data.length > 0) {
      data[0].isMVP = true;
    }
    
    res.json({
      success: true,
      data,
      match: {
        _id: match._id,
        team1: match.team1,
        team2: match.team2
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orange cap (top scorer) leaderboard
// @route   GET /api/v1/leaderboard/orange-cap
// @access  Public
export const getOrangeCap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId, year } = req.query;
    
    let query: any = { isActive: true };
    
    if (tournamentId) {
      // Get players from tournament teams
      const teams = await Team.find({ tournaments: tournamentId });
      const playerIds = teams.flatMap((t: any) => t.players || []);
      query._id = { $in: playerIds };
    }
    
    const players = await Player.find(query)
      .sort({ totalRuns: -1 })
      .limit(10)
      .select('name photo totalRuns totalMatches')
      .lean();
    
    const data = players.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
    
    res.json({
      success: true,
      data,
      title: 'Orange Cap - Top Run Scorer'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get purple cap (top wicket taker) leaderboard
// @route   GET /api/v1/leaderboard/purple-cap
// @access  Public
export const getPurpleCap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.query;
    
    let query: any = { isActive: true };
    
    if (tournamentId) {
      const teams = await Team.find({ tournaments: tournamentId });
      const playerIds = teams.flatMap((t: any) => t.players || []);
      query._id = { $in: playerIds };
    }
    
    const players = await Player.find(query)
      .sort({ totalWickets: -1 })
      .limit(10)
      .select('name photo totalWickets totalMatches')
      .lean();
    
    const data = players.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
    
    res.json({
      success: true,
      data,
      title: 'Purple Cap - Top Wicket Taker'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getGlobalLeaderboard,
  getTournamentLeaderboard,
  getMatchLeaderboard,
  getOrangeCap,
  getPurpleCap
};
