import { Request, Response } from 'express';
import Tournament from '../models/Tournament';
import auditLogger from '../utils/auditLogger';

export const tournamentController = {
  // Public endpoint for Ticker/Carousel
  getTournaments: async (req: Request, res: Response) => {
    try {
      // Sort by start date, most recent first
      const tournaments = await Tournament.find({ deleted: false })
        .populate('teams')
        .sort({ startDate: -1 })
        .limit(20); // Limit to keep payload small for ticker

      res.status(200).json(tournaments);
    } catch (error: any) {
      console.error('Fetch tournaments error:', error);
      res.status(500).json({ message: 'Failed to fetch tournaments' });
    }
  },

  createTournament: async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated (middleware should handle this, but double check)
      if (!(req as any).user) {
         return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, startDate, endDate, format, teams } = req.body;
      
      const newTournament = await Tournament.create({
        name,
        startDate,
        endDate,
        format,
        teams, // Assuming array of Team IDs
        organizer: (req as any).user._id,
        status: 'upcoming' // Default status
      });

      auditLogger.logUserAction(
        (req as any).user._id,
        'CREATE_TOURNAMENT',
        'Tournament',
        newTournament._id.toString(),
        { name },
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json(newTournament);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getTournamentById: async (req: Request, res: Response) => {
    try {
      const tournament = await Tournament.findById(req.params.id)
        .populate('teams')
        .populate('matches'); // Assuming matches are linked

      if (!tournament) return res.status(404).json({ message: "Not Found" });
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ message: "Server Error" });
    }
  }
};