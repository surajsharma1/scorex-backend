"use strict";
/**
 * Match Controller
 * Complete cricket match and scoring system
 * Following PROJECT_ALGORITHM.md specifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMatchOverlay = exports.updateMatchStatus = exports.getUpcomingMatches = exports.getLiveMatches = exports.endMatch = exports.endInnings = exports.setBowler = exports.setNonStriker = exports.setStriker = exports.addBall = exports.startMatch = exports.deleteMatch = exports.updateMatch = exports.createMatch = exports.getMatch = exports.getMatches = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Match_1 = __importDefault(require("../models/Match"));
const Team_1 = __importDefault(require("../models/Team"));
const Player_1 = __importDefault(require("../models/Player"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
// ==========================================
// CONTROLLERS
// ==========================================
// @desc    Get all matches
// @route   GET /api/v1/matches
// @access  Public
const getMatches = async (req, res, next) => {
    try {
        const { status, tournament, team, limit = 20, page = 1 } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (tournament)
            query.tournamentId = tournament;
        if (team) {
            query.$or = [{ team1: team }, { team2: team }];
        }
        const matches = await Match_1.default.find(query)
            .populate('team1', 'name shortName logo')
            .populate('team2', 'name shortName logo')
            .populate('tournamentId', 'name')
            .sort({ date: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Match_1.default.countDocuments(query);
        res.json({
            success: true,
            data: matches,
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
exports.getMatches = getMatches;
// @desc    Get single match
// @route   GET /api/v1/matches/:id
// @access  Public
const getMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id)
            .populate('team1', 'name shortName logo players')
            .populate('team2', 'name shortName logo players')
            .populate('tournamentId', 'name')
            .populate('scorerId', 'username email');
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        res.json({
            success: true,
            data: match
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatch = getMatch;
// @desc    Create new match
// @route   POST /api/v1/matches
// @access  Private (Organizer/Admin)
const createMatch = async (req, res, next) => {
    try {
        const { name, tournamentId, round, matchNumber, 
        // Accept both naming conventions (team1/team2 or team1Id/team2Id)
        team1: team1Raw, team2: team2Raw, team1Id, team2Id, venue, 
        // Accept both date and scheduledDate
        date: dateRaw, scheduledDate, time, format } = req.body;
        const team1 = team1Raw || team1Id;
        const team2 = team2Raw || team2Id;
        const date = dateRaw || scheduledDate;
        if (!team1 || !team2) {
            return res.status(400).json({
                success: false,
                message: 'team1 and team2 are required'
            });
        }
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Match date is required'
            });
        }
        // Verify teams exist
        const team1Doc = await Team_1.default.findById(team1);
        const team2Doc = await Team_1.default.findById(team2);
        if (!team1Doc || !team2Doc) {
            return res.status(400).json({
                success: false,
                message: 'Invalid team IDs'
            });
        }
        const match = await Match_1.default.create({
            name,
            tournamentId,
            round,
            matchNumber,
            team1,
            team2,
            venue,
            date: new Date(date),
            time,
            format: format || 'T20',
            status: 'upcoming',
            scorerId: req.user?.id
        });
        // Add to tournament if provided
        if (tournamentId) {
            await Tournament_1.default.findByIdAndUpdate(tournamentId, {
                $push: { matches: match._id }
            });
        }
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
        res.status(201).json({
            success: true,
            message: 'Match created successfully',
            data: match
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createMatch = createMatch;
// @desc    Update match
// @route   PUT /api/v1/matches/:id
// @access  Private
const updateMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('team1', 'name shortName').populate('team2', 'name shortName');
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        res.json({
            success: true,
            message: 'Match updated',
            data: match
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatch = updateMatch;
// @desc    Delete match
// @route   DELETE /api/v1/matches/:id
// @access  Private (Admin)
const deleteMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        // Remove from tournament
        if (match.tournamentId) {
            await Tournament_1.default.findByIdAndUpdate(match.tournamentId, {
                $pull: { matches: match._id }
            });
        }
        await match.deleteOne();
        res.json({
            success: true,
            message: 'Match deleted'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMatch = deleteMatch;
// @desc    Start match (after toss)
// @route   POST /api/v1/matches/:id/start
// @access  Private
const startMatch = async (req, res, next) => {
    try {
        const { tossWinner, decision } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        if (match.status !== 'upcoming') {
            return res.status(400).json({
                success: false,
                message: 'Match is not in upcoming status'
            });
        }
        await match.startMatch(new mongoose_1.default.Types.ObjectId(tossWinner), decision);
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
        res.json({
            success: true,
            message: 'Match started',
            data: match
        });
    }
    catch (error) {
        next(error);
    }
};
exports.startMatch = startMatch;
// @desc    Add ball to match (SCORING)
// @route   POST /api/v1/matches/:id/score
// @access  Private
const addBall = async (req, res, next) => {
    try {
        const ballData = req.body;
        const { strikerId, nonStrikerId, bowlerId } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        if (match.status !== 'live') {
            return res.status(400).json({
                success: false,
                message: 'Match is not live'
            });
        }
        // Set players if provided
        if (strikerId)
            match.striker = new mongoose_1.default.Types.ObjectId(strikerId);
        if (nonStrikerId)
            match.nonStriker = new mongoose_1.default.Types.ObjectId(nonStrikerId);
        if (bowlerId)
            match.lastBowler = new mongoose_1.default.Types.ObjectId(bowlerId);
        // Add the ball
        await match.addBall(ballData);
        // Reload match with populated data
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
        // Get socket instance for real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('scoreUpdate', match);
        }
        res.json({
            success: true,
            message: 'Ball added',
            data: {
                score: match.team1Score,
                wickets: match.team1Wickets,
                overs: match.team1Overs.toFixed(1),
                currentOver: match.currentOver,
                currentBall: match.currentBall
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addBall = addBall;
// @desc    Set striker
// @route   POST /api/v1/matches/:id/striker
// @access  Private
const setStriker = async (req, res, next) => {
    try {
        const { playerId } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        match.striker = new mongoose_1.default.Types.ObjectId(playerId);
        await match.save();
        res.json({
            success: true,
            message: 'Striker set'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.setStriker = setStriker;
// @desc    Set non-striker
// @route   POST /api/v1/matches/:id/non-striker
// @access  Private
const setNonStriker = async (req, res, next) => {
    try {
        const { playerId } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        match.nonStriker = new mongoose_1.default.Types.ObjectId(playerId);
        await match.save();
        res.json({
            success: true,
            message: 'Non-striker set'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.setNonStriker = setNonStriker;
// @desc    Set bowler
// @route   POST /api/v1/matches/:id/bowler
// @access  Private
const setBowler = async (req, res, next) => {
    try {
        const { playerId } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        match.lastBowler = new mongoose_1.default.Types.ObjectId(playerId);
        await match.save();
        res.json({
            success: true,
            message: 'Bowler set'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.setBowler = setBowler;
// @desc    End innings
// @route   POST /api/v1/matches/:id/end-innings
// @access  Private
const endInnings = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        await match.endInnings();
        // If second innings and target set, set target for team 2
        if (match.currentInnings === 1) {
            const targetScore = match.team1Score + 1;
            // Initialize second innings
            match.innings.push({
                teamId: match.team2,
                status: 'in_progress',
                score: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                runRate: 0,
                targetScore,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
                batsmen: [],
                bowlers: [],
                fallOfWickets: []
            });
            match.currentInnings = 2;
            match.currentOver = 0;
            match.currentBall = 0;
        }
        await match.save();
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
        res.json({
            success: true,
            message: 'Innings ended',
            data: match
        });
    }
    catch (error) {
        next(error);
    }
};
exports.endInnings = endInnings;
// @desc    End match
// @route   POST /api/v1/matches/:id/end
// @access  Private
const endMatch = async (req, res, next) => {
    try {
        const { winnerId, resultType, margin, playerOfMatch } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        await match.endMatch(winnerId ? new mongoose_1.default.Types.ObjectId(winnerId) : undefined, resultType);
        // Update player of match stats
        if (playerOfMatch) {
            const player = await Player_1.default.findById(playerOfMatch);
            if (player) {
                await player.updateStats({});
            }
        }
        // Update team stats
        if (winnerId) {
            await Team_1.default.findById(winnerId).then(async (team) => {
                if (team) {
                    team.tournamentStats = {
                        ...team.tournamentStats,
                        matchesWon: (team.tournamentStats?.matchesWon || 0) + 1,
                        matchesPlayed: (team.tournamentStats?.matchesPlayed || 0) + 1
                    };
                    await team.save();
                }
            });
        }
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
        await match.populate('winner', 'name shortName');
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('matchEnded', match);
        }
        res.json({
            success: true,
            message: 'Match ended',
            data: match
        });
    }
    catch (error) {
        next(error);
    }
};
exports.endMatch = endMatch;
// @desc    Get live matches
// @route   GET /api/v1/matches/live
// @access  Public
const getLiveMatches = async (req, res, next) => {
    try {
        const matches = Match_1.default.getLiveMatches();
        res.json({
            success: true,
            data: matches
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLiveMatches = getLiveMatches;
// @desc    Get upcoming matches
// @route   GET /api/v1/matches/upcoming
// @access  Public
const getUpcomingMatches = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const matches = Match_1.default.getUpcoming(limit);
        res.json({
            success: true,
            data: matches
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUpcomingMatches = getUpcomingMatches;
// @desc    Update match status
// @route   PUT /api/v1/matches/:id/status
// @access  Private
const updateMatchStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        match.status = status;
        await match.save();
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('matchStatusUpdate', {
                matchId: match._id,
                status: match.status
            });
        }
        res.json({
            success: true,
            message: 'Status updated',
            data: { status: match.status }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatchStatus = updateMatchStatus;
// @desc    Set overlay for match
// @route   PUT /api/v1/matches/:id/overlay
// @access  Private
const setMatchOverlay = async (req, res, next) => {
    try {
        const { overlayId } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        match.overlayId = new mongoose_1.default.Types.ObjectId(overlayId);
        await match.save();
        res.json({
            success: true,
            message: 'Overlay set'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.setMatchOverlay = setMatchOverlay;
exports.default = {
    getMatches: exports.getMatches,
    getMatch: exports.getMatch,
    createMatch: exports.createMatch,
    updateMatch: exports.updateMatch,
    deleteMatch: exports.deleteMatch,
    startMatch: exports.startMatch,
    addBall: exports.addBall,
    setStriker: exports.setStriker,
    setNonStriker: exports.setNonStriker,
    setBowler: exports.setBowler,
    endInnings: exports.endInnings,
    endMatch: exports.endMatch,
    getLiveMatches: exports.getLiveMatches,
    getUpcomingMatches: exports.getUpcomingMatches,
    updateMatchStatus: exports.updateMatchStatus,
    setMatchOverlay: exports.setMatchOverlay
};
//# sourceMappingURL=matchController.js.map