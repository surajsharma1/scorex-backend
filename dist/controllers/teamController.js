"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePlayer = exports.addPlayer = exports.deleteTeam = exports.updateTeam = exports.getTeam = exports.getTeams = exports.createTeam = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Team_1 = __importDefault(require("../models/Team"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const createTeam = async (req, res, next) => {
    try {
        const { name, shortName, players, captain, tournamentId } = req.body;
        const team = await Team_1.default.create({
            name, shortName, players, captain,
            tournamentId: tournamentId ? new mongoose_1.default.Types.ObjectId(tournamentId) : undefined
        });
        if (tournamentId) {
            const tournament = await Tournament_1.default.findById(tournamentId);
            if (tournament) {
                tournament.addTeam(team._id);
            }
        }
        await team.populate('players captain', 'name');
        res.status(201).json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.createTeam = createTeam;
const getTeams = async (req, res, next) => {
    try {
        const { tournamentId, limit = 20, page = 1 } = req.query;
        const query = tournamentId ? { tournamentId } : {};
        const teams = await Team_1.default.find(query)
            .populate('players captain tournamentId', 'name shortName')
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Team_1.default.countDocuments(query);
        res.json({
            success: true,
            data: teams,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeams = getTeams;
const getTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id)
            .populate('players captain tournamentId matches', 'name shortName');
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeam = getTeam;
const updateTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('players captain');
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        await team.updateStats();
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findByIdAndDelete(req.params.id);
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        res.json({ success: true, message: 'Team deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTeam = deleteTeam;
const addPlayer = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        const playerId = new mongoose_1.default.Types.ObjectId(req.body.playerId);
        await team.addPlayer(playerId);
        await team.populate('players');
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.addPlayer = addPlayer;
const removePlayer = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        const playerId = new mongoose_1.default.Types.ObjectId(req.params.playerId);
        await team.removePlayer(playerId);
        await team.populate('players');
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.removePlayer = removePlayer;
exports.default = { createTeam: exports.createTeam, getTeams: exports.getTeams, getTeam: exports.getTeam, updateTeam: exports.updateTeam, deleteTeam: exports.deleteTeam, addPlayer: exports.addPlayer, removePlayer: exports.removePlayer };
