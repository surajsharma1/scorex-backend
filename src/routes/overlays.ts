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

router.post('/', protect as any , createOverlay);
router.get('/', protect as any , getOverlays);
router.get('/:id', protect as any , getOverlay);
router.put('/:id', protect as any , updateOverlay);
router.delete('/:id', protect as any , deleteOverlay);
router.get('/public/:id', serveOverlay); // Public route for overlays

export default router;