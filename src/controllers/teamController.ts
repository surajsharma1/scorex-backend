import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team';
import Player from '../models/Player';
import Tournament from '../models/Tournament';

interface AuthRequest extends Request { user?: any; }

export const createTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, shortName, players, captain, tournamentId } = req.body;
    
    const team = await Team.create({
      name, shortName, players, captain,
      tournamentId: tournamentId ? new mongoose.Types.ObjectId(tournamentId) : undefined
    });
    
    if (tournamentId) {
      const tournament = await Tournament.findById(tournamentId);
      if (tournament) {
        tournament.addTeam(team._id);
      }
    }
    
    await team.populate('players captain', 'name');
    res.status(201).json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const getTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId, limit = 20, page = 1 } = req.query;
    const query: any = tournamentId ? { tournamentId } : {};
    
    const teams = await Team.find(query)
      .populate('players captain tournamentId', 'name shortName')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await Team.countDocuments(query);
    
    res.json({ 
      success: true, 
      data: teams, 
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) { next(error); }
};

export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players captain tournamentId matches', 'name shortName');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const updateTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('players captain');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    await team.updateStats();
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const deleteTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) { next(error); }
};

export const addPlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    let playerId: mongoose.Types.ObjectId;

    if (req.body.playerId) {
      playerId = new mongoose.Types.ObjectId(req.body.playerId);
    } else if (req.body.name && req.body.role) {
      const Player = mongoose.model('Player');
      const player = await Player.create({
        name: req.body.name,
        role: req.body.role,
        isActive: true
      });
      playerId = player._id;
    } else {
      return res.status(400).json({ success: false, message: 'playerId or (name, role) required' });
    }

    await team.addPlayer(playerId);
    await team.populate('players captain', 'name role');
    res.json({ success: true, data: team });
  } catch (error: any) {
    next(error);
  }
};

export const removePlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    const playerId = new mongoose.Types.ObjectId(req.params.playerId);
    await team.removePlayer(playerId);
    await team.populate('players');
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export default { createTeam, getTeams, getTeam, updateTeam, deleteTeam, addPlayer, removePlayer };


