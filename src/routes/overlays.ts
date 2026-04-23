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

// 🔒 Adblocker evasion alias - /o/pub/:id → same serveOverlay logic
router.options('/o/pub/:id', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    serveOverlay(req, res);
  }
});
router.get('/o/pub/:id', serveOverlay);

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

// ── Broadcast trigger endpoint (called by LiveScoring so it shows in Network tab)
// The real channel is Socket.IO but this gives HTTP visibility for debugging
router.post('/trigger', protect as any, (req: any, res: any) => {
  try {
    const { matchId, trigger } = req.body;
    if (!matchId || !trigger) return res.status(400).json({ success: false, message: 'matchId and trigger required' });
    // The socket server handles the actual broadcast via manualOverlayTrigger event
    // This endpoint just acknowledges receipt
    res.json({ success: true, message: 'Trigger acknowledged', matchId, type: trigger.type });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

