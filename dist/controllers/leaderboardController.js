"use strict";
/**
 * Leaderboard Controller
 * Global and tournament leaderboards
 * Following PROJECT_ALGORITHM.md specifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurpleCap = exports.getOrangeCap = exports.getMatchLeaderboard = exports.getTournamentLeaderboard = exports.getGlobalLeaderboard = void 0;
const Player_1 = __importDefault(require("../models/Player"));
const Team_1 = __importDefault(require("../models/Team"));
const Match_1 = __importDefault(require("../models/Match"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
// @desc    Get global leaderboard
// @route   GET /api/v1/leaderboard
// @access  Public
const getGlobalLeaderboard = async (req, res, next) => {
    try {
        const { type = 'player', limit = 50, page = 1, timeframe = 'all' } = req.query;
        let data;
        let query = {};
        // Filter by timeframe
        if (timeframe !== 'all') {
            const now = new Date();
            let startDate;
            switch (timeframe) {
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                default:
                    startDate = new Date(0);
            }
            query.lastMatchDate = { $gte: startDate };
        }
        if (type === 'player') {
            // Get player leaderboard
            data = await Player_1.default.find({ ...query, isActive: true })
                .sort({ 'points.total': -1, 'battingStats.totalRuns': -1, 'bowlingStats.totalWickets': -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit))
                .select('name profilePicture role points battingStats bowlingStats')
                .lean();
            // Add rank
            data = data.map((player, index) => ({
                ...player,
                rank: (Number(page) - 1) * Number(limit) + index + 1,
                totalPoints: player.points?.total || 0,
                totalRuns: player.battingStats?.totalRuns || 0,
                totalWickets: player.bowlingStats?.totalWickets || 0,
                totalMatches: player.battingStats?.totalMatches || 0,
                photo: player.profilePicture
            }));
        }
        else if (type === 'team') {
            // Get team leaderboard
            data = await Team_1.default.find({ ...query, isActive: true })
                .sort({ points: -1, netRunRate: -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit))
                .select('name shortName logo points netRunRate tournamentStats')
                .populate('owner', 'username')
                .lean();
            data = data.map((team, index) => ({
                ...team,
                rank: (Number(page) - 1) * Number(limit) + index + 1,
                matchesPlayed: team.tournamentStats?.matchesPlayed || 0,
                matchesWon: team.tournamentStats?.matchesWon || 0
            }));
        }
        const total = type === 'player'
            ? await Player_1.default.countDocuments(query)
            : await Team_1.default.countDocuments(query);
        res.json({
            success: true,
            data,
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
exports.getGlobalLeaderboard = getGlobalLeaderboard;
// @desc    Get tournament leaderboard
// @route   GET /api/v1/leaderboard/tournament/:tournamentId
// @access  Public
const getTournamentLeaderboard = async (req, res, next) => {
    try {
        const { tournamentId } = req.params;
        const { type = 'player', limit = 50 } = req.query;
        // Verify tournament exists
        const tournament = await Tournament_1.default.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }
        let data;
        if (type === 'player') {
            // Get players from teams in tournament
            const teams = await Team_1.default.find({ tournaments: tournamentId })
                .populate('players');
            const playerIds = [];
            teams.forEach((team) => {
                if (team.players) {
                    playerIds.push(...team.players.map((p) => p._id));
                }
            });
            // Get player stats for this tournament
            const matches = await Match_1.default.find({
                tournamentId,
                status: 'completed'
            });
            // Calculate points per player based on tournament matches
            const playerStats = new Map();
            for (const match of matches) {
                const matchAny = match;
                // innings[] is the real data store — scorecard is only a TypeScript type hint
                for (const inning of (matchAny.innings || [])) {
                    for (const batsman of (inning.batsmen || [])) {
                        const pid = batsman.playerId?.toString();
                        if (!pid)
                            continue;
                        const existing = playerStats.get(pid) || {
                            runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, catches: 0
                        };
                        existing.runs += batsman.runs || 0;
                        existing.balls += batsman.balls || 0;
                        existing.fours += batsman.fours || 0;
                        existing.sixes += batsman.sixes || 0;
                        playerStats.set(pid, existing);
                    }
                    for (const bowler of (inning.bowlers || [])) {
                        const pid = bowler.playerId?.toString();
                        if (!pid)
                            continue;
                        const existing = playerStats.get(pid) || {
                            runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, catches: 0
                        };
                        existing.wickets += bowler.wickets || 0;
                        existing.catches = (existing.catches || 0) + (bowler.catches || 0);
                        playerStats.set(pid, existing);
                    }
                }
            }
            // Get player details and calculate points
            const players = await Player_1.default.find({ _id: { $in: playerIds } })
                .select('name profilePicture role')
                .lean();
            data = players.map((player, index) => {
                const stats = playerStats.get(player._id.toString()) || {};
                // Calculate points per algorithm
                const points = (stats.runs * 1) +
                    (stats.fours * 1) +
                    (stats.sixes * 2) +
                    (stats.wickets * 10) +
                    (stats.catches * 5);
                return {
                    _id: player._id,
                    name: player.name,
                    photo: player.profilePicture,
                    role: player.role,
                    points,
                    runs: stats.runs,
                    wickets: stats.wickets,
                    catches: stats.catches,
                    rank: index + 1
                };
            });
            // Sort by points
            data.sort((a, b) => b.points - a.points);
            data = data.slice(0, Number(limit));
        }
        else if (type === 'team') {
            // Get teams in tournament with their stats
            data = await Team_1.default.find({ tournaments: tournamentId })
                .sort({ 'tournamentStats.points': -1, 'tournamentStats.netRunRate': -1 })
                .limit(Number(limit))
                .select('name shortName logo tournamentStats')
                .lean();
            data = data.map((team, index) => ({
                ...team,
                points: team.tournamentStats?.points || 0,
                matchesPlayed: team.tournamentStats?.matchesPlayed || 0,
                matchesWon: team.tournamentStats?.matchesWon || 0,
                rank: index + 1
            }));
        }
        res.json({
            success: true,
            data,
            tournament: {
                _id: tournament._id,
                name: tournament.name
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournamentLeaderboard = getTournamentLeaderboard;
// @desc    Get match leaderboard (for specific match)
// @route   GET /api/v1/leaderboard/match/:matchId
// @access  Public
const getMatchLeaderboard = async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const match = await Match_1.default.findById(matchId)
            .populate('team1', 'name shortName')
            .populate('team2', 'name shortName');
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        // innings[] is the real data store — scorecard is only a TypeScript type hint
        const matchAny = match;
        if (!matchAny.innings || matchAny.innings.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No scorecard available yet'
            });
        }
        // Combine batting and bowling stats from innings[] (scorecard is only a type hint, not real data)
        const playerStats = new Map();
        for (const inning of (matchAny.innings || [])) {
            // Process batting
            for (const batsman of (inning.batsmen || [])) {
                const playerId = batsman.playerId?.toString();
                if (!playerId)
                    continue;
                const existing = playerStats.get(playerId) || {
                    playerId,
                    name: batsman.name,
                    team: inning.teamId?.toString()
                };
                existing.runs = (existing.runs || 0) + (batsman.runs || 0);
                existing.balls = (existing.balls || 0) + (batsman.balls || 0);
                existing.fours = (existing.fours || 0) + (batsman.fours || 0);
                existing.sixes = (existing.sixes || 0) + (batsman.sixes || 0);
                existing.dismissal = batsman.dismissal;
                playerStats.set(playerId, existing);
            }
            // Process bowling
            for (const bowler of (inning.bowlers || [])) {
                const playerId = bowler.playerId?.toString();
                if (!playerId)
                    continue;
                const existing = playerStats.get(playerId) || {
                    playerId,
                    name: bowler.name,
                    team: inning.teamId?.toString()
                };
                existing.wickets = (existing.wickets || 0) + (bowler.wickets || 0);
                existing.overs = (existing.overs || 0) + (bowler.overs || 0);
                existing.runsConceded = (existing.runsConceded || 0) + (bowler.runs || 0);
                playerStats.set(playerId, existing);
            }
        }
        // Calculate points and create leaderboard
        const data = Array.from(playerStats.values()).map(player => {
            const points = ((player.runs || 0) * 1) +
                ((player.fours || 0) * 1) +
                ((player.sixes || 0) * 2) +
                ((player.wickets || 0) * 10);
            return {
                ...player,
                runs: player.runs || player.runs,
                wickets: player.wickets,
                points,
                strikeRate: player.balls > 0
                    ? ((player.runs / player.balls) * 100).toFixed(2)
                    : '0.00'
            };
        });
        // Sort by points
        data.sort((a, b) => b.points - a.points);
        // Add MVP award to top player
        if (data.length > 0) {
            data[0].isMVP = true;
        }
        res.json({
            success: true,
            data,
            match: {
                _id: match._id,
                team1: match.team1,
                team2: match.team2
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMatchLeaderboard = getMatchLeaderboard;
// @desc    Get orange cap (top scorer) leaderboard
// @route   GET /api/v1/leaderboard/orange-cap
// @access  Public
const getOrangeCap = async (req, res, next) => {
    try {
        const { tournamentId, year } = req.query;
        let query = { isActive: true };
        if (tournamentId) {
            // Get players from tournament teams
            const teams = await Team_1.default.find({ tournaments: tournamentId });
            const playerIds = teams.flatMap((t) => t.players || []);
            query._id = { $in: playerIds };
        }
        const players = await Player_1.default.find(query)
            .sort({ 'battingStats.totalRuns': -1 })
            .limit(10)
            .select('name profilePicture battingStats')
            .lean();
        const data = players.map((player, index) => ({
            ...player,
            rank: index + 1
        }));
        res.json({
            success: true,
            data,
            title: 'Orange Cap - Top Run Scorer'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrangeCap = getOrangeCap;
// @desc    Get purple cap (top wicket taker) leaderboard
// @route   GET /api/v1/leaderboard/purple-cap
// @access  Public
const getPurpleCap = async (req, res, next) => {
    try {
        const { tournamentId } = req.query;
        let query = { isActive: true };
        if (tournamentId) {
            const teams = await Team_1.default.find({ tournaments: tournamentId });
            const playerIds = teams.flatMap((t) => t.players || []);
            query._id = { $in: playerIds };
        }
        const players = await Player_1.default.find(query)
            .sort({ 'bowlingStats.totalWickets': -1 })
            .limit(10)
            .select('name profilePicture bowlingStats')
            .lean();
        const data = players.map((player, index) => ({
            ...player,
            rank: index + 1
        }));
        res.json({
            success: true,
            data,
            title: 'Purple Cap - Top Wicket Taker'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPurpleCap = getPurpleCap;
exports.default = {
    getGlobalLeaderboard: exports.getGlobalLeaderboard,
    getTournamentLeaderboard: exports.getTournamentLeaderboard,
    getMatchLeaderboard: exports.getMatchLeaderboard,
    getOrangeCap: exports.getOrangeCap,
    getPurpleCap: exports.getPurpleCap
};
//# sourceMappingURL=leaderboardController.js.map