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

// Public routes - anyone can view matches
router.get('/', getMatches);
router.get('/:id/commentary', getCommentary);

// Protected routes - require authentication
router.post('/', protect as any, createMatch);
router.put('/:id', protect as any, updateMatch);
router.put('/:id/score', protect as any, updateMatchScore);
router.post('/:id/commentary', protect as any, addCommentary);
router.delete('/:id', protect as any, deleteMatch);

export default router;