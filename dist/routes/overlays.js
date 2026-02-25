"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const overlayController_1 = require("../controllers/overlayController");
const auth_1 = require("../middleware/auth"); // Changed from 'authenticate' to 'protect'
const router = express_1.default.Router();
// Public route for serving the overlay HTML (OBS/Browser Source)
// This must come BEFORE the protect middleware
router.get('/public/:id', overlayController_1.serveOverlay);
// Protected routes (require login)
router.use(auth_1.protect); // Changed from 'authenticate' to 'protect'
router.get('/', overlayController_1.getOverlays);
router.get('/templates', async (req, res) => {
    const templates = await (0, overlayController_1.getOverlayTemplates)();
    res.json(templates);
});
router.post('/', overlayController_1.createOverlay);
router.get('/:id', overlayController_1.getOverlay);
router.put('/:id', overlayController_1.updateOverlay);
router.delete('/:id', overlayController_1.deleteOverlay);
exports.default = router;
//# sourceMappingURL=overlays.js.map