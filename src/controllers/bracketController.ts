import { Request, Response } from 'express';
import Bracket from '../models/Bracket';
import Tournament from '../models/Tournament';
import { Types } from 'mongoose'; // For ObjectId

// Define interfaces to match your Bracket model schema
interface Match {
  id: string;
  team1?: Types.ObjectId;
  team2?: Types.ObjectId;
  winner?: Types.ObjectId;
  score1?: number;
  score2?: number;
  status: 'pending' | 'in-progress' | 'completed';
}

interface Round {
  roundNumber: number;
  matches: Match[];
}

export const getBrackets = async (req: Request, res: Response) => {
  try {
    const brackets = await Bracket.find({ createdBy: req.user?._id })
      .populate('tournament');
    res.json(brackets);
  } catch (error) {
    console.error('Get brackets error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};

export const createBracket = async (req: Request, res: Response) => {
  try {
    const { tournament, type, numberOfTeams } = req.body;
    const bracket = await Bracket.create({ tournament, type, numberOfTeams });
    res.status(201).json(bracket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const generateBracket = async (req: Request, res: Response) => {
  try {
    const { teams } = req.body;
    if (!teams || teams.length === 0) {
      return res.status(400).json({ message: 'Teams are required' });
    }

    const bracket = await Bracket.findById(req.params.id);
    if (!bracket) {
      return res.status(404).json({ message: 'Bracket not found' });
    }

    // Explicitly type rounds as Round[]
    const rounds: Round[] = [];
    const numRounds = Math.ceil(Math.log2(teams.length));

    for (let i = 0; i < numRounds; i++) {
      const round: Round = {
        roundNumber: i + 1,
        matches: []
      };
      const numMatches = Math.pow(2, numRounds - 1 - i);

      for (let j = 0; j < numMatches; j++) {
        const match: Match = {
          id: `${i}-${j}`, // Simple ID generation
          team1: teams[j * 2]?._id,
          team2: teams[j * 2 + 1]?._id,
          score1: 0,
          score2: 0,
          status: 'pending',
        };
        round.matches.push(match);
      }
      rounds.push(round);
    }

    bracket.rounds = rounds;
    await bracket.save();
    res.json(bracket);
  } catch (error) {
    console.error('Bracket generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBracket = async (req: Request, res: Response) => {
  try {
    const bracket = await Bracket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bracket) {
      return res.status(404).json({ message: 'Bracket not found' });
    }
    res.json(bracket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBracket = async (req: Request, res: Response) => {
  try {
    const bracket = await Bracket.findByIdAndDelete(req.params.id);
    if (!bracket) {
      return res.status(404).json({ message: 'Bracket not found' });
    }
    res.json({ message: 'Bracket deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};