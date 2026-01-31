import express from 'express';
import {
  getBrackets,
  createBracket,
  generateBracket,
  updateBracket,
  deleteBracket,
} from '../controllers/bracketController';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', protect as any, getBrackets);
router.post('/', protect as any, createBracket);
router.post('/:id/generate', protect as any, generateBracket);
router.put('/:id', protect as any, updateBracket);
router.delete('/:id', protect as any, deleteBracket);

export default router;