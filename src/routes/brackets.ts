import express from 'express';
import {
  getBrackets,
  getBracket,
  createBracket,
  updateBracket,
  generateBracket
} from '../controllers/bracketController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(protect, getBrackets)
  .post(protect, createBracket);

router.route('/:id')
  .get(protect, getBracket)
  .put(protect, updateBracket);

router.post('/:id/generate', protect, generateBracket);

export default router;