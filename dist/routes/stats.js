"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
router.get('/tournaments', async (req, res) => {
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
router.get('/users', async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const adminUsers = await User_1.default.countDocuments({ role: 'admin' });
        const organizerUsers = await User_1.default.countDocuments({ role: 'organizer' });
        res.json({ totalUsers, adminUsers, organizerUsers });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=stats.js.map