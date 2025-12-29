"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLiveScores = exports.goLive = exports.deleteTournament = exports.updateTournament = exports.getTournament = exports.getTournaments = exports.createTournament = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const createTournament = async (req, res) => {
    try {
        const tournamentData = {
            ...req.body,
            createdBy: req.user?._id,
        };
        const tournament = await Tournament_1.default.create(tournamentData);
        res.status(201).json(tournament);
    }
    catch (error) {
        console.error('Tournament creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTournament = createTournament;
const getTournaments = async (req, res) => {
    try {
        const tournaments = await Tournament_1.default.find({ createdBy: req.user?._id })
            .sort({ createdAt: -1 });
        res.json(tournaments);
    }
    catch (error) {
        console.error('Get tournaments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTournaments = getTournaments;
const getTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.json(tournament);
    }
    catch (error) {
        console.error('Get tournament error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTournament = getTournament;
const updateTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.json(tournament);
    }
    catch (error) {
        console.error('Update tournament error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTournament = updateTournament;
const deleteTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndDelete(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.json({ message: 'Tournament deleted' });
    }
    catch (error) {
        console.error('Delete tournament error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTournament = deleteTournament;
const goLive = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        tournament.isLive = !tournament.isLive;
        tournament.status = tournament.isLive ? 'active' : 'upcoming';
        await tournament.save();
        res.json(tournament);
    }
    catch (error) {
        console.error('Go live error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.goLive = goLive;
const updateLiveScores = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        tournament.liveScores = {
            ...tournament.liveScores,
            ...req.body,
        };
        await tournament.save();
        res.json(tournament);
    }
    catch (error) {
        console.error('Update live scores error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateLiveScores = updateLiveScores;
//# sourceMappingURL=tournamentController.js.map