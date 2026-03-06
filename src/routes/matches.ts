import { Router, RequestHandler } from 'express';
import { 
  createMatch, 
  getMatchById,
  getAllMatches,
  startMatch, 
  scoreBall, 
  undoLastBall,
  updateMatchScore
} from '../controllers/matchController';
import { protect } from '../middleware/auth';

const router = Router();

// Public route to view all matches (supports filtering via query params)
router.get('/', getAllMatches);

// Public route to view live scores
router.get('/:id', getMatchById);

// Protected Routes
router.use(protect as unknown as RequestHandler);

// Match management
router.post('/', createMatch);
router.put('/:id/start', startMatch);

// Live Scoring Engine
// PUT for simple score updates (used by TournamentDetail/ScoreboardUpdate)
router.put('/:id/score', updateMatchScore);
// POST for ball-by-ball scoring (used by LiveScoring)
router.post('/:id/score', scoreBall);
router.post('/:id/undo', undoLastBall);

export default router;
