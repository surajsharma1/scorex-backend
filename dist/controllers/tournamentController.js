"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLiveScores = exports.goLive = exports.deleteTournament = exports.updateTournament = exports.createTournament = exports.getTournament = exports.getTournaments = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const auditLogger_1 = __importDefault(require("../utils/auditLogger"));
const cache_1 = __importDefault(require("../utils/cache"));
const logger_1 = __importDefault(require("../utils/logger"));
const getTournaments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Create cache key with pagination
        const cacheKey = `${cache_1.default.getTournamentsListKey()}:page${page}:limit${limit}`;
        const cachedResult = await cache_1.default.getJSON(cacheKey);
        if (cachedResult) {
            res.json(cachedResult);
            return;
        }
        const total = await Tournament_1.default.countDocuments();
        const tournaments = await Tournament_1.default.find()
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const result = {
            tournaments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        };
        // Cache for 5 minutes
        await cache_1.default.setJSON(cacheKey, result, 300);
        res.json(result);
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
        console.log('Creating tournament with data:', req.body); // Debug log
        const tournament = await Tournament_1.default.create({
            ...req.body,
            createdBy: req.user?._id,
        });
        console.log('Tournament created:', tournament); // Debug log
        // Invalidate tournaments list cache
        await cache_1.default.del(cache_1.default.getTournamentsListKey());
        res.status(201).json(tournament);
    }
    catch (error) {
        console.error('Create tournament error:', error.message); // Detailed error
        res.status(500).json({ message: 'Server error', error: error.message });
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
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, { deleted: true, deletedAt: new Date() }, { new: true });
        if (!tournament) {
            res.status(404).json({ message: 'Tournament not found' });
            return;
        }
        // Audit log tournament deletion
        auditLogger_1.default.logUserAction(req.user?._id.toString(), 'TOURNAMENT_DELETED', 'Tournament', req.params.id, { name: tournament.name }, req.ip, req.get('User-Agent'));
        // Invalidate caches
        await cache_1.default.del(cache_1.default.getTournamentsListKey());
        await cache_1.default.del(cache_1.default.getTournamentKey(req.params.id));
        res.json({ message: 'Tournament deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Delete tournament error:', { error: error instanceof Error ? error.message : 'Unknown error', tournamentId: req.params.id });
        auditLogger_1.default.logSystemAction('TOURNAMENT_DELETION_ERROR', 'Tournament', req.params.id, { error: error instanceof Error ? error.message : 'Unknown error' });
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