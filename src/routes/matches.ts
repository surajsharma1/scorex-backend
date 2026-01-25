import express from 'express';
import {
  getMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  updateMatchScore,
} from '../controllers/matchController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/', protect, getMatches);
router.post('/', protect, createMatch);
router.put('/:id', protect, updateMatch);
router.put('/:id/score', protect, updateMatchScore);
router.delete('/:id', protect, deleteMatch);

export default router;