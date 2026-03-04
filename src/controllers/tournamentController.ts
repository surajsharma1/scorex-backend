import { Request, Response, NextFunction } from 'express';
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';

// Create a new tournament
export const createTournament = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, organizer, startDate, endDate, location, locationType, type } = req.body;
    
    // Safely extract the user ID using 'any' casting
    const userId = (req as any).user?._id || (req as any).user?.id;

    const tournament = await Tournament.create({
      name, organizer, startDate, endDate, location, locationType, type,
      createdBy: userId 
    });

    res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    next(error);
  }
};

// Get all tournaments
export const getTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournaments = await Tournament.find().populate('teams', 'name logo');
    res.status(200).json({ success: true, count: tournaments.length, data: tournaments });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
};