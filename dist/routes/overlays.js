"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const overlayController_1 = require("../controllers/overlayController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes - anyone can view overlays
router.get('/public/:id', overlayController_1.serveOverlay); // Public route for serving overlays
// Protected routes - require authentication (must come before :id routes)
router.get('/', auth_1.protect, overlayController_1.getOverlays);
router.get('/:id', auth_1.protect, overlayController_1.getOverlay);
// Protected routes - require authentication
router.post('/', auth_1.protect, overlayController_1.createOverlay);
router.put('/:id', auth_1.protect, overlayController_1.updateOverlay);
router.delete('/:id', auth_1.protect, overlayController_1.deleteOverlay);
exports.default = router;
//# sourceMappingURL=overlays.js.map