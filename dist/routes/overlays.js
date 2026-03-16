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
// Public route for templates (no auth needed to view available templates)
router.get('/templates', overlayController_1.getOverlayTemplates);
// Public route for membership status
router.get('/membership-status', auth_1.protect, overlayController_1.getMembershipStatus);
// Protected routes - CRUD operations
router.get('/', auth_1.protect, overlayController_1.getOverlays);
router.get('/:id', auth_1.protect, overlayController_1.getOverlay);
router.post('/', auth_1.protect, overlayController_1.createOverlay);
router.put('/:id', auth_1.protect, overlayController_1.updateOverlay);
router.delete('/:id', auth_1.protect, overlayController_1.deleteOverlay);
router.post('/:id/regenerate', auth_1.protect, overlayController_1.regenerateOverlayUrl);
exports.default = router;
