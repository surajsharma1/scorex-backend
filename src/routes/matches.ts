import { Router, RequestHandler } from 'express';
import { 
  createMatch, 
  getMatchById, 
  startMatch, 
  scoreBall, 
  undoLastBall 
} from '../controllers/matchController';
import { protect } from '../middleware/auth';

const router = Router();

// Public route to view live scores
router.get('/:id', getMatchById);

// Protected Routes
router.use(protect as unknown as RequestHandler);

// Match management
router.post('/', createMatch);
router.put('/:id/start', startMatch);

// Live Scoring Engine
router.post('/:id/score', scoreBall);
router.post('/:id/undo', undoLastBall);

export default router;