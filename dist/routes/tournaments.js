"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tournamentController_1 = require("../controllers/tournamentController");
const auth_1 = require("../middleware/auth");
const rateLimiters_1 = require("../utils/rateLimiters");
const router = express_1.default.Router();
// Public routes - anyone can view tournaments
router.get('/', tournamentController_1.getTournaments);
router.get('/:id', tournamentController_1.getTournament);
// Protected routes - require authentication
router.post('/', auth_1.protect, rateLimiters_1.createLimiter, tournamentController_1.createTournament);
router.put('/:id', auth_1.protect, tournamentController_1.updateTournament);
router.delete('/:id', auth_1.protect, tournamentController_1.deleteTournament);
router.post('/:id/live', auth_1.protect, tournamentController_1.goLive);
router.put('/:id/scores', auth_1.protect, tournamentController_1.updateLiveScores);
exports.default = router;
//# sourceMappingURL=tournaments.js.map