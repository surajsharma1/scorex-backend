"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMatch = exports.updateMatchScore = exports.updateMatch = exports.createMatch = exports.getMatches = void 0;
const Match_1 = __importDefault(require("../models/Match"));
const server_1 = require("../server"); // Fixed: Import io from server.ts
const getMatches = async (req, res) => {
    try {
        const { tournament } = req.query;
        const matches = await Match_1.default.find(tournament ? { tournament } : {}).populate('team1 team2');
        res.json(matches);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMatches = getMatches;
const createMatch = async (req, res) => {
    try {
        const match = await Match_1.default.create(req.body);
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
        if (match) {
            server_1.io.emit('scoreUpdate', { matchId: match._id, match }); // Emit real-time update
        }
        res.json(match);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatch = updateMatch;
const updateMatchScore = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (match) {
            server_1.io.emit('scoreUpdate', { matchId: match._id, match }); // Emit real-time update
        }
        res.json(match);
    }
    catch (error) {
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
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteMatch = deleteMatch;
//# sourceMappingURL=matchController.js.map