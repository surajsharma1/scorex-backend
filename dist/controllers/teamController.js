"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPlayer = exports.deleteTeam = exports.updateTeam = exports.getTeams = exports.createTeam = void 0;
const Team_1 = __importDefault(require("../models/Team"));
const createTeam = async (req, res) => {
    try {
        console.log('Creating team:', req.body);
        const teamData = {
            name: req.body.name,
            color: req.body.color,
            tournament: req.body.tournament,
            logo: req.file ? `/uploads/${req.file.filename}` : undefined,
            createdBy: req.user?._id,
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
const getTeams = async (req, res) => {
    try {
        const teams = await Team_1.default.find({ createdBy: req.user?._id })
            .populate('tournament')
            .populate('players');
        res.json(teams);
    }
    catch (error) {
        console.error('Get teams error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'Server error', error: message });
    }
};
exports.getTeams = getTeams;
const updateTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.json(team);
    }
    catch (error) {
        console.error('Update team error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'Server error', error: message });
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findByIdAndDelete(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.json({ message: 'Team deleted' });
    }
    catch (error) {
        console.error('Delete team error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'Server error', error: message });
    }
};
exports.deleteTeam = deleteTeam;
const addPlayer = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        const playerData = {
            name: req.body.name,
            role: req.body.role,
            jerseyNumber: req.body.jerseyNumber,
            image: req.file ? `/uploads/${req.file.filename}` : undefined,
        };
        team.players.push(playerData);
        await team.save();
        res.status(201).json(team);
    }
    catch (error) {
        console.error('Add player error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'Server error', error: message });
    }
};
exports.addPlayer = addPlayer;
//# sourceMappingURL=teamController.js.map