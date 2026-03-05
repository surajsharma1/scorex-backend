import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team';
import Player from '../models/Player';
import User from '../models/User';
import logger from '../utils/logger';

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is connected first
    if (mongoose.connection.readyState !== 1) {
      logger.error('Database not connected:', { readyState: mongoose.connection.readyState });
      res.status(503).json({ 
        message: 'Database unavailable. Please try again later.',
        code: 'DB_NOT_CONNECTED'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query = req.query.tournament ? { tournament: req.query.tournament } : {};

    // First, get total count
    const total = await Team.countDocuments(query).catch(countError => {
      logger.error('Count documents error:', { error: countError });
      return 0;
    });

    // Get teams without populate first (more reliable)
    let teams = await Team.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .catch(queryError => {
        logger.error('Find teams error:', { error: queryError });
        return [];
      });

    // Try to populate tournament data separately, don't fail if it doesn't work
    if (teams.length > 0) {
      try {
        teams = await Team.populate(teams, { 
          path: 'tournament', 
          select: 'name status',
          strictPopulate: false 
        });
      } catch (populateError) {
        logger.warn('Tournament populate failed:', { error: populateError });
        // Teams still available without populated tournament data
      }
    }

    const result = {
      teams,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    res.json(result);
  } catch (error) {
    logger.error('Get teams error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Creating team:', { body: req.body, userId: (req as any).user?._id });

    const teamData = {
      name: req.body.name,
      color: req.body.color,
      tournament: req.body.tournament,
      logo: req.file ? `/uploads/${req.file.filename}` : undefined,
      createdBy: (req as any).user?._id,  // Type assertion
    };

    const team = await Team.create(teamData);
    logger.info('Team created successfully:', { teamId: team._id });

    res.status(201).json(team);
  } catch (error) {
    logger.error('Team creation error:', { error: error instanceof Error ? error.message : 'Unknown error', body: req.body });
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};

export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const updateData = {
      ...req.body,
      logo: req.file ? `/uploads/${req.file.filename}` : undefined,
    };
    const team = await Team.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }
    res.json(team);
  } catch (error) {
    logger.error('Update team error:', { error: error instanceof Error ? error.message : 'Unknown error', teamId: req.params.id });
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }
    res.json({ message: 'Team deleted' });
  } catch (error) {
    logger.error('Delete team error:', { error: error instanceof Error ? error.message : 'Unknown error', teamId: req.params.id });
    res.status(500).json({ message: 'Server error' });
  }
};

export const addPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is connected first
    if (mongoose.connection.readyState !== 1) {
      logger.error('Database not connected:', { readyState: mongoose.connection.readyState });
      res.status(503).json({ 
        message: 'Database unavailable. Please try again later.',
        code: 'DB_NOT_CONNECTED'
      });
      return;
    }

    const team = await Team.findById(req.params.teamId);
    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    // Validate required fields
    if (!req.body.name || !req.body.role || !req.body.jerseyNumber) {
      res.status(400).json({ message: 'Missing required fields: name, role, jerseyNumber' });
      return;
    }

    // Create a new Player document
    const playerData = {
      name: req.body.name,
      role: req.body.role,
      jerseyNumber: req.body.jerseyNumber,
      team: req.params.teamId,
      userId: req.body.userId || (req as any).user?._id, // Link to user if provided
      ...(req.file && { image: `/uploads/${req.file.filename}` }),
    };

    const player = await Player.create(playerData);
    team.players.push(player._id);
    await team.save();

    // Populate the player in the response
    await team.populate('players');
    res.status(201).json(team);
  } catch (error) {
    logger.error('Add player error:', { error: error instanceof Error ? error.message : 'Unknown error', teamId: req.params.teamId, body: req.body });
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const addPlayerByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is connected first
    if (mongoose.connection.readyState !== 1) {
      logger.error('Database not connected:', { readyState: mongoose.connection.readyState });
      res.status(503).json({ 
        message: 'Database unavailable. Please try again later.',
        code: 'DB_NOT_CONNECTED'
      });
      return;
    }

    const { username } = req.body;
    const teamId = req.params.teamId;

    if (!username) {
      res.status(400).json({ message: 'Username is required' });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username, deleted: { $ne: true } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user is already a player in this team
    const existingPlayer = await Player.findOne({ userId: user._id, team: teamId });
    if (existingPlayer) {
      res.status(400).json({ message: 'User is already a player in this team' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    // Create player with user reference
    const player = await Player.create({
      name: user.username,
      role: req.body.role || 'Batsman',
      jerseyNumber: req.body.jerseyNumber || '0',
      team: teamId,
      userId: user._id,
    });

    team.players.push(player._id);
    await team.save();

    // Populate the player in the response
    await team.populate('players');
    res.status(201).json(team);
  } catch (error) {
    logger.error('Add player by username error:', { error: error instanceof Error ? error.message : 'Unknown error', teamId: req.params.teamId, username: req.body.username });
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
