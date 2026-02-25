import { Request, Response } from 'express';
import Tournament from '../models/Tournament';
import Match from '../models/Match'; // Import Match model

export const tournamentController = {
  // Public endpoint for Ticker/Carousel
  getTournaments: async (req: Request, res: Response) => {
    try {
      // 1. Get recent tournaments
      const tournaments = await Tournament.find({ deleted: false })
        .sort({ startDate: -1 })
        .limit(10)
        .lean(); // Convert to plain JS objects for modification

      // 2. Enhance with live match data if needed (Optional but "creative")
      // This is a simple implementation to get "current runs"
      const enhancedTournaments = await Promise.all(tournaments.map(async (t: any) => {
        if (t.status === 'ongoing') {
           // Find the latest ongoing match for this tournament
           const activeMatch = await Match.findOne({ 
             tournament: t._id, 
             status: 'ongoing' 
           }).select('score1 wickets1 score2 wickets2 battingTeam').sort({ updatedAt: -1 });
           
           if (activeMatch) {
             t.activeMatch = activeMatch;
           }
        }
        return t;
      }));

      res.status(200).json(enhancedTournaments);
    } catch (error: any) {
      console.error('Fetch tournaments error:', error);
      res.status(500).json({ message: 'Failed to fetch tournaments' });
    }
  },

  // ... (keep createTournament and other methods as they were)
  createTournament: async (req: Request, res: Response) => {
      try {
          const { name, startDate, endDate, format, teams } = req.body;
          // Ensure user is attached by auth middleware
          const organizer = (req as any).user ? (req as any).user._id : null; 
          
          const newTournament = await Tournament.create({
              name, startDate, endDate, format, teams, organizer, status: 'upcoming'
          });
          res.status(201).json(newTournament);
      } catch(e: any) {
          res.status(500).json({message: e.message});
      }
  }
};