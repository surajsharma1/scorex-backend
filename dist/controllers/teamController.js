"use strict";
/**
 * teamController.ts
 *
 * ID assignment rules
 * ───────────────────
 * Team number  — sequential within a tournament (1, 2, 3 …).
 *                Assigned atomically via findOneAndUpdate $inc so two
 *                concurrent requests never get the same number.
 *                Stored in Team.teamNumber.
 *
 * Player number — sequential within a team (1, 2, 3 …).
 *                 Assigned atomically via findOneAndUpdate $inc on
 *                 Team.nextPlayerNumber.  The (teamId, playerNumber)
 *                 pair is stored in Player.teamNumbers[] so the same
 *                 player can sit in many teams without any collision.
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
 * Returns the next sequential team number for a given tournament.
 * Uses $inc so the operation is atomic even under concurrency.
 */
async function nextTeamNumber(tournamentId) {
    // We keep a tiny counter document in a "counters" collection, but since
    // we don't want to add a new model just for that we piggy-back on the
    // Tournament document itself using $inc on a field we add on the fly.
    const updated = await Tournament_1.default.findByIdAndUpdate(tournamentId, { $inc: { _teamCounter: 1 } }, { new: true, upsert: false });
    return updated?._teamCounter ?? 1;
}
/**
 * Returns the next sequential player number for a given team.
 * Atomically increments Team.nextPlayerNumber and returns the NEW value.
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
            .populate({
            path: 'players',
            select: 'name role jerseyNumber teamNumbers',
        })
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
            .populate({
            path: 'players',
            select: 'name role jerseyNumber teamNumbers',
        })
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
        // Prevent overwriting system-managed fields
        const { teamNumber, nextPlayerNumber: _, ...safeBody } = req.body;
        const team = await Team_1.default.findByIdAndUpdate(req.params.id, safeBody, { new: true, runValidators: true }).populate('players captain');
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
            // Guard: already on this team
            const alreadyInTeam = team.players.some((p) => p.equals(pid));
            if (alreadyInTeam) {
                return res.status(400).json({ success: false, message: 'Player is already in this team' });
            }
            // Assign a new player number for this team membership
            const pNum = await nextPlayerNumber(teamId);
            // Update the player's teamNumbers array
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
        // Add to team's players array
        await team.addPlayer(player._id);
        // Return populated team
        await team.populate({
            path: 'players',
            select: 'name role jerseyNumber teamNumbers',
        });
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
        // Remove the team from the player's membership arrays
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
