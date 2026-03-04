"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFixtures = exports.addTeamToTournament = exports.getTournamentById = exports.getTournaments = exports.createTournament = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
// Create a new tournament
const createTournament = async (req, res, next) => {
    try {
        const { name, organizer, startDate, endDate, location, locationType, type } = req.body;
        // Safely extract the user ID using 'any' casting
        const userId = req.user?._id || req.user?.id;
        const tournament = await Tournament_1.default.create({
            name, organizer, startDate, endDate, location, locationType, type,
            createdBy: userId
        });
        res.status(201).json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.createTournament = createTournament;
// Get all tournaments
const getTournaments = async (req, res, next) => {
    try {
        const tournaments = await Tournament_1.default.find().populate('teams', 'name logo');
        res.status(200).json({ success: true, count: tournaments.length, data: tournaments });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournaments = getTournaments;
// Get single tournament
const getTournamentById = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id)
            .populate('teams')
            .populate({ path: 'matches', select: 'matchName teamA teamB matchDate status format' });
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        res.status(200).json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournamentById = getTournamentById;
// Add Team
const addTeamToTournament = async (req, res, next) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (tournament.teams.includes(teamId)) {
            return res.status(400).json({ success: false, message: 'Team already in tournament' });
        }
        tournament.teams.push(teamId);
        await tournament.save();
        res.status(200).json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.addTeamToTournament = addTeamToTournament;
// Auto-generate Fixtures
const generateFixtures = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id).populate('teams');
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (tournament.teams.length < 2)
            return res.status(400).json({ success: false, message: 'Need at least 2 teams' });
        const matchesToCreate = [];
        const teams = tournament.teams;
        const userId = req.user?._id || req.user?.id;
        if (tournament.type === 'Round Robin') {
            let matchCount = 1;
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    matchesToCreate.push({
                        tournamentId: tournament._id,
                        matchName: `Match ${matchCount}`,
                        teamA: teams[i]._id,
                        teamB: teams[j]._id,
                        venue: tournament.location,
                        matchDate: tournament.startDate,
                        format: 'T20',
                        maxOvers: 20,
                        createdBy: userId
                    });
                    matchCount++;
                }
            }
        }
        const createdMatches = await Match_1.default.insertMany(matchesToCreate);
        tournament.matches.push(...createdMatches.map(m => m._id));
        await tournament.save();
        res.status(201).json({ success: true, message: `Generated ${createdMatches.length} fixtures`, data: createdMatches });
    }
    catch (error) {
        next(error);
    }
};
exports.generateFixtures = generateFixtures;
//# sourceMappingURL=tournamentController.js.map