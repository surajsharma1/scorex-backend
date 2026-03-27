import express from 'express';
import { 
  getOverlays, 
  getOverlay, 
  createOverlay, 
  updateOverlay, 
  deleteOverlay, 
  getOverlayTemplates,
  serveOverlay,
  getMembershipStatus,
  regenerateOverlayUrl
} from '../controllers/overlayController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public route for serving the overlay HTML (OBS/Browser Source)
router.get('/public/:id', serveOverlay);

// Protected route so we can check membership level for templates
router.get('/templates', protect as any, getOverlayTemplates);

// Public route for membership status
router.get('/membership-status', protect as any, getMembershipStatus);

// Protected routes - CRUD operations
router.get('/', protect as any, getOverlays as any);
router.get('/:id', protect as any, getOverlay as any);
router.post('/', protect as any, createOverlay as any);
router.put('/:id', protect as any, updateOverlay as any);
router.delete('/:id', protect as any, deleteOverlay as any);
router.post('/:id/regenerate-url', protect as any, regenerateOverlayUrl as any);

export default router;

