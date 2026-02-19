"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBowlingLeaderboard = exports.getBattingLeaderboard = exports.getTeamLeaderboard = exports.getPlayerLeaderboard = void 0;
const User_1 = __importDefault(require("../models/User"));
const Team_1 = __importDefault(require("../models/Team"));
const getPlayerLeaderboard = async (req, res) => {
    try {
        const tournamentId = req.query.tournament;
        // Build query - filter by tournament if provided
        const query = {};
        if (tournamentId) {
            query.tournament = tournamentId;
        }
        // Get players with their stats - in a real app you'd have more sophisticated logic
        const players = await User_1.default.find({ role: { $ne: 'admin' } })
            .select('username email profilePicture')
            .limit(100);
        // Add mock stats for now (in production, calculate from Match data)
        const leaderboard = players.map((player, index) => ({
            rank: index + 1,
            user: player,
            points: Math.floor(Math.random() * 1000),
            wins: Math.floor(Math.random() * 50),
            losses: Math.floor(Math.random() * 30),
            matchesPlayed: Math.floor(Math.random() * 80)
        }));
        // Sort by points
        leaderboard.sort((a, b) => b.points - a.points);
        // Update ranks after sorting
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        res.json(leaderboard);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getPlayerLeaderboard = getPlayerLeaderboard;
const getTeamLeaderboard = async (req, res) => {
    try {
        const tournamentId = req.query.tournament;
        const query = {};
        if (tournamentId) {
            query.tournament = tournamentId;
        }
        const teams = await Team_1.default.find(query)
            .populate('players', 'username email profilePicture')
            .limit(100);
        const leaderboard = teams.map((team, index) => ({
            rank: index + 1,
            team,
            points: Math.floor(Math.random() * 1000),
            wins: Math.floor(Math.random() * 30),
            losses: Math.floor(Math.random() * 20),
            matchesPlayed: Math.floor(Math.random() * 50)
        }));
        leaderboard.sort((a, b) => b.points - a.points);
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        res.json(leaderboard);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTeamLeaderboard = getTeamLeaderboard;
const getBattingLeaderboard = async (req, res) => {
    try {
        const tournamentId = req.query.tournament;
        // Return mock batting stats for now
        const players = await User_1.default.find({ role: { $ne: 'admin' } })
            .select('username email profilePicture')
            .limit(50);
        const leaderboard = players.map((player, index) => ({
            rank: index + 1,
            player,
            runs: Math.floor(Math.random() * 500),
            average: (Math.random() * 50).toFixed(2),
            strikeRate: (Math.random() * 150 + 100).toFixed(2),
            highestScore: Math.floor(Math.random() * 150),
            centuries: Math.floor(Math.random() * 5),
            fifties: Math.floor(Math.random() * 10)
        }));
        leaderboard.sort((a, b) => b.runs - a.runs);
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        res.json(leaderboard);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBattingLeaderboard = getBattingLeaderboard;
const getBowlingLeaderboard = async (req, res) => {
    try {
        const tournamentId = req.query.tournament;
        // Return mock bowling stats for now
        const players = await User_1.default.find({ role: { $ne: 'admin' } })
            .select('username email profilePicture')
            .limit(50);
        const leaderboard = players.map((player, index) => ({
            rank: index + 1,
            player,
            wickets: Math.floor(Math.random() * 30),
            economy: (Math.random() * 8 + 4).toFixed(2),
            average: (Math.random() * 30 + 10).toFixed(2),
            bestFigure: `${Math.floor(Math.random() * 5)}/${Math.floor(Math.random() * 5)}`,
            fiveWickets: Math.floor(Math.random() * 3)
        }));
        leaderboard.sort((a, b) => b.wickets - a.wickets);
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        res.json(leaderboard);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBowlingLeaderboard = getBowlingLeaderboard;
//# sourceMappingURL=leaderboardController.js.map