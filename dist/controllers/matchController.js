"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommentary = exports.addCommentary = exports.deleteMatch = exports.updateMatchScore = exports.updateMatch = exports.createMatch = exports.getMatch = exports.getMatches = void 0;
const Match_1 = __importDefault(require("../models/Match"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const server_1 = require("../server");
const getMatches = async (req, res) => {
    try {
        const { tournament } = req.query;
        const matches = await Match_1.default.find(tournament ? { tournament } : {}).populate('team1 team2');
        res.json(matches);
    }
    catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMatches = getMatches;
const getMatch = async (req, res) => {
    try {
        const match = await Match_1.default.findById(req.params.id)
            .populate('team1 team2')
            .populate('tournament');
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        const team1 = match.team1;
        const team2 = match.team2;
        const tournament = match.tournament;
        const overs2 = match.overs2 || 0;
        const score2 = match.score2 || 0;
        const score1 = match.score1 || 0;
        const currentRunRate = overs2 > 0 ? (score2 / overs2).toFixed(2) : '0.00';
        const target = score1 + 1;
        const remainingRuns = target - score2;
        const remainingOvers = 20 - overs2;
        const requiredRunRate = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '0.00';
        res.json({
            _id: match._id,
            tournament: {
                _id: tournament?._id,
                name: tournament?.name || 'Tournament'
            },
            team1: {
                _id: team1?._id,
                name: team1?.name || 'Team 1',
                shortName: team1?.shortName || 'T1',
                players: team1?.players || []
            },
            team2: {
                _id: team2?._id,
                name: team2?.name || 'Team 2',
                shortName: team2?.shortName || 'T2',
                players: team2?.players || []
            },
            score1: match.score1 || 0,
            score2: match.score2 || 0,
            wickets1: match.wickets1 || 0,
            wickets2: match.wickets2 || 0,
            overs1: match.overs1 || 0,
            overs2: match.overs2 || 0,
            // Striker/Non-striker data
            striker_name: match.strikerName || '',
            striker_runs: match.strikerRuns || 0,
            striker_balls: match.strikerBalls || 0,
            nonstriker_name: match.nonStrikerName || '',
            nonstriker_runs: match.nonStrikerRuns || 0,
            nonstriker_balls: match.nonStrikerBalls || 0,
            // Bowler data
            bowler_name: match.bowlerName || '',
            bowler_overs: match.bowlerOvers || 0,
            bowler_maidens: match.bowlerMaidens || 0,
            bowler_runs: match.bowlerRuns || 0,
            bowler_wickets: match.bowlerWickets || 0,
            // Points system
            team1_points: match.team1Points || 0,
            team2_points: match.team2Points || 0,
            // Stats
            crr: currentRunRate,
            rrr: requiredRunRate,
            target: target.toString(),
            last5Overs: match.lastFiveOvers || '-',
            status: match.status,
            date: match.date,
            venue: match.venue
        });
    }
    catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMatch = getMatch;
const createMatch = async (req, res) => {
    console.log('Create match request body:', req.body);
    try {
        const { tournament, team1, team2, date, venue } = req.body;
        if (!tournament || !team1 || !team2 || !date) {
            res.status(400).json({ message: 'Missing required fields: tournament, team1, team2, date' });
            return;
        }
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(tournament) || !mongoose.Types.ObjectId.isValid(team1) || !mongoose.Types.ObjectId.isValid(team2)) {
            res.status(400).json({ message: 'Invalid ObjectId for tournament, team1, or team2' });
            return;
        }
        const authReq = req;
        if (!authReq.user || !authReq.user._id) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const matchData = { ...req.body, createdBy: authReq.user._id };
        const match = await Match_1.default.create(matchData);
        console.log('Match created successfully:', match);
        res.status(201).json(match);
    }
    catch (error) {
        console.error('Create match error:');
        const err = error;
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};
exports.createMatch = createMatch;
const updateMatch = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (match) {
            server_1.io.emit('scoreUpdate', { matchId: match._id, match });
        }
        res.json(match);
    }
    catch (error) {
        console.error('Update match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatch = updateMatch;
const updateMatchScore = async (req, res) => {
    try {
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('team1 team2');
        if (match) {
            server_1.io.emit('scoreUpdate', { matchId: match._id, match });
            const liveScores = {
                team1: {
                    name: match.team1.name || 'Team 1',
                    score: match.score1 || 0,
                    wickets: match.wickets1 || 0,
                    overs: match.overs1 || 0,
                },
                team2: {
                    name: match.team2.name || 'Team 2',
                    score: match.score2 || 0,
                    wickets: match.wickets2 || 0,
                    overs: match.overs2 || 0,
                },
                currentRunRate: 0,
                requiredRunRate: 0,
                target: 0,
                lastFiveOvers: '-',
            };
            await Tournament_1.default.findByIdAndUpdate(match.tournament, { liveScores });
        }
        res.json(match);
    }
    catch (error) {
        console.error('Update match score error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMatchScore = updateMatchScore;
const deleteMatch = async (req, res) => {
    try {
        await Match_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Match deleted' });
    }
    catch (error) {
        console.error('Delete match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteMatch = deleteMatch;
const addCommentary = async (req, res) => {
    try {
        const { commentary } = req.body;
        const match = await Match_1.default.findByIdAndUpdate(req.params.id, { $push: { commentary } }, { new: true }).populate('team1 team2');
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        server_1.io.emit('commentaryUpdate', { matchId: match._id, commentary: match.commentary });
        res.json(match);
    }
    catch (error) {
        console.error('Add commentary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.addCommentary = addCommentary;
const getCommentary = async (req, res) => {
    try {
        const match = await Match_1.default.findById(req.params.id).select('commentary');
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        res.json({ commentary: match.commentary });
    }
    catch (error) {
        console.error('Get commentary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getCommentary = getCommentary;
//# sourceMappingURL=matchController.js.map