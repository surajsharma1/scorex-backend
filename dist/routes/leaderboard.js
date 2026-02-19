"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaderboardController_1 = require("../controllers/leaderboardController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All leaderboard routes require authentication
router.use(auth_1.protect);
// Get player leaderboard
router.get('/players', leaderboardController_1.getPlayerLeaderboard);
// Get team leaderboard
router.get('/teams', leaderboardController_1.getTeamLeaderboard);
// Get batting leaderboard
router.get('/batting', leaderboardController_1.getBattingLeaderboard);
// Get bowling leaderboard
router.get('/bowling', leaderboardController_1.getBowlingLeaderboard);
exports.default = router;
//# sourceMappingURL=leaderboard.js.map