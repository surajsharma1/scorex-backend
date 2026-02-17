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


const router = express.Router();

// All tournament routes now require authentication for user data separation
router.get('/', protect as any, getTournaments);
router.get('/:id', protect as any, getTournament);

// Protected routes - require authentication
router.post('/', protect as any, createLimiter, createTournament);
router.put('/:id', protect as any , updateTournament);
router.delete('/:id', protect as any , deleteTournament);
router.post('/:id/live', protect as any , goLive);
router.put('/:id/scores', protect as any , updateLiveScores);

export default router;