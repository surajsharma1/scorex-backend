import express from 'express';
import { protect } from '../middleware/auth';
import { 
  getBrackets,
  createBracket,
  updateBracket,
  deleteBracket,
  generateBracket 
} from '../controllers/bracketController';

const router = express.Router();

router.route('/')
  .get(protect, getBrackets)
  .post(protect, createBracket);

router.route('/:id')
  .put(protect, updateBracket)
  .delete(protect, deleteBracket);

router.post('/:id/generate', protect, generateBracket);

export default router;