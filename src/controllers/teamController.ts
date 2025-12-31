import { Request, Response } from 'express';
import Team from '../models/Team';

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.tournament ? { tournament: req.query.tournament } : {};
    const teams = await Team.find(query).populate('tournament');
    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const teamData = {
      ...req.body,
      logo: req.file ? `/uploads/${req.file.filename}` : undefined,
      createdBy: req.user?._id,
    };

    const team = await Team.create(teamData);
    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
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
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
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
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
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
      image: req.file ? `/uploads/${req.file.filename}` : '',
    };

    team.players.push(playerData);
    await team.save();
    res.status(201).json(team);
  } catch (error) {
    console.error('Add player error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};