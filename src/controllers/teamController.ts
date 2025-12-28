import { Request, Response } from 'express';
import Team from '../models/Team';

export const createTeam = async (req: Request, res: Response) => {
  try {
    console.log('Creating team:', req.body);
    
    const teamData = {
      name: req.body.name,
      color: req.body.color,
      tournament: req.body.tournament,
      logo: req.file ? `/uploads/${req.file.filename}` : undefined,  // Fixed: Removed trailing comma
      createdBy: req.user?._id,
    };

    const team = await Team.create(teamData);
    console.log('Team created:', team);
    
    res.status(201).json(team);
  } catch (error) {
    console.error('Team creation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};
export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await Team.find({ createdBy: req.user?._id })
      .populate('tournament')
      .populate('players');
    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    console.error('Update team error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json({ message: 'Team deleted' });
  } catch (error) {
    console.error('Delete team error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};

export const addPlayer = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const playerData = {
      name: req.body.name,
      role: req.body.role,
      jerseyNumber: req.body.jerseyNumber,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
    };

    team.players.push(playerData);
    await team.save();
    
    res.status(201).json(team);
  } catch (error) {
    console.error('Add player error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};