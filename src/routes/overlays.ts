import express from 'express';
import {
  createOverlay,
  getOverlays,
  getOverlay,
  updateOverlay,
  deleteOverlay,
  serveOverlay,
} from '../controllers/overlayController';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// router.post('/', protect, createOverlay);
// router.get('/', protect, getOverlays);
// router.get('/:id', protect, getOverlay);
// router.put('/:id', protect, updateOverlay);
// router.delete('/:id', protect, deleteOverlay);
// router.get('/public/:id', serveOverlay); // Public route for overlays

export default router;