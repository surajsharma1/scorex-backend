"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Get tournament stats
router.get('/tournaments', async (req, res) => {
    try {
        const totalTournaments = await Tournament_1.default.countDocuments();
        const activeTournaments = await Tournament_1.default.countDocuments({ status: 'active' });
        const completedTournaments = await Tournament_1.default.countDocuments({ status: 'completed' });
        res.json({ totalTournaments, activeTournaments, completedTournaments });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get user stats
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