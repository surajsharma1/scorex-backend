import express from 'express';
import {
  getMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  updateMatchScore,
  addCommentary,
  getCommentary,
} from '../controllers/matchController';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', protect as any, getMatches);
router.post('/', protect as any, createMatch);
router.put('/:id', protect as any, updateMatch);
router.put('/:id/score', protect as any, updateMatchScore);
router.post('/:id/commentary', protect as any, addCommentary);
router.get('/:id/commentary', protect as any, getCommentary);
router.delete('/:id', protect as any, deleteMatch);

export default router;