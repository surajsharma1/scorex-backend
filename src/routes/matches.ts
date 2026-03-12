import { Router } from 'express';
import {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  startMatch,
  addBall,
  setStriker,
  setNonStriker,
  setBowler,
  endInnings,
  endMatch,
  getLiveMatches,
  getUpcomingMatches,
  updateMatchStatus,
  setMatchOverlay
} from '../controllers/matchController';
import { protect } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getMatches);
router.get('/live', getLiveMatches);
router.get('/upcoming', getUpcomingMatches);
router.get('/:id', getMatch);

// Protected routes
router.post('/', protect, createMatch);
router.put('/:id', protect, updateMatch);
router.delete('/:id', protect, deleteMatch);

// Match setup
router.put('/:id/start', protect, startMatch);
router.post('/:id/start', protect, startMatch);   // alias: some frontends POST
router.put('/:id/toss', protect, startMatch);     // alias: toss = start
router.post('/:id/toss', protect, startMatch);    // alias

// Scoring
router.post('/:id/score', protect, addBall);

// Player management
router.put('/:id/striker', protect, setStriker);
router.put('/:id/non-striker', protect, setNonStriker);
router.put('/:id/bowler', protect, setBowler);

// Match control
router.post('/:id/end-innings', protect, endInnings);
router.post('/:id/end', protect, endMatch);
router.put('/:id/status', protect, updateMatchStatus);

// Overlay
router.put('/:id/overlay', protect, setMatchOverlay);

export default router;