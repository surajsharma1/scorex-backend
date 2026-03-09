"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaderboardController_1 = require("../controllers/leaderboardController");
const router = express_1.default.Router();
// Public routes - leaderboard is public
router.get('/', leaderboardController_1.getGlobalLeaderboard);
router.get('/global', leaderboardController_1.getGlobalLeaderboard);
router.get('/tournament/:id', leaderboardController_1.getTournamentLeaderboard);
router.get('/match/:id', leaderboardController_1.getMatchLeaderboard);
router.get('/orange-cap', leaderboardController_1.getOrangeCap);
router.get('/purple-cap', leaderboardController_1.getPurpleCap);
exports.default = router;
//# sourceMappingURL=leaderboard.js.map