"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPlayer = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeams = void 0;
const Team_1 = __importDefault(require("../models/Team"));
const logger_1 = __importDefault(require("../utils/logger"));
const getTeams = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const query = req.query.tournament ? { tournament: req.query.tournament } : {};
        const total = await Team_1.default.countDocuments(query);
        const teams = await Team_1.default.find(query)
            .populate('tournament')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const result = {
            teams,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        };
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Get teams error:', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTeams = getTeams;
const createTeam = async (req, res) => {
    try {
        logger_1.default.info('Creating team:', { body: req.body, userId: req.user?._id });
        const teamData = {
            name: req.body.name,
            color: req.body.color,
            tournament: req.body.tournament,
            logo: req.file ? `/uploads/${req.file.filename}` : undefined,
            createdBy: req.user?._id, // Type assertion
        };
        const team = await Team_1.default.create(teamData);
        logger_1.default.info('Team created successfully:', { teamId: team._id });
        res.status(201).json(team);
    }
    catch (error) {
        logger_1.default.error('Team creation error:', { error: error instanceof Error ? error.message : 'Unknown error', body: req.body });
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'Server error', error: message });
    }
};
exports.createTeam = createTeam;
const updateTeam = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            logo: req.file ? `/uploads/${req.file.filename}` : undefined,
        };
        const team = await Team_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        res.json(team);
    }
    catch (error) {
        logger_1.default.error('Update team error:', { error: error instanceof Error ? error.message : 'Unknown error', teamId: req.params.id });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findByIdAndDelete(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        res.json({ message: 'Team deleted' });
    }
    catch (error) {
        logger_1.default.error('Delete team error:', { error: error instanceof Error ? error.message : 'Unknown error', teamId: req.params.id });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTeam = deleteTeam;
const addPlayer = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.teamId);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        const playerData = {
            name: req.body.name,
            role: req.body.role,
            jerseyNumber: req.body.jerseyNumber,
            ...(req.file && { image: `/uploads/${req.file.filename}` }),
        };
        team.players.push(playerData);
        await team.save();
        res.status(201).json(team);
    }
    catch (error) {
        console.error('Add player error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.addPlayer = addPlayer;
//# sourceMappingURL=teamController.js.map