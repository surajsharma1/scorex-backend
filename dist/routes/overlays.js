"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const overlayController_1 = require("../controllers/overlayController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public route for serving the overlay HTML (OBS/Browser Source)
router.get('/public/:id', overlayController_1.serveOverlay);
// 🔒 Adblocker evasion alias - /o/pub/:id → same serveOverlay logic
router.options('/o/pub/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        (0, overlayController_1.serveOverlay)(req, res);
    }
});
router.get('/o/pub/:id', overlayController_1.serveOverlay);
// Protected route so we can check membership level for templates
router.get('/templates', auth_1.protect, overlayController_1.getOverlayTemplates);
// Public route for membership status
router.get('/membership-status', auth_1.protect, overlayController_1.getMembershipStatus);
// Protected routes - CRUD operations
router.get('/', auth_1.protect, overlayController_1.getOverlays);
router.get('/:id', auth_1.protect, overlayController_1.getOverlay);
router.post('/', auth_1.protect, overlayController_1.createOverlay);
router.put('/:id', auth_1.protect, overlayController_1.updateOverlay);
router.delete('/:id', auth_1.protect, overlayController_1.deleteOverlay);
router.post('/:id/regenerate-url', auth_1.protect, overlayController_1.regenerateOverlayUrl);
// ── Broadcast trigger endpoint (called by LiveScoring so it shows in Network tab)
// The real channel is Socket.IO but this gives HTTP visibility for debugging
router.post('/trigger', auth_1.protect, (req, res) => {
    try {
        const { matchId, trigger } = req.body;
        if (!matchId || !trigger)
            return res.status(400).json({ success: false, message: 'matchId and trigger required' });
        // The socket server handles the actual broadcast via manualOverlayTrigger event
        // This endpoint just acknowledges receipt
        res.json({ success: true, message: 'Trigger acknowledged', matchId, type: trigger.type });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
