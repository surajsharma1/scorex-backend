"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTournaments = exports.getMyOrganizedTournaments = exports.getTournamentMatches = exports.getTournamentStats = exports.endTournament = exports.startTournament = exports.generateBracket = exports.removeTeam = exports.addTeam = exports.deleteTournament = exports.updateTournament = exports.createTournament = exports.getTournament = exports.getFeaturedTournaments = exports.getOngoingTournaments = exports.getUpcomingTournaments = exports.getTournaments = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Team_1 = __importDefault(require("../models/Team"));
const Match_1 = __importDefault(require("../models/Match"));
// @desc    Get all tournaments
// @route   GET /api/v1/tournaments
// @access  Public
const getTournaments = async (req, res, next) => {
    try {
        const { status, type, organizer, limit = 20, page = 1 } = req.query;
        const query = { isPublic: true };
        if (status)
            query.status = status;
        if (type)
            query.type = type;
        if (organizer)
            query.organizer = new mongoose_1.default.Types.ObjectId(organizer);
        const tournaments = await Tournament_1.default.find(query)
            .populate('organizer', 'username email')
            .sort({ startDate: 1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Tournament_1.default.countDocuments(query);
        res.json({
            success: true,
            data: tournaments,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournaments = getTournaments;
// @desc    Get upcoming tournaments
// @route   GET /api/v1/tournaments/upcoming
// @access  Public
const getUpcomingTournaments = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const tournaments = await Tournament_1.default.getUpcoming(limit);
        res.json({
            success: true,
            data: tournaments
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUpcomingTournaments = getUpcomingTournaments;
// @desc    Get ongoing tournaments
// @route   GET /api/v1/tournaments/ongoing
// @access  Public
const getOngoingTournaments = async (req, res, next) => {
    try {
        const tournaments = await Tournament_1.default.getOngoing();
        res.json({
            success: true,
            data: tournaments
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOngoingTournaments = getOngoingTournaments;
// @desc    Get featured tournaments
// @route   GET /api/v1/tournaments/featured
// @access  Public
const getFeaturedTournaments = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 5;
        const tournaments = await Tournament_1.default.getFeatured(limit);
        res.json({
            success: true,
            data: tournaments
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFeaturedTournaments = getFeaturedTournaments;
// @desc    Get single tournament
// @route   GET /api/v1/tournaments/:id
// @access  Public
const getTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id)
            .populate('organizer', 'username email fullName')
            .populate('teams', 'name shortName logo players')
            .populate('matches')
            .populate('winner', 'name shortName')
            .populate('runnerUp', 'name shortName');
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        res.json({
            success: true,
            data: tournament
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournament = getTournament;
// @desc    Create tournament
// @route   POST /api/v1/tournaments
// @access  Private
const createTournament = async (req, res, next) => {
    try {
        const { name, description, logo, banner, startDate, endDate, registrationDeadline, location, locationType, address, type, format, maxTeams, minTeams, overs, rules, prize, entryFee, isPublic } = req.body;
        const tournament = await Tournament_1.default.create({
            name,
            description,
            logo,
            banner,
            organizer: req.user?.id,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
            location: location || 'TBD',
            locationType,
            address,
            type: type || 'round_robin',
            format: format || 'T20',
            maxTeams: maxTeams || 8,
            minTeams: minTeams || 4,
            overs: overs || 20,
            rules,
            prize,
            entryFee: entryFee || 0,
            isPublic: isPublic !== false,
            status: 'draft'
        });
        await tournament.populate('organizer', 'username email');
        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            data: tournament
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createTournament = createTournament;
// @desc    Update tournament
// @route   PUT /api/v1/tournaments/:id
// @access  Private (Organizer/Admin)
const updateTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        // Check ownership
        if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this tournament'
            });
        }
        const allowedUpdates = [
            'name', 'description', 'logo', 'banner', 'location', 'locationType',
            'address', 'rules', 'prize', 'entryFee', 'isPublic', 'isFeatured',
            'streamUrl', 'registrationDeadline'
        ];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                tournament[field] = req.body[field];
            }
        });
        await tournament.save();
        res.json({
            success: true,
            message: 'Tournament updated',
            data: tournament
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTournament = updateTournament;
// @desc    Delete tournament
// @route   DELETE /api/v1/tournaments/:id
// @access  Private (Organizer/Admin)
const deleteTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this tournament'
            });
        }
        tournament.status = 'cancelled';
        await tournament.save();
        res.json({
            success: true,
            message: 'Tournament cancelled'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTournament = deleteTournament;
// @desc    Add team to tournament
// @route   POST /api/v1/tournaments/:id/teams
// @access  Private
const addTeam = async (req, res, next) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        // Check if team exists
        const team = await Team_1.default.findById(teamId);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }
        await tournament.addTeam(new mongoose_1.default.Types.ObjectId(teamId));
        // Also add to team's tournaments
        if (!team.tournaments.includes(tournament._id)) {
            team.tournaments.push(tournament._id);
            await team.save();
        }
        res.json({
            success: true,
            message: 'Team added to tournament',
            data: tournament
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.addTeam = addTeam;
// @desc    Remove team from tournament
// @route   DELETE /api/v1/tournaments/:id/teams/:teamId
// @access  Private (Organizer/Admin)
const removeTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        await tournament.removeTeam(new mongoose_1.default.Types.ObjectId(teamId));
        res.json({
            success: true,
            message: 'Team removed from tournament'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.removeTeam = removeTeam;
// @desc    Generate bracket
// @route   POST /api/v1/tournaments/:id/bracket
// @access  Private (Organizer/Admin)
const generateBracket = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        if (tournament.bracketGenerated) {
            return res.status(400).json({
                success: false,
                message: 'Bracket already generated'
            });
        }
        await tournament.generateBracket();
        res.json({
            success: true,
            message: 'Bracket generated successfully',
            data: tournament
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.generateBracket = generateBracket;
// @desc    Start tournament
// @route   POST /api/v1/tournaments/:id/start
// @access  Private (Organizer/Admin)
const startTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        await tournament.startTournament();
        res.json({
            success: true,
            message: 'Tournament started',
            data: tournament
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.startTournament = startTournament;
// @desc    End tournament
// @route   POST /api/v1/tournaments/:id/end
// @access  Private (Organizer/Admin)
const endTournament = async (req, res, next) => {
    try {
        const { winnerId } = req.body;
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        if (tournament.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        await tournament.endTournament(winnerId ? new mongoose_1.default.Types.ObjectId(winnerId) : undefined);
        res.json({
            success: true,
            message: 'Tournament ended',
            data: tournament
        });
    }
    catch (error) {
        next(error);
    }
};
exports.endTournament = endTournament;
// @desc    Get tournament stats
// @route   GET /api/v1/tournaments/:id/stats
// @access  Public
const getTournamentStats = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id)
            .populate('teams', 'name shortName tournamentStats points netRunRate')
            .populate('matches');
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        // Calculate points table for round robin
        if (tournament.type === 'round_robin' || tournament.type === 'league') {
            await tournament.calculatePointsTable();
        }
        res.json({
            success: true,
            data: {
                tournament,
                pointsTable: tournament.pointsTable,
                matches: tournament.matches,
                stats: {
                    totalTeams: tournament.teams?.length || 0,
                    totalMatches: tournament.matches?.length || 0,
                    completedMatches: tournament.matches?.filter((m) => m.status === 'completed').length || 0
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournamentStats = getTournamentStats;
// @desc    Get matches for a tournament
// @route   GET /api/v1/tournaments/:id/matches
// @access  Public
const getTournamentMatches = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        // Get matches for this tournament
        const matches = await Match_1.default.find({ tournamentId: req.params.id })
            .populate('team1', 'name shortName logo')
            .populate('team2', 'name shortName logo')
            .populate('tournamentId', 'name')
            .sort({ date: -1 });
        res.json({
            success: true,
            data: matches
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournamentMatches = getTournamentMatches;
// @desc    Get my tournaments (organized by user)
// @route   GET /api/v1/tournaments/my/organized
// @access  Private
const getMyOrganizedTournaments = async (req, res, next) => {
    try {
        const tournaments = await Tournament_1.default.getByOrganizer(req.user?.id);
        res.json({
            success: true,
            data: tournaments
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyOrganizedTournaments = getMyOrganizedTournaments;
// @desc    Search tournaments
// @route   GET /api/v1/tournaments/search
// @access  Public
const searchTournaments = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }
        const tournaments = await Tournament_1.default.search(q);
        res.json({
            success: true,
            data: tournaments
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchTournaments = searchTournaments;
exports.default = {
    getTournaments: exports.getTournaments,
    getUpcomingTournaments: exports.getUpcomingTournaments,
    getOngoingTournaments: exports.getOngoingTournaments,
    getFeaturedTournaments: exports.getFeaturedTournaments,
    getTournament: exports.getTournament,
    createTournament: exports.createTournament,
    updateTournament: exports.updateTournament,
    deleteTournament: exports.deleteTournament,
    addTeam: exports.addTeam,
    removeTeam: exports.removeTeam,
    generateBracket: exports.generateBracket,
    startTournament: exports.startTournament,
    endTournament: exports.endTournament,
    getTournamentStats: exports.getTournamentStats,
    getTournamentMatches: exports.getTournamentMatches,
    getMyOrganizedTournaments: exports.getMyOrganizedTournaments,
    searchTournaments: exports.searchTournaments
};
//# sourceMappingURL=tournamentController.js.map