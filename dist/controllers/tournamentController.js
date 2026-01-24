"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLiveScores = exports.goLive = exports.deleteTournament = exports.updateTournament = exports.createTournament = exports.getTournament = exports.getTournaments = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const getTournaments = async (req, res) => {
    try {
        const tournaments = await Tournament_1.default.find().populate('createdBy', 'username');
        res.json(tournaments);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTournaments = getTournaments;
const getTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id).populate('createdBy', 'username');
        if (!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        res.json(tournament);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTournament = getTournament;
const createTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.create({
            ...req.body,
            createdBy: req.user?._id,
        });
        res.status(201).json(tournament);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTournament = createTournament;
const updateTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        res.json(tournament);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTournament = updateTournament;
const deleteTournament = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndDelete(req.params.id);
        if (!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        res.json({ message: 'Tournament deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTournament = deleteTournament;
const goLive = async (req, res) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, { isLive: true }, { new: true });
        if (!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        res.json(tournament);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.goLive = goLive;
const updateLiveScores = async (req, res) => {
    try {
        const { scores } = req.body;
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, { liveScores: scores }, { new: true });
        if (!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        res.json(tournament);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateLiveScores = updateLiveScores;
//# sourceMappingURL=tournamentController.js.map