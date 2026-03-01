import express from 'express';
import { 
  createOverlay, 
  getOverlays, 
  getOverlay, 
  updateOverlay, 
  deleteOverlay, 
  getOverlayTemplates,
  serveOverlay,
  getMembershipStatus
} from '../controllers/overlayController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public route for serving the overlay HTML (OBS/Browser Source)
// This must come BEFORE the protect middleware
router.get('/public/:id', serveOverlay);

// Protected routes (require login) - using type assertion to bypass type issues
router.get('/', (req, res, next) => {
  (protect as any)(req, res, () => {
    getOverlays(req as any, res as any);
  });
});

router.get('/templates', (req, res, next) => {
  (protect as any)(req, res, () => {
    getOverlayTemplates(req as any, res as any);
  });
});

router.get('/membership-status', (req, res, next) => {
  (protect as any)(req, res, () => {
    getMembershipStatus(req as any, res as any);
  });
});

router.post('/', (req, res, next) => {
  (protect as any)(req, res, () => {
    createOverlay(req as any, res as any);
  });
});

router.get('/:id', (req, res, next) => {
  (protect as any)(req, res, () => {
    getOverlay(req as any, res as any);
  });
});

router.put('/:id', (req, res, next) => {
  (protect as any)(req, res, () => {
    updateOverlay(req as any, res as any);
  });
});

router.delete('/:id', (req, res, next) => {
  (protect as any)(req, res, () => {
    deleteOverlay(req as any, res as any);
  });
});

export default router;
