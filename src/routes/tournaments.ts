import express from 'express';
import {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  goLive,
  updateLiveScores,
} from '../controllers/tournamentController';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { createLimiter } from '../utils/rateLimiters';
import Tournament from '../models/Tournament';


const router = express.Router();

// All tournament routes now require authentication for user data separation
router.get('/', protect as any, getTournaments);
router.get('/:id', protect as any, getTournament);

// Stats endpoint - returns tournament statistics
router.get('/stats', protect as any, async (req, res) => {
  try {
    const stats = await Tournament.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalTournaments: stats.reduce((sum, stat) => sum + stat.count, 0),
      activeTournaments: stats.find(stat => stat._id === 'active')?.count || 0,
      completedTournaments: stats.find(stat => stat._id === 'completed')?.count || 0,
      upcomingTournaments: stats.find(stat => stat._id === 'upcoming')?.count || 0,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected routes - require authentication
router.post('/', protect as any, createLimiter, createTournament);
router.put('/:id', protect as any , updateTournament);
router.delete('/:id', protect as any , deleteTournament);
router.post('/:id/live', protect as any , goLive);
router.put('/:id/scores', protect as any , updateLiveScores);

export default router;

