/**
 * Bracket Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. getBrackets/createBracket used (req as any).user?._id — middleware sets req.user.id
 */

import { Request, Response } from 'express';
import Bracket from '../models/Bracket';

interface AuthRequest extends Request { user?: any; }

export const getBrackets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: was (req as any).user?._id — auth middleware sets req.user.id (string)
    let brackets = await Bracket.find({ createdBy: req.user?.id });
    try {
      brackets = await Bracket.populate(brackets, { path: 'tournament', strictPopulate: false });
    } catch {
      // Populate failure is non-fatal — return brackets without tournament data
    }
    res.json({ success: true, data: brackets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createBracket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tournament, type, numberOfTeams } = req.body;
    const bracket = await Bracket.create({
      tournament, type, numberOfTeams, rounds: [],
      createdBy: req.user?.id, // FIX: was (req as any).user?._id
    });
    res.status(201).json({ success: true, data: bracket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

function generateRounds(teams: any[], numberOfTeams: number) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5).slice(0, numberOfTeams);
  const rounds = [];
  let current = shuffled;
  while (current.length > 1) {
    const matches = [];
    for (let i = 0; i < current.length; i += 2) {
      matches.push({ team1: current[i], team2: current[i + 1] || null, score1: 0, score2: 0 });
    }
    rounds.push({ matches });
    current = new Array(Math.ceil(current.length / 2)).fill(null).map(() => ({ name: 'TBD' }));
  }
  return rounds;
}

export const generateBracket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findById(req.params.id);
    if (!bracket) { res.status(404).json({ success: false, message: 'Bracket not found' }); return; }
    const rounds = generateRounds(req.body.teams || [], (bracket as any).numberOfTeams || 8);
    const updated = await Bracket.findByIdAndUpdate(req.params.id, { rounds }, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBracket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bracket) { res.status(404).json({ success: false, message: 'Bracket not found' }); return; }
    res.json({ success: true, data: bracket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBracket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findByIdAndDelete(req.params.id);
    if (!bracket) { res.status(404).json({ success: false, message: 'Bracket not found' }); return; }
    res.json({ success: true, message: 'Bracket deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
