import { Request, Response } from 'express';
import Bracket from '../models/Bracket';
import Tournament from '../models/Tournament';

export const getBrackets = async (req: Request, res: Response): Promise<void> => {
  try {
    let brackets = await Bracket.find({ createdBy: (req as any).user?._id });
    
    // Try to populate tournament, but don't fail if it doesn't work
    try {
      brackets = await Bracket.populate(brackets, { 
        path: 'tournament',
        strictPopulate: false 
      });
    } catch (populateError) {
      console.warn('Bracket tournament populate warning:', populateError);
      // Return brackets without populated tournament data
    }
    
    res.json(brackets);
  } catch (error) {
    console.error('Get brackets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournament, type, numberOfTeams } = req.body;
    const bracket = await Bracket.create({
      tournament,
      type,
      numberOfTeams,
      rounds: [],
      createdBy: (req as any).user?._id,  // Type assertion
    });
    res.status(201).json(bracket);
  } catch (error) {
    console.error('Create bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

function generateRounds(teams: any[], numberOfTeams: number) {
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const rounds = [];
  let currentTeams = shuffledTeams.slice(0, numberOfTeams);
  while (currentTeams.length > 1) {
    const matches = [];
    for (let i = 0; i < currentTeams.length; i += 2) {
      matches.push({
        team1: currentTeams[i],
        team2: currentTeams[i + 1] || null,
        score1: 0,
        score2: 0,
      });
    }
    rounds.push({ matches });
    // For next round, placeholders
    currentTeams = new Array(Math.ceil(currentTeams.length / 2)).fill(null).map(() => ({ name: 'TBD' }));
  }
  return rounds;
}

export const generateBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teams } = req.body;
    const bracket = await Bracket.findById(req.params.id);
    if (!bracket) {
      res.status(404).json({ message: 'Bracket not found' });
      return;
    }
    const numberOfTeams = (bracket as any).numberOfTeams || 8;
    const rounds = generateRounds(teams, numberOfTeams);
    const updatedBracket = await Bracket.findByIdAndUpdate(
      req.params.id,
      { rounds },
      { new: true }
    );
    res.json(updatedBracket);
  } catch (error) {
    console.error('Generate bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bracket) {
      res.status(404).json({ message: 'Bracket not found' });
      return;
    }
    res.json(bracket);
  } catch (error) {
    console.error('Update bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const bracket = await Bracket.findByIdAndDelete(req.params.id);
    if (!bracket) {
      res.status(404).json({ message: 'Bracket not found' });
      return;
    }
    res.json({ message: 'Bracket deleted' });
  } catch (error) {
    console.error('Delete bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};