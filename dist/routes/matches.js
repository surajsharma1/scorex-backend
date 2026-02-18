"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes - anyone can view matches
router.get('/', matchController_1.getMatches);
router.get('/:id', matchController_1.getMatch); // Get single match for overlay data
router.get('/:id/commentary', matchController_1.getCommentary);
// Protected routes - require authentication
router.post('/', auth_1.protect, matchController_1.createMatch);
router.put('/:id', auth_1.protect, matchController_1.updateMatch);
router.put('/:id/score', auth_1.protect, matchController_1.updateMatchScore);
router.post('/:id/commentary', auth_1.protect, matchController_1.addCommentary);
router.delete('/:id', auth_1.protect, matchController_1.deleteMatch);
exports.default = router;
//# sourceMappingURL=matches.js.map