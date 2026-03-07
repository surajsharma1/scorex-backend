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
  getTournamentStats
} from '../controllers/matchController';

const router = Router();

// Basic CRUD routes
router.post('/', createMatch);
router.get('/', getAllMatches);
router.get('/:id', getMatchById);

// Toss and player selection routes
router.put('/:id/toss', saveToss);
router.put('/:id/players', savePlayerSelections);
router.put('/:id/bowler', changeBowler);
router.put('/:id/striker', updateStriker);
router.put('/:id/nonstriker', updateNonStriker);

// Match scoring routes
router.put('/:id/start', startMatch);
router.put('/:id/score', scoreBall);
router.put('/:id/undo', undoLastBall);

// Tournament statistics
router.get('/stats/:tournamentId', getTournamentStats);

export default router;

