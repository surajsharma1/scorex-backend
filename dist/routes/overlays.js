"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const overlayController_1 = require("../controllers/overlayController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.route('/')
    .get(auth_1.protect, overlayController_1.getOverlays)
    .post(auth_1.protect, overlayController_1.createOverlay);
router.route('/:id')
    .get(auth_1.protect, overlayController_1.getOverlay)
    .put(auth_1.protect, overlayController_1.updateOverlay)
    .delete(auth_1.protect, overlayController_1.deleteOverlay);
exports.default = router;
//# sourceMappingURL=overlays.js.map