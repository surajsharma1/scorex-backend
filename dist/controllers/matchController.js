"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMatchScore = exports.deleteMatch = exports.updateMatch = exports.createMatch = exports.getMatches = void 0;
const Match_1 = __importDefault(require("../models/Match"));
const server_1 = require("../server");
const Notification_1 = __importDefault(require("../models/Notification"));
const getMatches = async (req, res) => {
    try {
        const query = req.query.tournament ? { tournament: req.query.tournament } : {};
        const matches = await Match_1.default.find(query)
            .populate('tournament', 'name')
            .populate('team1', 'name')
            .populate('team2', 'name')
            .populate('winner', 'name');
        res.json(matches);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMatches = getMatches;
const createMatch = async (req, res) => {
    try {
        const match = await Match_1.default.create({
            ...req.body,
            createdBy: req.user?._id,
        });
        res.status(201).json(match);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createMatch = createMatch;
const updateMatch = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        res.json(match);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatch = updateMatch;
const deleteMatch = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndDelete(req.params.id);
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        res.json({ message: 'Match deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteMatch = deleteMatch;
const updateMatchScore = async (req, res) => {
    try {
        const { score1, score2, wickets1, wickets2, overs1, overs2, status, winner } = req.body;
        const updateData = {};
        if (score1 !== undefined)
            updateData.score1 = score1;
        if (score2 !== undefined)
            updateData.score2 = score2;
        if (wickets1 !== undefined)
            updateData.wickets1 = wickets1;
        if (wickets2 !== undefined)
            updateData.wickets2 = wickets2;
        if (overs1 !== undefined)
            updateData.overs1 = overs1;
        if (overs2 !== undefined)
            updateData.overs2 = overs2;
        if (status)
            updateData.status = status;
        if (winner)
            updateData.winner = winner;
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('team1', 'name')
            .populate('team2', 'name')
            .populate('winner', 'name');
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        // Emit real-time update
        server_1.io.emit('scoreUpdate', { matchId: match._id, match });
        // Create notification (ensure teams are populated)
        const populatedMatch = await Match_1.default.findById(match._id).populate('team1', 'name').populate('team2', 'name');
        if (populatedMatch && req.user) {
            await Notification_1.default.create({
                user: req.user._id,
                message: `Score updated for match: ${populatedMatch.team1.name} vs ${populatedMatch.team2.name}`,
                type: 'info',
            });
        }
        res.json(match);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatchScore = updateMatchScore;
//# sourceMappingURL=matchController.js.map