"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMatch = exports.updateMatchScore = exports.updateMatch = exports.createMatch = exports.getMatches = void 0;
const Match_1 = __importDefault(require("../models/Match"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const server_1 = require("../server"); // Fixed: Import io from server.ts
const getMatches = async (req, res) => {
    try {
        const { tournament } = req.query;
        const matches = await Match_1.default.find(tournament ? { tournament } : {}).populate('team1 team2');
        res.json(matches);
    }
    catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMatches = getMatches;
const createMatch = async (req, res) => {
    console.log('Create match request body:', req.body); // Add logging
    try {
        const { tournament, team1, team2, date, venue } = req.body;
        // Validation: Check required fields
        if (!tournament || !team1 || !team2 || !date) {
            res.status(400).json({ message: 'Missing required fields: tournament, team1, team2, date' });
            return;
        }
        // Optional: Validate ObjectIds (if using mongoose)
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(tournament) || !mongoose.Types.ObjectId.isValid(team1) || !mongoose.Types.ObjectId.isValid(team2)) {
            res.status(400).json({ message: 'Invalid ObjectId for tournament, team1, or team2' });
            return;
        }
        // Cast req to access user (assuming auth middleware sets req.user)
        const authReq = req; // Cast to any to access user
        if (!authReq.user || !authReq.user._id) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // Create the match with createdBy from authenticated user
        const matchData = { ...req.body, createdBy: authReq.user._id };
        const match = await Match_1.default.create(matchData);
        console.log('Match created successfully:', match); // Add logging
        res.status(201).json(match);
    }
    catch (error) {
        console.error('Create match error:', error); // Log the full error
        const err = error; // Cast to Error
        res.status(500).json({ message: 'Server error', details: err.message }); // Include error details for debugging
    }
};
exports.createMatch = createMatch;
const updateMatch = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (match) {
            server_1.io.emit('scoreUpdate', { matchId: match._id, match }); // Emit real-time update
        }
        res.json(match);
    }
    catch (error) {
        console.error('Update match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatch = updateMatch;
const updateMatchScore = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('team1 team2');
        if (match) {
            server_1.io.emit('scoreUpdate', { matchId: match._id, match }); // Emit real-time update
            // Update the tournament's liveScores
            const liveScores = {
                team1: {
                    name: match.team1.name || 'Team 1',
                    score: match.score1 || 0,
                    wickets: match.wickets1 || 0,
                    overs: match.overs1 || 0,
                },
                team2: {
                    name: match.team2.name || 'Team 2',
                    score: match.score2 || 0,
                    wickets: match.wickets2 || 0,
                    overs: match.overs2 || 0,
                },
                currentRunRate: 0, // Default value
                requiredRunRate: 0, // Default value
                target: 0, // Default value
                lastFiveOvers: '-', // Default value
            };
            await Tournament_1.default.findByIdAndUpdate(match.tournament, { liveScores });
        }
        res.json(match);
    }
    catch (error) {
        console.error('Update match score error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatchScore = updateMatchScore;
const deleteMatch = async (req, res) => {
    try {
        await Match_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Match deleted' });
    }
    catch (error) {
        console.error('Delete match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteMatch = deleteMatch;
//# sourceMappingURL=matchController.js.map