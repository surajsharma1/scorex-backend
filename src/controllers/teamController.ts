/**
 * Team Controller
 * Team and player management
 * Following PROJECT_ALGORITHM.md specifications
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team';
import Player from '../models/Player';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all teams
// @route   GET /api/v1/teams
// @access  Public
export const getTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, owner, tournament, limit = 20, page = 1 } = req.query;
    
    const query: any = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } }
      ];
    }
    if (owner) query.owner = owner;
    if (tournament) query.tournaments = new mongoose.Types.ObjectId(tournament as string);
    
    const teams = await Team.find(query)
      .populate('owner', 'username email')
      .populate('players')
      .sort({ points: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Team.countDocuments(query);
    
    res.json({
      success: true,
      data: teams,
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

// @desc    Get single team
// @route   GET /api/v1/teams/:id
// @access  Public
export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'username email fullName')
      .populate('players')
      .populate('captain')
      .populate('viceCaptain')
      .populate('tournaments', 'name status');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create team
// @route   POST /api/v1/teams
// @access  Private
export const createTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, shortName, description, logo, tournament } = req.body;

    const team = await Team.create({
      name,
      shortName,
      description,
      logo,
      owner: req.user?.id,
      players: [],
      tournaments: tournament ? [new mongoose.Types.ObjectId(tournament)] : [],
      tournamentStats: {
        tournamentsPlayed: 0,
        tournamentsWon: 0,
        tournamentsLost: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesTied: 0,
        matchesNoResult: 0
      },
      points: 0,
      netRunRate: 0
    });

    // If a tournament was provided, also register the team in that tournament
    if (tournament) {
      const Tournament = mongoose.model('Tournament');
      const tournamentDoc = await Tournament.findById(tournament);
      if (tournamentDoc) {
        try {
          await (tournamentDoc as any).addTeam(team._id);
        } catch (e: any) {
          // addTeam throws if already registered or full — not fatal for team creation
        }
      }
    }

    await team.populate('owner', 'username email');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
// @route   PUT /api/v1/teams/:id
// @access  Private (Owner/Admin)
export const updateTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check ownership
    if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this team'
      });
    }
    
    const { name, shortName, description, logo, captain, viceCaptain } = req.body;
    
    if (name) team.name = name;
    if (shortName) team.shortName = shortName;
    if (description) team.description = description;
    if (logo) team.logo = logo;
    if (captain) team.captain = captain;
    if (viceCaptain) team.viceCaptain = viceCaptain;
    
    await team.save();
    
    res.json({
      success: true,
      message: 'Team updated',
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete team
// @route   DELETE /api/v1/teams/:id
// @access  Private (Owner/Admin)
export const deleteTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this team'
      });
    }
    
    team.isActive = false;
    await team.save();
    
    res.json({
      success: true,
      message: 'Team deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add player to team
// @route   POST /api/v1/teams/:id/players
// @access  Private (Owner/Admin)
export const addPlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId, name, role, jerseyNumber, userId, isCaptain, isViceCaptain } = req.body;
    
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    let player;
    
    if (playerId) {
      // Adding an existing player by ID
      player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }
    } else if (name) {
      // Creating a new player from provided data
      const roleMap: Record<string, string> = {
        'Batsman': 'batsman',
        'Bowler': 'bowler',
        'All-rounder': 'all-rounder',
        'Wicket Keeper': 'wicket-keeper',
      };
      player = await Player.create({
        name,
        role: roleMap[role] || role || 'batsman',
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
        userId: userId || undefined,
        teams: [team._id],
        isActive: true,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either playerId or player name is required'
      });
    }
    
    // Add player to team
    await team.addPlayer(new mongoose.Types.ObjectId(player._id as string));
    
    // Set captain/vice-captain if requested
    if (isCaptain) {
      team.captain = player._id as any;
    }
    if (isViceCaptain) {
      team.viceCaptain = player._id as any;
    }
    
    await team.save();
    await team.populate('players');
    
    res.json({
      success: true,
      message: 'Player added to team',
      data: team
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Player already in team'
      });
    }
    next(error);
  }
};

// @desc    Remove player from team
// @route   DELETE /api/v1/teams/:id/players/:playerId
// @access  Private (Owner/Admin)
export const removePlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await team.removePlayer(new mongoose.Types.ObjectId(playerId));
    
    // Remove captain/vice-captain if player removed
    if (team.captain?.toString() === playerId) {
      team.captain = undefined;
    }
    if (team.viceCaptain?.toString() === playerId) {
      team.viceCaptain = undefined;
    }
    
    await team.save();
    
    res.json({
      success: true,
      message: 'Player removed from team'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team players
// @route   GET /api/v1/teams/:id/players
// @access  Public
export const getTeamPlayers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    res.json({
      success: true,
      data: team.players
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's teams
// @route   GET /api/v1/teams/user/:userId
// @access  Public
export const getUserTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const teams = await Team.getByOwner(new mongoose.Types.ObjectId(req.params.userId as string));



    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search teams
// @route   GET /api/v1/teams/search
// @access  Public
export const searchTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required'
      });
    }
    

    const teams = await Team.search(q as string);



    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};