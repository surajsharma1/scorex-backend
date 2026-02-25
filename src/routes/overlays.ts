import express from 'express';
import { 
  createOverlay, 
  getOverlays, 
  getOverlay, 
  updateOverlay, 
  deleteOverlay, 
  getOverlayTemplates,
  serveOverlay
} from '../controllers/overlayController';
import { protect } from '../middleware/auth'; // Changed from 'authenticate' to 'protect'

const router = express.Router();

// Public route for serving the overlay HTML (OBS/Browser Source)
// This must come BEFORE the protect middleware
router.get('/public/:id', serveOverlay);

// Protected routes (require login)
router.use(protect); // Changed from 'authenticate' to 'protect'

router.get('/', getOverlays);
router.get('/templates', async (req, res) => {
  const templates = await getOverlayTemplates();
  res.json(templates);
});
router.post('/', createOverlay);
router.get('/:id', getOverlay);
router.put('/:id', updateOverlay);
router.delete('/:id', deleteOverlay);

export default router;