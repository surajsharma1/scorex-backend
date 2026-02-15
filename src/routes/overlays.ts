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

// Public routes - anyone can view overlays
router.get('/', getOverlays);
router.get('/:id', getOverlay);
router.get('/public/:id', serveOverlay); // Public route for serving overlays

// Protected routes - require authentication
router.post('/', protect as any , createOverlay);
router.put('/:id', protect as any , updateOverlay);
router.delete('/:id', protect as any , deleteOverlay);

export default router;
