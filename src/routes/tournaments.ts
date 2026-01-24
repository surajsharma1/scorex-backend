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

const router = express.Router();

router.get('/', protect, getTournaments);
router.get('/:id', protect, getTournament);
router.post('/', protect, createTournament);
router.put('/:id', protect, updateTournament);
router.delete('/:id', protect, deleteTournament);
router.post('/:id/live', protect, goLive);
router.put('/:id/scores', protect, updateLiveScores);

export default router;