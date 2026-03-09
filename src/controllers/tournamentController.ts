/**
 * Tournament Controller
 * Tournament management with bracket generation
 * Following PROJECT_ALGORITHM.md specifications
 */

import { Request, Response, NextFunction } from 'express';
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all tournaments
// @route   GET /api/v1/tournaments
// @access  Public
export const getTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type, organizer, limit = 20, page = 1 } = req.query;
    
    const query: any = { isPublic: true };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (organizer) query.organizer = organizer;
    
    const tournaments = await Tournament.find(query)
      .populate('organizer', 'username email')
      .sort({ startDate: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Tournament.countDocuments(query);
    
    res.json({
      success: true,
      data: tournaments,
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

// @desc    Get upcoming tournaments
// @route   GET /api/v1/tournaments/upcoming
// @access  Public
export const getUpcomingTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const tournaments = await Tournament.getUpcoming(limit);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ongoing tournaments
// @route   GET /api/v1/tournaments/ongoing
// @access  Public
export const getOngoingTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournaments = await Tournament.getOngoing();
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured tournaments
// @route   GET /api/v1/tournaments/featured
// @access  Public
export const getFeaturedTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const tournaments = await Tournament.getFeatured(limit);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tournament
// @route   GET /api/v1/tournaments/:id
// @access  Public
export const getTournament = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'username email fullName')
      .populate('teams', 'name shortName logo players')
      .populate('matches')
      .populate('winner', 'name shortName')
      .populate('runnerUp', 'name shortName');
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tournament
// @route   POST /api/v1/tournaments
// @access  Private
export const createTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      logo,
      banner,
      startDate,
      endDate,
      registrationDeadline,
      location,
      locationType,
      address,
      type,
      format,
      maxTeams,
      minTeams,
      overs,
      rules,
      prize,
      entryFee,
      isPublic
    } = req.body;
    
    const tournament = await Tournament.create({
      name,
      description,
      logo,
      banner,
      organizer: req.user?.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      location,
      locationType,
      address,
      type: type || 'round_robin',
      format: format || 'T20',
      maxTeams: maxTeams || 8,
      minTeams: minTeams || 4,
      overs: overs || 20,
      rules,
      prize,
      entryFee: entryFee || 0,
      isPublic: isPublic !== false,
      status: 'draft'
    });
    
    await tournament.populate('organizer', 'username email');
    
    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tournament
// @route   PUT /api/v1/tournaments/:id
// @access  Private (Organizer/Admin)
export const updateTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    // Check ownership
    if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tournament'
      });
    }
    
    const allowedUpdates = [
      'name', 'description', 'logo', 'banner', 'location', 'locationType',
      'address', 'rules', 'prize', 'entryFee', 'isPublic', 'isFeatured',
      'streamUrl', 'registrationDeadline'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        (tournament as any)[field] = req.body[field];
      }
    });
    
    await tournament.save();
    
    res.json({
      success: true,
      message: 'Tournament updated',
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tournament
// @route   DELETE /api/v1/tournaments/:id
// @access  Private (Organizer/Admin)
export const deleteTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tournament'
      });
    }
    
    tournament.status = 'cancelled';
    await tournament.save();
    
    res.json({
      success: true,
      message: 'Tournament cancelled'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team to tournament
// @route   POST /api/v1/tournaments/:id/teams
// @access  Private
export const addTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.body;
    
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    await tournament.addTeam(teamId);
    
    // Also add to team's tournaments
    if (!team.tournaments.includes(tournament._id)) {
      team.tournaments.push(tournament._id);
      await team.save();
    }
    
    res.json({
      success: true,
      message: 'Team added to tournament',
      data: tournament
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove team from tournament
// @route   DELETE /api/v1/tournaments/:id/teams/:teamId
// @access  Private (Organizer/Admin)
export const removeTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await tournament.removeTeam(teamId);
    
    res.json({
      success: true,
      message: 'Team removed from tournament'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate bracket
// @route   POST /api/v1/tournaments/:id/bracket
// @access  Private (Organizer/Admin)
export const generateBracket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (tournament.bracketGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Bracket already generated'
      });
    }
    
    await tournament.generateBracket();
    
    res.json({
      success: true,
      message: 'Bracket generated successfully',
      data: tournament
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Start tournament
// @route   POST /api/v1/tournaments/:id/start
// @access  Private (Organizer/Admin)
export const startTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await tournament.startTournament();
    
    res.json({
      success: true,
      message: 'Tournament started',
      data: tournament
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    End tournament
// @route   POST /api/v1/tournaments/:id/end
// @access  Private (Organizer/Admin)
export const endTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { winnerId } = req.body;
    
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await tournament.endTournament(winnerId);
    
    res.json({
      success: true,
      message: 'Tournament ended',
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tournament stats
// @route   GET /api/v1/tournaments/:id/stats
// @access  Public
export const getTournamentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams', 'name shortName tournamentStats points netRunRate')
      .populate('matches');
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    // Calculate points table for round robin
    if (tournament.type === 'round_robin' || tournament.type === 'league') {
      await tournament.calculatePointsTable();
    }
    
    res.json({
      success: true,
      data: {
        tournament,
        pointsTable: tournament.pointsTable,
        matches: tournament.matches,
        stats: {
          totalTeams: tournament.teams?.length || 0,
          totalMatches: tournament.matches?.length || 0,
          completedMatches: tournament.matches?.filter((m: any) => m.status === 'completed').length || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my tournaments (organized by user)
// @route   GET /api/v1/tournaments/my/organized
// @access  Private
export const getMyOrganizedTournaments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournaments = await Tournament.getByOrganizer(req.user?.id);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search tournaments
// @route   GET /api/v1/tournaments/search
// @access  Public
export const searchTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required'
      });
    }
    
    const tournaments = await Tournament.search(q as string);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getTournaments,
  getUpcomingTournaments,
  getOngoingTournaments,
  getFeaturedTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  addTeam,
  removeTeam,
  generateBracket,
  startTournament,
  endTournament,
  getTournamentStats,
  getMyOrganizedTournaments,
  searchTournaments
};

