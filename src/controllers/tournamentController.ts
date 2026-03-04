import { Request, Response, NextFunction } from 'express';
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';
import logger from '../utils/logger';

// Create a new tournament
export const createTournament = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Creating tournament:', { body: req.body, userId: (req as any).user?._id });
    
    // Extract all possible fields from frontend and backend formats
    const { 
      name, 
      description,
      organizer, 
      startDate, 
      endDate, 
      location, 
      locationType, 
      type,
      format,
      teams 
    } = req.body;
    
    // Safely extract the user ID using 'any' casting
    const userId = (req as any).user?._id || (req as any).user?.id;

    // Provide defaults for required fields if not provided
    const tournamentData: any = {
      name,
      organizer: organizer || 'Unknown Organizer', // Default organizer
      startDate, 
      endDate: endDate || startDate, // Default to startDate if no endDate
      location: location || 'TBD', // Default location
      locationType: locationType || 'Outdoor', // Default location type
      type: type || 'League', // Default tournament type
      createdBy: userId,
      // Optional fields
      ...(description && { description }),
      teams: teams || [], // Frontend can pass team IDs
    };

    const tournament = await Tournament.create(tournamentData);

    logger.info('Tournament created successfully:', { tournamentId: tournament._id });
    res.status(201).json({ success: true, data: tournament });
  } catch (error: any) {
    logger.error('Create tournament error:', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    next(error);
  }
};

// Get all tournaments
export const getTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournaments = await Tournament.find().populate('teams', 'name logo');
    res.status(200).json({ success: true, count: tournaments.length, data: tournaments });
  } catch (error: any) {
    logger.error('Get tournaments error:', { error: error.message, stack: error.stack });
    next(error);
  }
};

// Get single tournament
export const getTournamentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams')
      .populate({ path: 'matches', select: 'matchName teamA teamB matchDate status format' });

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    res.status(200).json({ success: true, data: tournament });
  } catch (error: any) {
    logger.error('Get tournament by ID error:', { error: error.message, stack: error.stack, tournamentId: req.params.id });
    next(error);
  }
};

// Add Team
export const addTeamToTournament = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    if (tournament.teams.includes(teamId)) {
      return res.status(400).json({ success: false, message: 'Team already in tournament' });
    }

    tournament.teams.push(teamId);
    await tournament.save();

    res.status(200).json({ success: true, data: tournament });
  } catch (error: any) {
    logger.error('Add team to tournament error:', { error: error.message, stack: error.stack });
    next(error);
  }
};

// Auto-generate Fixtures
export const generateFixtures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('teams');
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    if (tournament.teams.length < 2) return res.status(400).json({ success: false, message: 'Need at least 2 teams' });

    const matchesToCreate = [];
    const teams = tournament.teams;
    const userId = (req as any).user?._id || (req as any).user?.id;

    if (tournament.type === 'Round Robin') {
      let matchCount = 1;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matchesToCreate.push({
            tournamentId: tournament._id,
            matchName: `Match ${matchCount}`,
            teamA: teams[i]._id,
            teamB: teams[j]._id,
            venue: tournament.location,
            matchDate: tournament.startDate,
            format: 'T20',
            maxOvers: 20,
            createdBy: userId
          });
          matchCount++;
        }
      }
    }

    const createdMatches = await Match.insertMany(matchesToCreate);
    tournament.matches.push(...createdMatches.map(m => m._id as any));
    await tournament.save();

    res.status(201).json({ success: true, message: `Generated ${createdMatches.length} fixtures`, data: createdMatches });
  } catch (error: any) {
    logger.error('Generate fixtures error:', { error: error.message, stack: error.stack });
    next(error);
  }
};
