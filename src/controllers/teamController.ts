import { Request, Response } from 'express';
import Team from '../models/Team';
import logger from '../utils/logger';

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query = req.query.tournament ? { tournament: req.query.tournament } : {};
    const total = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .populate('tournament')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const result = {
      teams,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    res.json(result);
  } catch (error) {
    logger.error('Get teams error:', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Server error' });
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
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }
    const playerData = {
      name: req.body.name,
      role: req.body.role,
      jerseyNumber: req.body.jerseyNumber,
      ...(req.file && { image: `/uploads/${req.file.filename}` }),
    };
    team.players.push(playerData);
    await team.save();
    res.status(201).json(team);
  } catch (error) {
    console.error('Add player error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};