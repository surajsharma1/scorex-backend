"use strict";
/**
 * teamController.ts
 *
 * Team number  — sequential within a tournament (1, 2, 3 …).
 *                Assigned via atomic $inc on Tournament._teamCounter so
 *                two simultaneous requests can never get the same number.
 *
 * Player number — sequential within a team (1, 2, 3 …).
 *                 Assigned via atomic $inc on Team.nextPlayerNumber.
 *                 Stored in Player.teamNumbers[] so a player in multiple
 *                 teams has an independent number per team.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePlayer = exports.addPlayer = exports.deleteTeam = exports.updateTeam = exports.getTeam = exports.getTeams = exports.createTeam = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Team_1 = __importDefault(require("../models/Team"));
const Player_1 = __importDefault(require("../models/Player"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
// ─── Helpers ──────────────────────────────────────────────────────────────
/**
 * Atomically increments Tournament._teamCounter and returns the new value.
 * Because $inc + findOneAndUpdate is a single atomic MongoDB operation,
 * two concurrent requests always get different numbers.
 */
async function nextTeamNumber(tournamentId) {
    const updated = await Tournament_1.default.findByIdAndUpdate(tournamentId, { $inc: { _teamCounter: 1 } }, { new: true });
    // If the tournament wasn't found return 1 as a safe fallback
    return updated?._teamCounter ?? 1;
}
/**
 * Atomically increments Team.nextPlayerNumber and returns the new value.
 */
async function nextPlayerNumber(teamId) {
    const updated = await Team_1.default.findByIdAndUpdate(teamId, { $inc: { nextPlayerNumber: 1 } }, { new: true });
    return updated?.nextPlayerNumber ?? 1;
}
// ─── Controllers ──────────────────────────────────────────────────────────
const createTeam = async (req, res, next) => {
    try {
        const { name, shortName, players, captain, tournamentId } = req.body;
        let teamNum = 0;
        let tId;
        if (tournamentId) {
            tId = new mongoose_1.default.Types.ObjectId(tournamentId);
            // Atomic increment — guaranteed unique even under concurrent requests
            teamNum = await nextTeamNumber(tId);
        }
        const team = await Team_1.default.create({
            name,
            shortName,
            players,
            captain,
            tournamentId: tId,
            teamNumber: teamNum,
        });
        if (tId) {
            const tournament = await Tournament_1.default.findById(tId);
            if (tournament)
                await tournament.addTeam(team._id);
        }
        await team.populate('players captain', 'name');
        res.status(201).json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.createTeam = createTeam;
const getTeams = async (req, res, next) => {
    try {
        const { tournamentId, limit = 20, page = 1 } = req.query;
        const query = tournamentId ? { tournamentId } : {};
        const teams = await Team_1.default.find(query)
            .populate({ path: 'players', select: 'name role jerseyNumber teamNumbers' })
            .populate('captain tournamentId', 'name shortName')
            .sort({ teamNumber: 1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Team_1.default.countDocuments(query);
        res.json({
            success: true,
            data: teams,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeams = getTeams;
const getTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findById(req.params.id)
            .populate({ path: 'players', select: 'name role jerseyNumber teamNumbers' })
            .populate('captain tournamentId matches', 'name shortName');
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeam = getTeam;
const updateTeam = async (req, res, next) => {
    try {
        // Never let a client overwrite system-managed counters
        const { teamNumber, nextPlayerNumber: _npn, ...safeBody } = req.body;
        const team = await Team_1.default.findByIdAndUpdate(req.params.id, safeBody, {
            new: true,
            runValidators: true,
        }).populate('players captain');
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        await team.updateStats();
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res, next) => {
    try {
        const team = await Team_1.default.findByIdAndDelete(req.params.id);
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        res.json({ success: true, message: 'Team deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTeam = deleteTeam;
const addPlayer = async (req, res, next) => {
    try {
        const teamId = new mongoose_1.default.Types.ObjectId(req.params.id);
        const team = await Team_1.default.findById(teamId);
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        let player;
        if (req.body.playerId) {
            // ── Existing player being added to this team ──
            const pid = new mongoose_1.default.Types.ObjectId(req.body.playerId);
            player = await Player_1.default.findById(pid);
            if (!player)
                return res.status(404).json({ success: false, message: 'Player not found' });
            const alreadyInTeam = team.players.some((p) => p.equals(pid));
            if (alreadyInTeam) {
                return res.status(400).json({ success: false, message: 'Player is already in this team' });
            }
            const pNum = await nextPlayerNumber(teamId);
            await Player_1.default.findByIdAndUpdate(pid, {
                $push: {
                    teams: teamId,
                    teamNumbers: { teamId, playerNumber: pNum },
                },
            });
        }
        else if (req.body.name && req.body.role) {
            // ── Brand-new player being created and added to this team ──
            const pNum = await nextPlayerNumber(teamId);
            player = await Player_1.default.create({
                name: req.body.name,
                role: req.body.role,
                jerseyNumber: req.body.jerseyNumber ? Number(req.body.jerseyNumber) : undefined,
                isActive: true,
                teams: [teamId],
                teamNumbers: [{ teamId, playerNumber: pNum }],
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Provide either playerId (existing) or name + role (new player)',
            });
        }
        await team.addPlayer(player._id);
        await team.populate({ path: 'players', select: 'name role jerseyNumber teamNumbers' });
        await team.populate('captain', 'name role');
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.addPlayer = addPlayer;
const removePlayer = async (req, res, next) => {
    try {
        const teamId = new mongoose_1.default.Types.ObjectId(req.params.id);
        const playerId = new mongoose_1.default.Types.ObjectId(req.params.playerId);
        const team = await Team_1.default.findById(teamId);
        if (!team)
            return res.status(404).json({ success: false, message: 'Team not found' });
        await Player_1.default.findByIdAndUpdate(playerId, {
            $pull: {
                teams: teamId,
                teamNumbers: { teamId },
            },
        });
        await team.removePlayer(playerId);
        await team.populate('players');
        res.json({ success: true, data: team });
    }
    catch (error) {
        next(error);
    }
};
exports.removePlayer = removePlayer;
exports.default = { createTeam: exports.createTeam, getTeams: exports.getTeams, getTeam: exports.getTeam, updateTeam: exports.updateTeam, deleteTeam: exports.deleteTeam, addPlayer: exports.addPlayer, removePlayer: exports.removePlayer };
