"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTournamentMatches = exports.deleteTournament = exports.generateFixtures = exports.addTeamToTournament = exports.getTournamentById = exports.getTournaments = exports.createTournament = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
const logger_1 = __importDefault(require("../utils/logger"));
// Create a new tournament
const createTournament = async (req, res, next) => {
    try {
        logger_1.default.info('Creating tournament:', { body: req.body, userId: req.user?._id });
        // Handle undefined body - this shouldn't happen but has been observed in production
        if (!req.body) {
            logger_1.default.error('Request body is undefined! This indicates a body parser issue.');
            return res.status(400).json({
                success: false,
                message: 'Invalid request: body is missing. Please ensure Content-Type is application/json'
            });
        }
        // Extract all possible fields from frontend and backend formats
        const { name, description, organizer, startDate, endDate, location, locationType, type, format, teams } = req.body;
        // Validate name is provided (only required field)
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tournament name is required'
            });
        }
        // Safely extract the user ID using 'any' casting
        const userId = req.user?._id || req.user?.id;
        // Provide defaults for required fields if not provided
        const tournamentData = {
            name,
            organizer: organizer || 'Unknown Organizer', // Default organizer
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || startDate || new Date().toISOString(),
            location: location || 'TBD', // Default location
            locationType: locationType || 'Outdoor', // Default location type
            type: type || 'League', // Default tournament type
            createdBy: userId,
            // Optional fields
            ...(description && { description }),
            teams: teams || [], // Frontend can pass team IDs
        };
        const tournament = await Tournament_1.default.create(tournamentData);
        logger_1.default.info('Tournament created successfully:', { tournamentId: tournament._id });
        res.status(201).json({ success: true, data: tournament });
    }
    catch (error) {
        logger_1.default.error('Create tournament error:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        next(error);
    }
};
exports.createTournament = createTournament;
// Get all tournaments
const getTournaments = async (req, res, next) => {
    try {
        // Check if database is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            logger_1.default.error('Database not connected:', { readyState: mongoose.connection.readyState });
            return res.status(503).json({
                success: false,
                message: 'Database unavailable. Please try again later.',
                code: 'DB_NOT_CONNECTED'
            });
        }
        const tournaments = await Tournament_1.default.find()
            .populate('teams', 'name logo color')
            .sort({ createdAt: -1 })
            .catch(populateError => {
            logger_1.default.warn('Teams populate failed, returning tournaments without teams:', { error: populateError });
            return Tournament_1.default.find().sort({ createdAt: -1 });
        });
        res.status(200).json({ success: true, count: tournaments.length, data: tournaments });
    }
    catch (error) {
        logger_1.default.error('Get tournaments error:', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getTournaments = getTournaments;
// Get single tournament
const getTournamentById = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id)
            .populate('teams')
            .populate({ path: 'matches', select: 'matchName teamA teamB matchDate status format' });
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        res.status(200).json({ success: true, data: tournament });
    }
    catch (error) {
        logger_1.default.error('Get tournament by ID error:', { error: error.message, stack: error.stack, tournamentId: req.params.id });
        next(error);
    }
};
exports.getTournamentById = getTournamentById;
// Add Team
const addTeamToTournament = async (req, res, next) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (tournament.teams.includes(teamId)) {
            return res.status(400).json({ success: false, message: 'Team already in tournament' });
        }
        tournament.teams.push(teamId);
        await tournament.save();
        res.status(200).json({ success: true, data: tournament });
    }
    catch (error) {
        logger_1.default.error('Add team to tournament error:', { error: error.message, stack: error.stack });
        next(error);
    }
};
exports.addTeamToTournament = addTeamToTournament;
// Auto-generate Fixtures
const generateFixtures = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id).populate('teams');
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (tournament.teams.length < 2)
            return res.status(400).json({ success: false, message: 'Need at least 2 teams' });
        const matchesToCreate = [];
        const teams = tournament.teams;
        const userId = req.user?._id || req.user?.id;
        if (tournament.type === 'Round Robin') {
            let matchCount = 1;
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    matchesToCreate.push({
                        tournamentId: tournament._id,
                        matchName: `Match ${matchCount}`,
                        teamA: teams[i]._id,
                        teamB: teams[j]._id,
                        venue: tournament.location,
                        matchDate: tournament.startDate,
                        format: 'T20',
                        maxOvers: 20,
                        createdBy: userId
                    });
                    matchCount++;
                }
            }
        }
        const createdMatches = await Match_1.default.insertMany(matchesToCreate);
        tournament.matches.push(...createdMatches.map(m => m._id));
        await tournament.save();
        res.status(201).json({ success: true, message: `Generated ${createdMatches.length} fixtures`, data: createdMatches });
    }
    catch (error) {
        logger_1.default.error('Generate fixtures error:', { error: error.message, stack: error.stack });
        next(error);
    }
};
exports.generateFixtures = generateFixtures;
// Delete Tournament
const deleteTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }
        // Check if user is authorized to delete (owner or admin)
        const userId = req.user?._id || req.user?.id;
        const userRole = req.user?.role;
        if (tournament.createdBy?.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this tournament' });
        }
        // Delete associated matches
        if (tournament.matches && tournament.matches.length > 0) {
            await Match_1.default.deleteMany({ _id: { $in: tournament.matches } });
        }
        // Delete the tournament
        await Tournament_1.default.findByIdAndDelete(req.params.id);
        logger_1.default.info('Tournament deleted:', { tournamentId: req.params.id, userId });
        res.status(200).json({ success: true, message: 'Tournament deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Delete tournament error:', { error: error.message, stack: error.stack, tournamentId: req.params.id });
        next(error);
    }
};
exports.deleteTournament = deleteTournament;
// Get Tournament Matches
const getTournamentMatches = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }
        // Get matches from the tournament's matches array
        const matches = await Match_1.default.find({ _id: { $in: tournament.matches } })
            .populate('teamA')
            .populate('teamB')
            .sort({ matchDate: -1 });
        res.status(200).json({
            success: true,
            data: matches,
            count: matches.length
        });
    }
    catch (error) {
        logger_1.default.error('Get tournament matches error:', { error: error.message, tournamentId: req.params.id });
        next(error);
    }
};
exports.getTournamentMatches = getTournamentMatches;
//# sourceMappingURL=tournamentController.js.map