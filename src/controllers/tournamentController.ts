import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament';
import Team from '../models/Team';

interface AuthRequest extends Request { user?: any; }

export const createTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.create({
      ...req.body,
      organizer: req.user?._id
    });
    await tournament.save();
    await tournament.populate('organizer teams');
    res.status(201).json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const getTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type, limit = 20, page = 1 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    const tournaments = await Tournament.find(query)
      .populate('organizer teams', 'name username')
      .limit(Number(limit))
      .skip((Number(page)-1)*Number(limit));
    
    res.json({ success: true, data: tournaments });
  } catch (error) { next(error); }
};

export const generateBracket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    
    await tournament.generateBracket();
    await tournament.populate('teams');
    
    res.json({ success: true, data: tournament.bracket });
  } catch (error) { next(error); }
};

export const startTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status: 'ongoing' },
      { new: true }
    ).populate('teams');
    res.json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const getTournamentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('organizer teams');
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const updateTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizer teams');
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const deleteTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (error) { next(error); }
};

export default {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  generateBracket,
  startTournament
};


