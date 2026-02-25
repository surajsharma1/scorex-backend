"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentController = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match")); // Import Match model
exports.tournamentController = {
    // Public endpoint for Ticker/Carousel
    getTournaments: async (req, res) => {
        try {
            // 1. Get recent tournaments
            const tournaments = await Tournament_1.default.find({ deleted: false })
                .sort({ startDate: -1 })
                .limit(10)
                .lean(); // Convert to plain JS objects for modification
            // 2. Enhance with live match data if needed (Optional but "creative")
            // This is a simple implementation to get "current runs"
            const enhancedTournaments = await Promise.all(tournaments.map(async (t) => {
                if (t.status === 'ongoing') {
                    // Find the latest ongoing match for this tournament
                    const activeMatch = await Match_1.default.findOne({
                        tournament: t._id,
                        status: 'ongoing'
                    }).select('score1 wickets1 score2 wickets2 battingTeam').sort({ updatedAt: -1 });
                    if (activeMatch) {
                        t.activeMatch = activeMatch;
                    }
                }
                return t;
            }));
            res.status(200).json(enhancedTournaments);
        }
        catch (error) {
            console.error('Fetch tournaments error:', error);
            res.status(500).json({ message: 'Failed to fetch tournaments' });
        }
    },
    // ... (keep createTournament and other methods as they were)
    createTournament: async (req, res) => {
        try {
            const { name, startDate, endDate, format, teams } = req.body;
            // Ensure user is attached by auth middleware
            const organizer = req.user ? req.user._id : null;
            const newTournament = await Tournament_1.default.create({
                name, startDate, endDate, format, teams, organizer, status: 'upcoming'
            });
            res.status(201).json(newTournament);
        }
        catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
};
//# sourceMappingURL=tournamentController.js.map