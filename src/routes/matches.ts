import { Router, Request, Response, RequestHandler } from 'express';
import { 
  createMatch, 
  getMatchById,
  getAllMatches,
  deleteMatch,
  startMatch, 
  scoreBall, 
  undoLastBall,
  saveToss,
  savePlayerSelections,
  changeBowler,
  updateStriker,
  updateNonStriker,
  getTournamentStats
} from '../controllers/matchController';
import { protect } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

// Middleware to validate MongoDB ObjectId
const validateMatchId = (req: Request, res: Response, next: any) => {
  const { id } = req.params;
  
  // Check if ID is undefined, null, or the string "undefined"
  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ 
      success: false, 
      message: 'Match ID is required and cannot be undefined' 
    });
  }
  
  // Check if ID is a valid MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid Match ID format' 
    });
  }
  
  next();
};

// Public route to view all matches (supports filtering via query params)
router.get('/', getAllMatches);

// Public route to view live scores - with ID validation
router.get('/:id', validateMatchId, getMatchById);

// Protected Routes
router.use(protect as unknown as RequestHandler);

// Match management
router.post('/', createMatch);
router.delete('/:id', validateMatchId, deleteMatch);
router.put('/:id/start', validateMatchId, startMatch);

// Live Scoring Engine - ball-by-ball scoring
router.post('/:id/score', validateMatchId, scoreBall);
router.post('/:id/undo', validateMatchId, undoLastBall);

// New endpoints for enhanced live scoring
router.put('/:id/toss', validateMatchId, saveToss);
router.put('/:id/players', validateMatchId, savePlayerSelections);
router.put('/:id/bowler', validateMatchId, changeBowler);
router.put('/:id/striker', validateMatchId, updateStriker);
router.put('/:id/nonstriker', validateMatchId, updateNonStriker);

// Tournament statistics
router.get('/stats/:tournamentId', getTournamentStats);

export default router;
