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
// This must come BEFORE the protect middleware
router.get('/public/:id', overlayController_1.serveOverlay);
// Protected routes (require login) - using type assertion to bypass type issues
router.get('/', (req, res, next) => {
    auth_1.protect(req, res, () => {
        (0, overlayController_1.getOverlays)(req, res);
    });
});
router.get('/templates', (req, res, next) => {
    auth_1.protect(req, res, () => {
        (0, overlayController_1.getOverlayTemplates)(req, res);
    });
});
router.post('/', (req, res, next) => {
    auth_1.protect(req, res, () => {
        (0, overlayController_1.createOverlay)(req, res);
    });
});
router.get('/:id', (req, res, next) => {
    auth_1.protect(req, res, () => {
        (0, overlayController_1.getOverlay)(req, res);
    });
});
router.put('/:id', (req, res, next) => {
    auth_1.protect(req, res, () => {
        (0, overlayController_1.updateOverlay)(req, res);
    });
});
router.delete('/:id', (req, res, next) => {
    auth_1.protect(req, res, () => {
        (0, overlayController_1.deleteOverlay)(req, res);
    });
});
exports.default = router;
//# sourceMappingURL=overlays.js.map