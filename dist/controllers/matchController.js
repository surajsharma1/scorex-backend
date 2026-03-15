"use strict";
/**
 * Match Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. updateMatch used invalid populate(array, 'select') syntax — split into separate calls
 * 2. endMatch used fire-and-forget .then() for team stats — replaced with await
 * 3. getLiveMatches / getUpcomingMatches cast to `any` for statics — use proper model
 * 4. endInnings pushed second innings with hardcoded team2 regardless of toss — now toss-aware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMatchOverlay = exports.updateMatchStatus = exports.getUpcomingMatches = exports.getLiveMatches = exports.endMatch = exports.endInnings = exports.setBowler = exports.setNonStriker = exports.setStriker = exports.addBall = exports.startMatch = exports.deleteMatch = exports.updateMatch = exports.createMatch = exports.getMatch = exports.getMatches = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Match_1 = __importDefault(require("../models/Match"));
const Team_1 = __importDefault(require("../models/Team"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
// ─────────────────────────────────────────
// GET /matches
// ─────────────────────────────────────────
const getMatches = async (req, res, next) => {
    try {
        const { status, tournament, team, limit = 20, page = 1 } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (tournament)
            query.tournamentId = tournament;
        if (team)
            query.$or = [{ team1: team }, { team2: team }];
        const matches = await Match_1.default.aggregate([
            { $match: query },
            { $lookup: { from: 'teams', localField: 'team1', foreignField: '_id', as: 'team1' } },
            { $unwind: { path: '$team1', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'teams', localField: 'team2', foreignField: '_id', as: 'team2' } },
            { $unwind: { path: '$team2', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'tournaments', localField: 'tournamentId', foreignField: '_id', as: 'tournamentId' } },
            { $unwind: { path: '$tournamentId', preserveNullAndEmptyArrays: true } },
            { $sort: { date: -1 } },
            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) }
        ]);
        const total = await Match_1.default.countDocuments(query);
        res.json({ success: true, data: matches, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatches = getMatches;
// ─────────────────────────────────────────
// GET /matches/:id
// ─────────────────────────────────────────
const getMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id)
            .populate('team1', 'name shortName logo players')
            .populate('team2', 'name shortName logo players')
            .populate('tournamentId', 'name')
            .populate('scorerId', 'username email');
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatch = getMatch;
// ─────────────────────────────────────────
// POST /matches
// ─────────────────────────────────────────
const createMatch = async (req, res, next) => {
    try {
        const { name, tournamentId: tId, tournament: tRaw, round, matchNumber, team1: t1Raw, team2: t2Raw, team1Id, team2Id, date: dateRaw, scheduledDate, time, format, venue } = req.body;
        const team1 = t1Raw || team1Id;
        const team2 = t2Raw || team2Id;
        const date = dateRaw || scheduledDate;
        const tournamentId = tId || tRaw || req.params.id;
        if (!team1 || !team2)
            return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
        if (!date)
            return res.status(400).json({ success: false, message: 'Match date is required' });
        const [team1Doc, team2Doc] = await Promise.all([Team_1.default.findById(team1), Team_1.default.findById(team2)]);
        if (!team1Doc || !team2Doc)
            return res.status(400).json({ success: false, message: 'Invalid team IDs' });
        const match = await Match_1.default.create({
            name: name || `${team1Doc.name} vs ${team2Doc.name}`,
            team1Name: team1Doc.name,
            team2Name: team2Doc.name,
            tournamentId, round, matchNumber,
            team1, team2, venue,
            date: new Date(date), time,
            format: format || 'T20',
            status: 'upcoming',
            scorerId: req.user?.id
        });
        if (tournamentId) {
            await Tournament_1.default.findByIdAndUpdate(tournamentId, { $push: { matches: match._id } });
        }
        await match.populate([
            { path: 'team1', select: 'name shortName' },
            { path: 'team2', select: 'name shortName' },
        ]);
        res.status(201).json({ success: true, message: 'Match created successfully', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.createMatch = createMatch;
// ─────────────────────────────────────────
// PUT /matches/:id
// FIX #1: original used .populate(['team1','team2'], 'name shortName') — invalid syntax
// ─────────────────────────────────────────
const updateMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('team1', 'name shortName') // FIX: separate populate calls
            .populate('team2', 'name shortName')
            .populate('tossWinner', 'name shortName');
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        res.json({ success: true, message: 'Match updated', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatch = updateMatch;
// ─────────────────────────────────────────
// DELETE /matches/:id
// ─────────────────────────────────────────
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
// ─────────────────────────────────────────
// POST /matches/:id/start
// ─────────────────────────────────────────
const startMatch = async (req, res, next) => {
    try {
        console.log('📡 startMatch called:', {
            path: req.path,
            method: req.method,
            body: req.body,
            userId: req.user?.id,
            authHeader: req.headers.authorization ? 'Present' : 'Missing'
        });
        const { tossWinner, decision, forceStart = false } = req.body;
        if (!tossWinner || !decision) {
            return res.status(400).json({ success: false, message: 'tossWinner and decision are required' });
        }
        console.log('🔍 Looking up match:', req.params.id);
        const match = await Match_1.default.findById(req.params.id);
        if (!match) {
            console.error('❌ Match not found:', req.params.id);
            return res.status(404).json({ success: false, message: 'Match not found' });
        }
        console.log('✅ Match found:', {
            id: match._id,
            status: match.status,
            team1: match.team1,
            team2: match.team2,
            forceStart
        });
        // FORCE BYPASS: Always allow if forceStart=true (even non-upcoming matches)
        if (forceStart) {
            console.log(`🚀 ✅ FORCE START BYPASS: ${match._id} (status='${match.status}') → 'live'`);
        }
        else if (match.status !== 'upcoming') {
            console.error(`❌ Status check failed: '${match.status}' ≠ 'upcoming'`);
            return res.status(400).json({ success: false, message: `Match is not upcoming (status: '${match.status}')` });
        }
        // Atomic start with race condition protection
        const tossWinnerObjId = new mongoose_1.default.Types.ObjectId(tossWinner);
        const battingTeamId = decision === 'bat'
            ? tossWinnerObjId
            : (tossWinnerObjId.toString() === match.team1.toString() ? match.team2 : match.team1);
        const updateCondition = { _id: match._id };
        if (!forceStart) {
            updateCondition.status = 'upcoming';
            updateCondition.tossWinner = null;
        }
        const updateFields = {
            tossWinner: tossWinnerObjId,
            tossDecision: decision,
            status: 'live',
            innings: [{
                    teamId: battingTeamId,
                    status: 'in_progress',
                    score: 0,
                    wickets: 0,
                    overs: 0,
                    balls: 0,
                    runRate: 0,
                    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
                    batsmen: [],
                    bowlers: [],
                    fallOfWickets: []
                }],
            currentInnings: 1,
            currentOver: 0,
            currentBall: 0,
            team1Score: 0,
            team1Wickets: 0,
            team1Overs: 0,
            team2Score: 0,
            team2Wickets: 0,
            team2Overs: 0
        };
        console.log('🚀 Atomic startMatch update:', { condition: updateCondition, forceStart });
        const updatedMatch = await Match_1.default.findOneAndUpdate(updateCondition, updateFields, { new: true, runValidators: true });
        let finalMatch = updatedMatch;
        if (!updatedMatch) {
            // Already started or invalid state - fetch current
            console.log('⚠️  Start condition failed - already started? Fetching current state');
            finalMatch = await Match_1.default.findById(match._id)
                .populate('team1', 'name shortName logo')
                .populate('team2', 'name shortName logo')
                .populate('tossWinner', 'name shortName');
            if (!forceStart && finalMatch?.status !== 'live') {
                return res.status(409).json({
                    success: false,
                    message: `Match cannot be started (status: ${finalMatch?.status}, tossWinner: ${finalMatch?.tossWinner ? 'set' : 'null'})`,
                    data: finalMatch
                });
            }
            if (forceStart) {
                console.log('✅ Force start succeeded (was already live)');
            }
            else {
                console.log('ℹ️  Duplicate start request ignored - already live');
                return res.status(200).json({
                    success: true,
                    message: 'Match already started',
                    data: finalMatch
                });
            }
        }
        if (!finalMatch?.tossWinner) {
            // Rare fallback
            console.warn('⚠️  No tossWinner after update - refetching');
            finalMatch = await Match_1.default.findById(match._id)
                .populate([
                { path: 'team1', select: 'name shortName logo' },
                { path: 'team2', select: 'name shortName logo' },
                { path: 'tossWinner', select: 'name shortName' },
            ]);
        }
        console.log('✅ Match started successfully:', finalMatch._id);
        res.json({ success: true, message: 'Match started successfully', data: finalMatch });
    }
    catch (error) {
        console.error('💥 startMatch ERROR:', {
            matchId: req.params.id,
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        next(error);
    }
};
exports.startMatch = startMatch;
// ─────────────────────────────────────────
// POST /matches/:id/score
// ─────────────────────────────────────────
const addBall = async (req, res, next) => {
    try {
        const { strikerId, nonStrikerId, bowlerId, ...ballData } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'live')
            return res.status(400).json({ success: false, message: 'Match is not live' });
        if (strikerId)
            match.striker = new mongoose_1.default.Types.ObjectId(strikerId);
        if (nonStrikerId)
            match.nonStriker = new mongoose_1.default.Types.ObjectId(nonStrikerId);
        if (bowlerId)
            match.lastBowler = new mongoose_1.default.Types.ObjectId(bowlerId);
        await match.addBall(ballData);
        await match.populate([
            { path: 'team1', select: 'name shortName logo' },
            { path: 'team2', select: 'name shortName logo' },
        ]);
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('scoreUpdate', match.toObject());
        const inningsIdx = (match.currentInnings || 1) - 1;
        const currentInnings = match.innings[inningsIdx];
        res.json({
            success: true,
            message: 'Ball added',
            data: {
                score: match.team1Score, wickets: match.team1Wickets, overs: (match.team1Overs || 0).toFixed(1),
                team2Score: match.team2Score, team2Wickets: match.team2Wickets, team2Overs: (match.team2Overs || 0).toFixed(1),
                currentOver: match.currentOver, currentBall: match.currentBall, currentInnings: match.currentInnings,
                innings: currentInnings ? {
                    score: currentInnings.score, wickets: currentInnings.wickets, overs: currentInnings.overs,
                    balls: currentInnings.balls, runRate: currentInnings.runRate,
                    requiredRuns: currentInnings.requiredRuns, requiredRunRate: currentInnings.requiredRunRate,
                    targetScore: currentInnings.targetScore, extras: currentInnings.extras
                } : null,
                team1: match.team1?.name || '', team2: match.team2?.name || '',
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addBall = addBall;
// ─────────────────────────────────────────
// POST /matches/:id/striker|non-striker|bowler
// ─────────────────────────────────────────
const setStriker = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        match.striker = new mongoose_1.default.Types.ObjectId(req.body.playerId);
        await match.save();
        res.json({ success: true, message: 'Striker set' });
    }
    catch (error) {
        next(error);
    }
};
exports.setStriker = setStriker;
const setNonStriker = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        match.nonStriker = new mongoose_1.default.Types.ObjectId(req.body.playerId);
        await match.save();
        res.json({ success: true, message: 'Non-striker set' });
    }
    catch (error) {
        next(error);
    }
};
exports.setNonStriker = setNonStriker;
const setBowler = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        match.lastBowler = new mongoose_1.default.Types.ObjectId(req.body.playerId);
        await match.save();
        res.json({ success: true, message: 'Bowler set' });
    }
    catch (error) {
        next(error);
    }
};
exports.setBowler = setBowler;
// ─────────────────────────────────────────
// POST /matches/:id/end-innings
// FIX #4: original hardcoded team2 for 2nd innings — now respects toss/batting team order
// ─────────────────────────────────────────
const endInnings = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.endInnings();
        // If first innings just ended, set up second innings for the other team
        if (match.currentInnings === 1 && match.status === 'live') {
            const firstInningsBattingTeam = match.innings[0]?.teamId;
            // The second innings batting team is whichever team DIDN'T bat first
            const secondInningsBattingTeam = firstInningsBattingTeam?.toString() === match.team1.toString() ? match.team2 : match.team1;
            const targetScore = match.team1Score + 1; // need one more than first innings score
            match.innings.push({
                teamId: secondInningsBattingTeam, // FIX: was hardcoded match.team2 regardless of toss
                status: 'in_progress',
                score: 0, wickets: 0, overs: 0, balls: 0, runRate: 0,
                targetScore,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
                batsmen: [], bowlers: [], fallOfWickets: []
            });
            match.currentInnings = 2;
            match.currentOver = 0;
            match.currentBall = 0;
            await match.save();
        }
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
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
// ─────────────────────────────────────────
// POST /matches/:id/end
// FIX #2: original used fire-and-forget .then() — now properly awaits team stats
// ─────────────────────────────────────────
const endMatch = async (req, res, next) => {
    try {
        const { winnerId, resultType, margin, playerOfMatch } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.endMatch(winnerId ? new mongoose_1.default.Types.ObjectId(winnerId) : undefined, resultType);
        if (margin)
            match.margin = margin;
        if (playerOfMatch)
            match.playerOfMatch = new mongoose_1.default.Types.ObjectId(playerOfMatch);
        // FIX #2: was .then(async (team) => { ... }) with no await — stats might not save
        if (winnerId) {
            const winTeam = await Team_1.default.findById(winnerId);
            if (winTeam) {
                winTeam.tournamentStats = {
                    ...winTeam.tournamentStats,
                    matchesWon: (winTeam.tournamentStats?.matchesWon || 0) + 1,
                    matchesPlayed: (winTeam.tournamentStats?.matchesPlayed || 0) + 1,
                };
                await winTeam.save();
            }
            // Also update the losing team's played count
            const losingTeamId = winnerId === match.team1.toString() ? match.team2 : match.team1;
            const loseTeam = await Team_1.default.findById(losingTeamId);
            if (loseTeam) {
                loseTeam.tournamentStats = {
                    ...loseTeam.tournamentStats,
                    matchesPlayed: (loseTeam.tournamentStats?.matchesPlayed || 0) + 1,
                };
                await loseTeam.save();
            }
        }
        await match.save();
        await match.populate('team1', 'name shortName');
        await match.populate('team2', 'name shortName');
        await match.populate('winner', 'name shortName');
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
// ─────────────────────────────────────────
// GET /matches/live & /matches/upcoming
// FIX #3: original cast model to `any` to call statics — use proper model typing
// ─────────────────────────────────────────
const getLiveMatches = async (req, res, next) => {
    try {
        // FIX: use findById query directly instead of casting to any
        const matches = await Match_1.default.find({ status: 'live' })
            .populate('team1', 'name shortName logo')
            .populate('team2', 'name shortName logo')
            .populate('tournamentId', 'name');
        res.json({ success: true, data: matches });
    }
    catch (error) {
        next(error);
    }
};
exports.getLiveMatches = getLiveMatches;
const getUpcomingMatches = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const matches = await Match_1.default.find({ status: 'upcoming', date: { $gte: new Date() } })
            .populate('team1', 'name shortName')
            .populate('team2', 'name shortName')
            .sort({ date: 1 })
            .limit(limit);
        res.json({ success: true, data: matches });
    }
    catch (error) {
        next(error);
    }
};
exports.getUpcomingMatches = getUpcomingMatches;
const updateMatchStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        match.status = status;
        await match.save();
        const io = req.app.get('io');
        if (io)
            io.to(`match:${match._id}`).emit('matchStatusUpdate', { matchId: match._id, status });
        res.json({ success: true, message: 'Status updated', data: { status } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatchStatus = updateMatchStatus;
const setMatchOverlay = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        match.overlayId = new mongoose_1.default.Types.ObjectId(req.body.overlayId);
        await match.save();
        res.json({ success: true, message: 'Overlay set' });
    }
    catch (error) {
        next(error);
    }
};
exports.setMatchOverlay = setMatchOverlay;
exports.default = { getMatches: exports.getMatches, getMatch: exports.getMatch, createMatch: exports.createMatch, updateMatch: exports.updateMatch, deleteMatch: exports.deleteMatch, startMatch: exports.startMatch, addBall: exports.addBall, setStriker: exports.setStriker, setNonStriker: exports.setNonStriker, setBowler: exports.setBowler, endInnings: exports.endInnings, endMatch: exports.endMatch, getLiveMatches: exports.getLiveMatches, getUpcomingMatches: exports.getUpcomingMatches, updateMatchStatus: exports.updateMatchStatus, setMatchOverlay: exports.setMatchOverlay };
//# sourceMappingURL=matchController.js.map