"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointsTable = exports.getTournamentMatches = exports.startTournament = exports.generateBracket = exports.deleteTournament = exports.updateTournament = exports.getTournamentById = exports.getMyTournaments = exports.getTournaments = exports.createTournament = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Team_1 = __importDefault(require("../models/Team"));
const Match_1 = __importDefault(require("../models/Match"));
const createTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.create({ ...req.body, organizer: req.user?._id });
        res.status(201).json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.createTournament = createTournament;
const getTournaments = async (req, res, next) => {
    try {
        const { status, type } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (type)
            query.type = type;
        const tournaments = await Tournament_1.default.find(query).populate('organizer', 'username').populate('teams', 'name shortName').sort({ createdAt: -1 });
        res.json({ success: true, data: tournaments });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournaments = getTournaments;
const getMyTournaments = async (req, res, next) => {
    try {
        const tournaments = await Tournament_1.default.find({ organizer: req.user?._id }).populate('teams', 'name shortName').sort({ createdAt: -1 });
        res.json({ success: true, data: tournaments });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyTournaments = getMyTournaments;
const getTournamentById = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id)
            .populate('organizer', 'username email')
            .populate('teams', 'name shortName logo stats tournamentStats')
            .populate({ path: 'matches', populate: [{ path: 'team1', select: 'name shortName' }, { path: 'team2', select: 'name shortName' }] });
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        res.json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournamentById = getTournamentById;
const updateTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findOneAndUpdate({ _id: req.params.id, organizer: req.user?._id }, req.body, { new: true, runValidators: true });
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Not found or unauthorized' });
        res.json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTournament = updateTournament;
const deleteTournament = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        const query = isAdmin
            ? { _id: req.params.id }
            : { _id: req.params.id, organizer: req.user?._id };
        const tournamentDoc = await Tournament_1.default.findOne(query);
        if (!tournamentDoc)
            return res.status(404).json({ success: false, message: 'Not found or unauthorized' });
        const tid = tournamentDoc._id;
        // ✅ FIX: was { tournament: tid } — field is tournamentId
        await Match_1.default.deleteMany({ tournamentId: tid });
        // ✅ Also clean up overlays and teams linked to this tournament
        const Overlay = (await Promise.resolve().then(() => __importStar(require('../models/Overlay')))).default;
        await Overlay.deleteMany({ tournament: tid });
        await Team_1.default.deleteMany({ tournament: tid });
        await Tournament_1.default.findByIdAndDelete(tid);
        res.json({ success: true, message: 'Tournament and all associated data deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTournament = deleteTournament;
const generateBracket = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Not found' });
        await tournament.generateBracket();
        res.json({ success: true, data: tournament.bracket });
    }
    catch (error) {
        next(error);
    }
};
exports.generateBracket = generateBracket;
const startTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, { status: 'ongoing' }, { new: true });
        res.json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.startTournament = startTournament;
const getTournamentMatches = async (req, res, next) => {
    try {
        const Match = (await Promise.resolve().then(() => __importStar(require('../models/Match')))).default;
        const matches = await Match.find({ tournamentId: req.params.id })
            .populate([
            { path: 'team1', select: 'name shortName logo' },
            { path: 'team2', select: 'name shortName logo' }
        ])
            .sort({ date: -1 });
        if (matches.length === 0) {
            return res.json({ success: true, data: [] });
        }
        res.json({ success: true, data: matches });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournamentMatches = getTournamentMatches;
const getPointsTable = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id).populate('teams');
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Not found' });
        const matches = await Match_1.default.find({ tournamentId: req.params.id, status: 'completed' });
        const teamMap = {};
        tournament.teams.forEach(team => {
            teamMap[team._id.toString()] = { _id: team._id, name: team.name, shortName: team.shortName, played: 0, won: 0, lost: 0, tied: 0, nr: 0, points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, nrr: 0 };
        });
        matches.forEach(match => {
            const t1 = match.team1.toString(), t2 = match.team2.toString();
            if (!teamMap[t1] || !teamMap[t2])
                return;
            teamMap[t1].played++;
            teamMap[t2].played++;
            teamMap[t1].runsFor += match.team1Score || 0;
            teamMap[t1].oversFor += match.team1Overs || 0;
            teamMap[t1].runsAgainst += match.team2Score || 0;
            teamMap[t1].oversAgainst += match.team2Overs || 0;
            teamMap[t2].runsFor += match.team2Score || 0;
            teamMap[t2].oversFor += match.team2Overs || 0;
            teamMap[t2].runsAgainst += match.team1Score || 0;
            teamMap[t2].oversAgainst += match.team1Overs || 0;
            if (match.winner) {
                const w = match.winner.toString(), l = w === t1 ? t2 : t1;
                if (teamMap[w]) {
                    teamMap[w].won++;
                    teamMap[w].points += 2;
                }
                if (teamMap[l])
                    teamMap[l].lost++;
            }
            else {
                teamMap[t1].nr++;
                teamMap[t2].nr++; /* No points for no-result */
            }
        });
        Object.values(teamMap).forEach((team) => {
            const rpf = team.oversFor > 0 ? team.runsFor / team.oversFor : 0;
            const rpa = team.oversAgainst > 0 ? team.runsAgainst / team.oversAgainst : 0;
            team.nrr = parseFloat((rpf - rpa).toFixed(3));
        });
        const table = Object.values(teamMap).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
        res.json({ success: true, data: table });
    }
    catch (error) {
        next(error);
    }
};
exports.getPointsTable = getPointsTable;
exports.default = { createTournament: exports.createTournament, getTournaments: exports.getTournaments, getMyTournaments: exports.getMyTournaments, getTournamentById: exports.getTournamentById, updateTournament: exports.updateTournament, deleteTournament: exports.deleteTournament, generateBracket: exports.generateBracket, startTournament: exports.startTournament, getPointsTable: exports.getPointsTable, getTournamentMatches: exports.getTournamentMatches };
