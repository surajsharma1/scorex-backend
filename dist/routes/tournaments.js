"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tournamentController_1 = require("../controllers/tournamentController");
const auth_1 = require("../middleware/auth");
const rateLimiters_1 = require("../utils/rateLimiters");
const Tournament_1 = __importDefault(require("../models/Tournament"));
const router = express_1.default.Router();
// All tournament routes now require authentication for user data separation
router.get('/', auth_1.protect, tournamentController_1.getTournaments);
router.get('/:id', auth_1.protect, tournamentController_1.getTournament);
// Stats endpoint - returns tournament statistics
router.get('/stats', auth_1.protect, async (req, res) => {
    try {
        const stats = await Tournament_1.default.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        const result = {
            totalTournaments: stats.reduce((sum, stat) => sum + stat.count, 0),
            activeTournaments: stats.find(stat => stat._id === 'active')?.count || 0,
            completedTournaments: stats.find(stat => stat._id === 'completed')?.count || 0,
            upcomingTournaments: stats.find(stat => stat._id === 'upcoming')?.count || 0,
        };
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Protected routes - require authentication
router.post('/', auth_1.protect, rateLimiters_1.createLimiter, tournamentController_1.createTournament);
router.put('/:id', auth_1.protect, tournamentController_1.updateTournament);
router.delete('/:id', auth_1.protect, tournamentController_1.deleteTournament);
router.post('/:id/live', auth_1.protect, tournamentController_1.goLive);
router.put('/:id/scores', auth_1.protect, tournamentController_1.updateLiveScores);
exports.default = router;
//# sourceMappingURL=tournaments.js.map