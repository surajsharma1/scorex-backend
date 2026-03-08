import { Router, Request, Response, NextFunction } from 'express';
import {
  createMatch,
  getMatchById,
  getAllMatches,
  startMatch,
  scoreBall,
  undoLastBall,
  saveToss,
  savePlayerSelections,
  changeBowler,
  updateStriker,
  updateNonStriker,
  deleteMatch,
  getTournamentStats
} from '../controllers/matchController';
import { protect } from '../middleware/auth';

const router = Router();

// Public routes - view matches
router.get('/', getAllMatches);
router.get('/stats/:tournamentId', getTournamentStats);
router.get('/:id', getMatchById);

// Protected routes - create/modify matches
router.post('/', protect as any, createMatch);
router.delete('/:id', protect as any, deleteMatch);

// Match setup and scoring
router.put('/:id/toss', protect as any, saveToss);
router.put('/:id/players', protect as any, savePlayerSelections);
router.put('/:id/start', protect as any, startMatch);
router.put('/:id/score', protect as any, scoreBall);
router.put('/:id/undo', protect as any, undoLastBall);

// Player management during match
router.put('/:id/bowler', protect as any, changeBowler);
router.put('/:id/striker', protect as any, updateStriker);
router.put('/:id/nonstriker', protect as any, updateNonStriker);

export default router;

