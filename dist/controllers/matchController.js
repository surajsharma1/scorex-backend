"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveMatches = exports.updateMatchStatus = exports.endMatch = exports.endInnings = exports.undoLastBall = exports.addBall = exports.selectPlayers = exports.startMatch = exports.deleteMatch = exports.updateMatch = exports.createMatch = exports.getMatch = exports.getMatches = void 0;
const Match_1 = __importDefault(require("../models/Match"));
const Team_1 = __importDefault(require("../models/Team"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
// ─── REUSABLE POPULATE OPTIONS (FIX FOR PLAYER NAMES MISSING) ───────────────
const teamPopulateOptions = [
    {
        path: 'team1',
        select: 'name shortName logo players',
        populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' }
    },
    {
        path: 'team2',
        select: 'name shortName logo players',
        populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' }
    }
];
// ─── GET /matches ─────────────────────────────────────────────────────────────
const getMatches = async (req, res, next) => {
    try {
        const { status, tournament, team, limit = 50, page = 1 } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (tournament)
            query.tournamentId = tournament;
        if (team)
            query.$or = [{ team1: team }, { team2: team }];
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
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatches = getMatches;
// ─── GET /matches/:id ─────────────────────────────────────────────────────────
const getMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id)
            .populate(teamPopulateOptions) // Uses the reusable deep populate
            .populate('tournamentId')
            .populate('winner');
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatch = getMatch;
// ─── POST /matches ────────────────────────────────────────────────────────────
const createMatch = async (req, res, next) => {
    try {
        const { name, tournamentId, round, matchNumber, team1, team2, date, time, format, venue, maxOvers } = req.body;
        if (!team1 || !team2)
            return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
        if (!date)
            return res.status(400).json({ success: false, message: 'Match date is required' });
        if (team1 === team2)
            return res.status(400).json({ success: false, message: 'Teams must be different' });
        const [team1Doc, team2Doc] = await Promise.all([
            Team_1.default.findById(team1),
            Team_1.default.findById(team2)
        ]);
        if (!team1Doc || !team2Doc)
            return res.status(400).json({ success: false, message: 'Invalid team IDs' });
        const oversMap = { T10: 10, T20: 20, ODI: 50, Test: 90 };
        const fmt = format || 'T20';
        const match = await Match_1.default.create({
            name: name || `${team1Doc.name} vs ${team2Doc.name}`,
            team1Name: team1Doc.name,
            team2Name: team2Doc.name,
            tournamentId,
            round, matchNumber,
            team1, team2, venue: venue || 'TBD',
            date: new Date(date), time,
            format: fmt,
            maxOvers: maxOvers || oversMap[fmt] || 20,
            status: 'upcoming',
            scorerId: req.user?.id
        });
        if (tournamentId) {
            await Tournament_1.default.findByIdAndUpdate(tournamentId, { $push: { matches: match._id } });
        }
        await match.populate([
            { path: 'team1', select: 'name shortName' },
            { path: 'team2', select: 'name shortName' }
        ]);
        res.status(201).json({ success: true, message: 'Match created', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.createMatch = createMatch;
// ─── PUT /matches/:id ─────────────────────────────────────────────────────────
const updateMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('team1', 'name shortName')
            .populate('team2', 'name shortName');
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatch = updateMatch;
// ─── DELETE /matches/:id ──────────────────────────────────────────────────────
const deleteMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.tournamentId) {
            await Tournament_1.default.findByIdAndUpdate(match.tournamentId, { $pull: { matches: match._id } });
        }
        await match.deleteOne();
        res.json({ success: true, message: 'Match deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMatch = deleteMatch;
// ─── POST /matches/:id/start ──────────────────────────────────────────────────
const startMatch = async (req, res, next) => {
    try {
        const { tossWinnerId, tossWinnerName, tossDecision, battingTeamId, battingTeamName, bowlingTeamId, bowlingTeamName, striker, nonStriker, bowler } = req.body;
        if (!tossWinnerId || !tossDecision || !battingTeamId || !striker || !nonStriker || !bowler) {
            return res.status(400).json({
                success: false,
                message: 'Required: tossWinnerId, tossDecision, battingTeamId, battingTeamName, bowlingTeamId, bowlingTeamName, striker, nonStriker, bowler'
            });
        }
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'upcoming' && match.status !== 'live') {
            return res.status(400).json({ success: false, message: 'Match cannot be started' });
        }
        await match.startMatch({
            tossWinnerId,
            tossWinnerName: tossWinnerName || '',
            tossDecision,
            battingTeamId,
            battingTeamName: battingTeamName || '',
            bowlingTeamId: bowlingTeamId || '',
            bowlingTeamName: bowlingTeamName || '',
            striker,
            nonStriker,
            bowler
        });
        await match.populate(teamPopulateOptions); // FIX: Deep populate for real-time
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('matchStarted', match.toObject());
        res.json({ success: true, message: 'Match started', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.startMatch = startMatch;
// ─── POST /matches/:id/select-players ─────────────────────────────────────────
const selectPlayers = async (req, res, next) => {
    try {
        const { striker, nonStriker, bowler } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'live')
            return res.status(400).json({ success: false, message: 'Match is not live' });
        await match.selectPlayers({ striker, nonStriker, bowler });
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('playersSelected', {
                striker: match.strikerName,
                nonStriker: match.nonStrikerName,
                bowler: match.currentBowlerName
            });
        res.json({
            success: true,
            message: 'Players selected',
            data: {
                striker: match.strikerName,
                nonStriker: match.nonStrikerName,
                bowler: match.currentBowlerName
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.selectPlayers = selectPlayers;
// ─── POST /matches/:id/score ──────────────────────────────────────────────────
const addBall = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'live')
            return res.status(400).json({ success: false, message: 'Match is not live' });
        // Validate active striker exists
        const innings = match.innings?.[match.currentInnings - 1];
        if (!innings?.batsmen?.some((b) => b.isStriker && !b.isOut)) {
            return res.status(400).json({
                success: false,
                message: 'No active striker found. Please select striker/non-striker/bowler first.'
            });
        }
        const result = await match.addBall(req.body);
        await match.populate(teamPopulateOptions); // FIX: Ensure players are included for UI updates
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('scoreUpdate', {
                match: match.toObject(),
                result,
                overSummary: match.getOverSummary()
            });
        }
        // Handle innings end
        if (result.inningsEnded && !result.matchEnded) {
            if (io)
                io.to(`match:${match._id}`).emit('inningsEnded', {
                    inningsNumber: match.currentInnings - 1,
                    score: result.score,
                    wickets: result.wickets
                });
        }
        if (result.matchEnded) {
            if (io)
                io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
        }
        res.json({ success: true, data: result, match: match.toObject() });
    }
    catch (error) {
        next(error);
    }
};
exports.addBall = addBall;
// ─── POST /matches/:id/undo ───────────────────────────────────────────────────
const undoLastBall = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'live')
            return res.status(400).json({ success: false, message: 'Match is not live' });
        await match.undoLastBall();
        await match.populate(teamPopulateOptions); // FIX: Ensure players are included for UI updates
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('scoreUpdate', { match: match.toObject(), result: null });
        res.json({ success: true, message: 'Last ball undone', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.undoLastBall = undoLastBall;
// ─── POST /matches/:id/end-innings ────────────────────────────────────────────
const endInnings = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'live')
            return res.status(400).json({ success: false, message: 'Match is not live' });
        await match.endInnings();
        await match.populate(teamPopulateOptions); // FIX: Deep populate for next innings
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('inningsEnded', match.toObject());
        res.json({ success: true, message: 'Innings ended', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.endInnings = endInnings;
// ─── POST /matches/:id/end ────────────────────────────────────────────────────
const endMatch = async (req, res, next) => {
    try {
        const { winnerId, winnerName, resultSummary, playerOfMatch } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.endMatch(winnerId, winnerName, resultSummary);
        if (playerOfMatch)
            match.playerOfMatch = playerOfMatch;
        await match.save();
        // Update team win/loss stats
        if (winnerId) {
            await Team_1.default.findByIdAndUpdate(winnerId, {
                $inc: { 'stats.matchesWon': 1, 'stats.matchesPlayed': 1, 'tournamentStats.matchesWon': 1, 'tournamentStats.matchesPlayed': 1 }
            });
            const losingTeamId = winnerId === match.team1.toString() ? match.team2 : match.team1;
            await Team_1.default.findByIdAndUpdate(losingTeamId, {
                $inc: { 'stats.matchesPlayed': 1, 'tournamentStats.matchesPlayed': 1 }
            });
        }
        await match.populate([
            { path: 'team1', select: 'name shortName' },
            { path: 'team2', select: 'name shortName' },
            { path: 'winner', select: 'name shortName' }
        ]);
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
        res.json({ success: true, message: 'Match ended', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.endMatch = endMatch;
// ─── PUT /matches/:id/status ──────────────────────────────────────────────────
const updateMatchStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('matchStatusUpdate', { matchId: match._id, status });
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatchStatus = updateMatchStatus;
// ─── GET /matches/live ────────────────────────────────────────────────────────
const getLiveMatches = async (req, res, next) => {
    try {
        const matches = await Match_1.default.find({ status: 'live' })
            .populate('team1', 'name shortName logo')
            .populate('team2', 'name shortName logo')
            .populate('tournamentId', 'name')
            .sort({ updatedAt: -1 });
        res.json({ success: true, data: matches });
    }
    catch (error) {
        next(error);
    }
};
exports.getLiveMatches = getLiveMatches;
exports.default = {
    getMatches: exports.getMatches, getMatch: exports.getMatch, createMatch: exports.createMatch, updateMatch: exports.updateMatch, deleteMatch: exports.deleteMatch,
    startMatch: exports.startMatch, selectPlayers: exports.selectPlayers, addBall: exports.addBall, undoLastBall: exports.undoLastBall,
    endInnings: exports.endInnings, endMatch: exports.endMatch, updateMatchStatus: exports.updateMatchStatus, getLiveMatches: exports.getLiveMatches
};
