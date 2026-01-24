import express from 'express';
import {
  getBrackets,
  createBracket,
  generateBracket,
  updateBracket,
  deleteBracket,
} from '../controllers/bracketController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/', protect, getBrackets);
router.post('/', protect, createBracket);
router.post('/:id/generate', protect, generateBracket);
router.put('/:id', protect, updateBracket);
router.delete('/:id', protect, deleteBracket);

export default router;