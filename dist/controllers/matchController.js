"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveMatches = exports.updateMatchStatus = exports.endMatch = exports.endInnings = exports.undoLastBall = exports.addBall = exports.selectPlayers = exports.startMatch = exports.deleteMatch = exports.updateMatch = exports.createMatch = exports.getMatch = exports.getMatches = void 0;
const Match_1 = __importDefault(require("../models/Match"));
const Team_1 = __importDefault(require("../models/Team"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const teamPopulateOptions = [
    { path: 'team1', select: 'name shortName logo players', populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' } },
    { path: 'team2', select: 'name shortName logo players', populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' } }
];
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
        const matches = await Match_1.default.find(query).populate('team1', 'name shortName logo').populate('team2', 'name shortName logo').populate('tournamentId', 'name').sort({ date: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
        const total = await Match_1.default.countDocuments(query);
        res.json({ success: true, data: matches, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatches = getMatches;
const getMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id).populate(teamPopulateOptions).populate('tournamentId').populate('winner');
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatch = getMatch;
const createMatch = async (req, res, next) => {
    try {
        const { name, tournamentId, round, matchNumber, team1, team2, date, time, format, venue, maxOvers } = req.body;
        if (!team1 || !team2)
            return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
        const [team1Doc, team2Doc] = await Promise.all([Team_1.default.findById(team1), Team_1.default.findById(team2)]);
        const oversMap = { T10: 10, T20: 20, ODI: 50, Test: 90 };
        const fmt = format || 'T20';
        const match = await Match_1.default.create({ name: name || `${team1Doc?.name} vs ${team2Doc?.name}`, team1Name: team1Doc?.name, team2Name: team2Doc?.name, tournamentId, round, matchNumber, team1, team2, venue: venue || 'TBD', date: new Date(date), time, format: fmt, maxOvers: maxOvers || oversMap[fmt] || 20, status: 'upcoming', scorerId: req.user?.id });
        if (tournamentId)
            await Tournament_1.default.findByIdAndUpdate(tournamentId, { $push: { matches: match._id } });
        await match.populate([{ path: 'team1', select: 'name shortName' }, { path: 'team2', select: 'name shortName' }]);
        res.status(201).json({ success: true, message: 'Match created', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.createMatch = createMatch;
const updateMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('team1', 'name shortName').populate('team2', 'name shortName');
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatch = updateMatch;
const deleteMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (match?.tournamentId)
            await Tournament_1.default.findByIdAndUpdate(match.tournamentId, { $pull: { matches: match._id } });
        await match?.deleteOne();
        res.json({ success: true, message: 'Match deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMatch = deleteMatch;
const startMatch = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.startMatch(req.body);
        await match.populate(teamPopulateOptions);
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
const selectPlayers = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        const prevBowler = match.currentBowlerName;
        const prevStriker = match.strikerName;
        const prevNonStriker = match.nonStrikerName;
        await match.selectPlayers(req.body);
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('playersSelected', { striker: match.strikerName, nonStriker: match.nonStrikerName, bowler: match.currentBowlerName });
            const inn = match.innings?.[match.currentInnings - 1];
            const allBatsmen = inn?.batsmen || [];
            if (req.body.bowler && req.body.bowler !== prevBowler) {
                io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'NEW_BOWLER', duration: 8, data: { bowler: req.body.bowler, overs: "0.0", maidens: 0, runs: 0, wickets: 0 } });
            }
            if ((req.body.striker && req.body.striker !== prevStriker) || (req.body.nonStriker && req.body.nonStriker !== prevNonStriker)) {
                const outName = req.body.striker !== prevStriker ? prevStriker : prevNonStriker;
                const inName = req.body.striker !== prevStriker ? req.body.striker : req.body.nonStriker;
                const outBatsman = allBatsmen.find((b) => b.name === outName);
                if (outBatsman?.isOut) {
                    // CRITICAL: Perfectly formats the out card for Wickets ONLY AFTER the player is selected
                    io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'WICKET_SWITCH', duration: 8, data: { outName: outName, howOut: outBatsman.outType || "OUT", outRuns: outBatsman.runs || 0, outBalls: outBatsman.balls || 0, inName: inName, inRuns: 0, inBalls: 0, isSub: false } });
                }
                else if (outName) {
                    io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'BATSMAN_CHANGE', duration: 8, data: { outName: outName, howOut: "Retired", outRuns: outBatsman?.runs || 0, outBalls: outBatsman?.balls || 0, inName: inName, inRuns: 0, inBalls: 0, isSub: true } });
                }
            }
        }
        res.json({ success: true, message: 'Players selected' });
    }
    catch (error) {
        next(error);
    }
};
exports.selectPlayers = selectPlayers;
const addBall = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        const result = await match.addBall(req.body);
        await match.populate(teamPopulateOptions);
        let inningsEnded = result.inningsEnded;
        let matchEnded = result.matchEnded;
        // Automatic "All Out" check
        const currentInningsData = match.innings?.[match.currentInnings - 1];
        const battingTeam = match.currentInnings === 1 ? match.team1 : match.team2;
        const maxWickets = (battingTeam?.players?.length > 1 ? battingTeam.players.length : 11) - 1;
        if (!inningsEnded && currentInningsData && currentInningsData.wickets >= maxWickets) {
            await match.endInnings();
            inningsEnded = true;
            result.inningsEnded = true;
            result.ballDescription += ' (All Out)';
            if (match.currentInnings === 2) {
                matchEnded = true;
                result.matchEnded = true;
                const inn1Score = match.innings[0].score;
                const inn2Score = match.innings[1].score;
                if (inn1Score > inn2Score) {
                    await match.endMatch(match.team1._id, match.team1.name, `${match.team1.name} won by ${inn1Score - inn2Score} runs`);
                }
                else if (inn2Score > inn1Score) {
                    await match.endMatch(match.team2._id, match.team2.name, `${match.team2.name} won by ${maxWickets - match.innings[1].wickets + 1} wickets`);
                }
                else {
                    await match.endMatch(null, 'DRAW', 'Match Tied');
                }
            }
            await match.save();
        }
        const allBatsmen = currentInningsData?.batsmen || [];
        const allBowlers = currentInningsData?.bowlers || [];
        const battingSummary = allBatsmen.map((b) => ({
            name: b.name, runs: b.runs ?? 0, balls: b.balls ?? 0, fours: b.fours ?? 0, sixes: b.sixes ?? 0, sr: b.strikeRate ?? 0, outStatus: b.isOut ? 'out' : 'not_out'
        }));
        const bowlingSummary = allBowlers.map((b) => ({
            name: b.name, overs: b.balls ? `${Math.floor(b.balls / 6)}.${b.balls % 6}` : '0.0', maidens: 0, runs: b.runs ?? 0, wkts: b.wickets ?? 0, econ: b.economy ?? 0
        }));
        let activeTrigger = null;
        // CRITICAL: We DO NOT trigger the wicket animation here anymore. 
        // It waits for selectPlayers (unless the innings/match is instantly over).
        if (result.isWicket || req.body.wicket) {
            if (inningsEnded || matchEnded) {
                const outName = result.outBatsmanName || req.body.outBatsmanName;
                const outBatsman = allBatsmen.find((b) => b.name === outName);
                activeTrigger = { type: 'WICKET_SWITCH', data: { outName: outName, howOut: result.outType || req.body.outType, outRuns: outBatsman?.runs || 0, outBalls: outBatsman?.balls || 0, isSub: false } };
            }
        }
        else if (result.isSix) {
            activeTrigger = { type: 'SIX', data: { playerName: match.strikerName } };
        }
        else if (result.isFour) {
            activeTrigger = { type: 'FOUR', data: { playerName: match.strikerName } };
        }
        else if (result.overChanged && !inningsEnded) {
            activeTrigger = { type: 'OVER_COMPLETE', data: { overNumber: result.completedOverNumber } };
        }
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('scoreUpdate', {
                match: match.toObject(),
                result,
                overSummary: match.getOverSummary(),
                activeTrigger,
                battingSummary,
                bowlingSummary
            });
            if (inningsEnded && !matchEnded) {
                io.to(`match:${match._id}`).emit('inningsEnded', { match: match.toObject(), result });
                const target = (match.innings?.[0]?.score || 0) + 1;
                io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'INNINGS_BREAK', duration: 10, data: { chasingTeam: match.team2Name || "TEAM 2", targetScore: target } });
            }
            if (matchEnded) {
                io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
                io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'MATCH_END', data: { winnerTeam: match.winnerName, winMargin: match.resultSummary } });
            }
        }
        res.json({ success: true, data: result, match: match.toObject() });
    }
    catch (error) {
        next(error);
    }
};
exports.addBall = addBall;
const undoLastBall = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.undoLastBall();
        await match.populate(teamPopulateOptions);
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
const endInnings = async (req, res, next) => {
    try {
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.endInnings();
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('inningsEnded', match.toObject());
            const target = (match.innings?.[0]?.score || 0) + 1;
            io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'INNINGS_BREAK', duration: 10, data: { chasingTeam: match.team2Name, targetScore: target } });
        }
        res.json({ success: true, message: 'Innings ended', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.endInnings = endInnings;
const endMatch = async (req, res, next) => {
    try {
        const { winnerId, winnerName, resultSummary } = req.body;
        const match = await Match_1.default.findById(req.params.id);
        if (!match)
            return res.status(404).json({ success: false, message: 'Match not found' });
        await match.endMatch(winnerId, winnerName, resultSummary);
        await match.save();
        const io = req.app.get('io');
        if (io) {
            io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
            io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'MATCH_END', data: { winnerTeam: match.winnerName, winMargin: match.resultSummary } });
        }
        res.json({ success: true, message: 'Match ended', data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.endMatch = endMatch;
const updateMatchStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, data: match });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMatchStatus = updateMatchStatus;
const getLiveMatches = async (req, res, next) => {
    try {
        const matches = await Match_1.default.find({ status: 'live' }).populate('team1', 'name shortName logo').populate('team2', 'name shortName logo').populate('tournamentId', 'name').sort({ updatedAt: -1 });
        const valid = matches.filter(m => m.tournamentId === null || typeof m.tournamentId === 'object');
        res.json({ success: true, data: valid });
    }
    catch (error) {
        next(error);
    }
};
exports.getLiveMatches = getLiveMatches;
exports.default = { getMatches: exports.getMatches, getMatch: exports.getMatch, createMatch: exports.createMatch, updateMatch: exports.updateMatch, deleteMatch: exports.deleteMatch, startMatch: exports.startMatch, selectPlayers: exports.selectPlayers, addBall: exports.addBall, undoLastBall: exports.undoLastBall, endInnings: exports.endInnings, endMatch: exports.endMatch, updateMatchStatus: exports.updateMatchStatus, getLiveMatches: exports.getLiveMatches };
