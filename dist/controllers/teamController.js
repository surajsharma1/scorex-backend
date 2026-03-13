"use strict";
/**
 * Team Controller
 * Team and player management
 * Following PROJECT_ALGORITHM.md specifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTeams = exports.getUserTeams = exports.getTeamPlayers = exports.removePlayer = exports.addPlayer = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeam = exports.getTeams = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Team_1 = __importDefault(require("../models/Team"));
const Player_1 = __importDefault(require("../models/Player"));
// @desc    Get all teams
// @route   GET /api/v1/teams
// @access  Public
const getTeams = async (req, res, next) => {
    try {
        console.log(`[TEAMS] GET /teams - Query:`, req.query);
        const { search, owner, tournament, limit = 20, page = 1 } = req.query;
        const query = { isActive: true };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } }
            ];
        }
        if (owner)
            query.owner = owner;
        if (tournament) {
            try {
                query.tournaments = new mongoose_1.default.Types.ObjectId(tournament);
            }
            catch (e) {
                console.warn(`[TEAMS] Invalid tournament ID: ${tournament}`);
            }
        }
        const teams = await Team_1.default.find(query).lean()
            .populate('owner', 'username email')
            .populate('players')
            .sort({ points: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Team_1.default.countDocuments(query);
        console.log(`[TEAMS] Returning ${teams.length} teams (total: ${total})`);
        res.json({
            success: true,
            data: teams,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('[TEAMS] Error:', error);
        next(error);
    }
};
exports.getTeams = getTeams;
// @desc    Get single team
// @route   GET /api/v1/teams/:id
// @access  Public
const getTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id)
            .populate('owner', 'username email fullName')
            .populate('players')
            .populate('captain')
            .populate('viceCaptain')
            .populate('tournaments', 'name status');
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        res.json({
            success: true,
            data: team
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeam = getTeam;
// @desc    Create team
// @route   POST /api/v1/teams
// @access  Private
const createTeam = async (req, res, next) => {
    try {
        const { name, shortName, description, logo, tournament } = req.body;
        const team = await Team_1.default.create({
            name,
            shortName,
            description,
            logo,
            owner: req.user?.id,
            players: [],
            tournaments: tournament ? [new mongoose_1.default.Types.ObjectId(tournament)] : [],
            tournamentStats: {
                tournamentsPlayed: 0,
                tournamentsWon: 0,
                tournamentsLost: 0,
                matchesPlayed: 0,
                matchesWon: 0,
                matchesLost: 0,
                matchesTied: 0,
                matchesNoResult: 0
            },
            points: 0,
            netRunRate: 0
        });
        // If a tournament was provided, also register the team in that tournament
        if (tournament) {
            const Tournament = mongoose_1.default.model('Tournament');
            const tournamentDoc = await Tournament.findById(tournament);
            if (tournamentDoc) {
                try {
                    await tournamentDoc.addTeam(team._id);
                }
                catch (e) {
                    // addTeam throws if already registered or full — not fatal for team creation
                }
            }
        }
        await team.populate('owner', 'username email');
        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            data: team
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createTeam = createTeam;
// @desc    Update team
// @route   PUT /api/v1/teams/:id
// @access  Private (Owner/Admin)
const updateTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        // Check ownership
        if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this team'
            });
        }
        const { name, shortName, description, logo, captain, viceCaptain } = req.body;
        if (name)
            team.name = name;
        if (shortName)
            team.shortName = shortName;
        if (description)
            team.description = description;
        if (logo)
            team.logo = logo;
        if (captain)
            team.captain = captain;
        if (viceCaptain)
            team.viceCaptain = viceCaptain;
        await team.save();
        res.json({
            success: true,
            message: 'Team updated',
            data: team
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTeam = updateTeam;
// @desc    Delete team
// @route   DELETE /api/v1/teams/:id
// @access  Private (Owner/Admin)
const deleteTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this team'
            });
        }
        team.isActive = false;
        await team.save();
        res.json({
            success: true,
            message: 'Team deleted'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTeam = deleteTeam;
// @desc    Add player to team
// @route   POST /api/v1/teams/:id/players
// @access  Private (Owner/Admin)
const addPlayer = async (req, res, next) => {
    try {
        const { playerId, name, role, jerseyNumber, userId, isCaptain, isViceCaptain } = req.body;
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        let player;
        if (playerId) {
            // Adding an existing player by ID
            player = await Player_1.default.findById(playerId);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    message: 'Player not found'
                });
            }
        }
        else if (name) {
            // Creating a new player from provided data
            const roleMap = {
                'Batsman': 'batsman',
                'Bowler': 'bowler',
                'All-rounder': 'all-rounder',
                'Wicket Keeper': 'wicket-keeper',
            };
            player = await Player_1.default.create({
                name,
                role: roleMap[role] || role || 'batsman',
                jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
                userId: userId || undefined,
                teams: [team._id],
                isActive: true,
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Either playerId or player name is required'
            });
        }
        // Add player to team
        await team.addPlayer(new mongoose_1.default.Types.ObjectId(player._id));
        // Set captain/vice-captain if requested
        if (isCaptain) {
            team.captain = player._id;
        }
        if (isViceCaptain) {
            team.viceCaptain = player._id;
        }
        await team.save();
        await team.populate('players');
        res.json({
            success: true,
            message: 'Player added to team',
            data: team
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Player already in team'
            });
        }
        next(error);
    }
};
exports.addPlayer = addPlayer;
// @desc    Remove player from team
// @route   DELETE /api/v1/teams/:id/players/:playerId
// @access  Private (Owner/Admin)
const removePlayer = async (req, res, next) => {
    try {
        const { playerId } = req.params;
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        if (team.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        await team.removePlayer(new mongoose_1.default.Types.ObjectId(playerId));
        // Remove captain/vice-captain if player removed
        if (team.captain?.toString() === playerId) {
            team.captain = undefined;
        }
        if (team.viceCaptain?.toString() === playerId) {
            team.viceCaptain = undefined;
        }
        await team.save();
        res.json({
            success: true,
            message: 'Player removed from team'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.removePlayer = removePlayer;
// @desc    Get team players
// @route   GET /api/v1/teams/:id/players
// @access  Public
const getTeamPlayers = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id)
            .populate('players');
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        res.json({
            success: true,
            data: team.players
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeamPlayers = getTeamPlayers;
// @desc    Get user's teams
// @route   GET /api/v1/teams/user/:userId
// @access  Public
const getUserTeams = async (req, res, next) => {
    try {
        const teams = await Team_1.default.getByOwner(new mongoose_1.default.Types.ObjectId(req.params.userId));
        res.json({
            success: true,
            data: teams
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserTeams = getUserTeams;
// @desc    Search teams
// @route   GET /api/v1/teams/search
// @access  Public
const searchTeams = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }
        const teams = await Team_1.default.search(q);
        res.json({
            success: true,
            data: teams
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchTeams = searchTeams;
//# sourceMappingURL=teamController.js.map