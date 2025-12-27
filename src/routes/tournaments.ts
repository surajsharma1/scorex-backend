import express from 'express';
import {
  createTournament,
  getTournaments,
  getTournament,
  updateTournament,
  deleteTournament,
  goLive,
  updateLiveScores,
} from '../controllers/tournamentController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(protect, getTournaments)
  .post(protect, createTournament);

router.route('/:id')
  .get(protect, getTournament)
  .put(protect, updateTournament)
  .delete(protect, deleteTournament);

router.post('/:id/live', protect, goLive);
router.put('/:id/scores', protect, updateLiveScores);

export default router;