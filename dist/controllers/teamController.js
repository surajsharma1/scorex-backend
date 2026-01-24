"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPlayer = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeams = void 0;
const Team_1 = __importDefault(require("../models/Team"));
const getTeams = async (req, res) => {
    try {
        const query = req.query.tournament ? { tournament: req.query.tournament } : {};
        const teams = await Team_1.default.find(query).populate('tournament');
        res.json(teams);
    }
    catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTeams = getTeams;
const createTeam = async (req, res) => {
    try {
        console.log('Creating team:', req.body);
        const teamData = {
            name: req.body.name,
            color: req.body.color,
            tournament: req.body.tournament,
            logo: req.file ? `/uploads/${req.file.filename}` : undefined,
            createdBy: req.user?._id, // Type assertion
        };
        const team = await Team_1.default.create(teamData);
        console.log('Team created:', team);
        res.status(201).json(team);
    }
    catch (error) {
        console.error('Team creation error:', error);
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
        console.error('Update team error:', error);
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
        console.error('Delete team error:', error);
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