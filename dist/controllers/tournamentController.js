"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLiveScores = exports.goLive = exports.deleteTournament = exports.updateTournament = exports.createTournament = exports.getTournament = exports.getTournaments = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
// Public endpoint for Ticker/Carousel
const getTournaments = async (req, res) => {
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
        // Return in format expected by frontend: { tournaments: [...] }
        res.status(200).json({ tournaments: enhancedTournaments });
    }
    catch (error) {
        console.error('Fetch tournaments error:', error);
        res.status(500).json({ message: 'Failed to fetch tournaments' });
    }
};
exports.getTournaments = getTournaments;
const getTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await Tournament_1.default.findById(id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json(tournament);
    }
    catch (error) {
        console.error('Fetch tournament error:', error);
        res.status(500).json({ message: 'Failed to fetch tournament' });
    }
};
exports.getTournament = getTournament;
const createTournament = async (req, res) => {
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
};
exports.createTournament = createTournament;
const updateTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const tournament = await Tournament_1.default.findByIdAndUpdate(id, updates, { new: true });
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json(tournament);
    }
    catch (error) {
        console.error('Update tournament error:', error);
        res.status(500).json({ message: 'Failed to update tournament' });
    }
};
exports.updateTournament = updateTournament;
const deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await Tournament_1.default.findByIdAndUpdate(id, { deleted: true }, { new: true });
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json({ message: 'Tournament deleted successfully' });
    }
    catch (error) {
        console.error('Delete tournament error:', error);
        res.status(500).json({ message: 'Failed to delete tournament' });
    }
};
exports.deleteTournament = deleteTournament;
const goLive = async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await Tournament_1.default.findByIdAndUpdate(id, { status: 'ongoing' }, { new: true });
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json(tournament);
    }
    catch (error) {
        console.error('Go live error:', error);
        res.status(500).json({ message: 'Failed to start tournament' });
    }
};
exports.goLive = goLive;
const updateLiveScores = async (req, res) => {
    try {
        const { id } = req.params;
        const { scores } = req.body;
        const tournament = await Tournament_1.default.findByIdAndUpdate(id, { liveScores: scores }, { new: true });
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json(tournament);
    }
    catch (error) {
        console.error('Update live scores error:', error);
        res.status(500).json({ message: 'Failed to update live scores' });
    }
};
exports.updateLiveScores = updateLiveScores;
//# sourceMappingURL=tournamentController.js.map