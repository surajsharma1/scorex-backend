import express from 'express';
import { protect } from '../middleware/auth';
import { 
  getBrackets,  // Changed from getBracket to getBrackets
  createBracket, 
  updateBracket, 
  deleteBracket, 
  generateBracket 
} from '../controllers/bracketController';

const router = express.Router();

// Routes
router.route('/')
  .get(protect, getBrackets)  // Changed from getBracket to getBrackets
  .post(protect, createBracket);

router.route('/:id')
  .put(protect, updateBracket)
  .delete(protect, deleteBracket);

router.post('/:id/generate', protect, generateBracket);

export default router;