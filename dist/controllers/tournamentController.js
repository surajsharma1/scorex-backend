"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTournament = exports.generateBracket = exports.getTournaments = exports.createTournament = void 0;
const Tournament_1 = __importDefault(require("../models/Tournament"));
const createTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.create({
            ...req.body,
            organizer: req.user?._id
        });
        await tournament.save();
        await tournament.populate('organizer teams');
        res.status(201).json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.createTournament = createTournament;
const getTournaments = async (req, res, next) => {
    try {
        const { status, type, limit = 20, page = 1 } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (type)
            query.type = type;
        const tournaments = await Tournament_1.default.find(query)
            .populate('organizer teams', 'name username')
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        res.json({ success: true, data: tournaments });
    }
    catch (error) {
        next(error);
    }
};
exports.getTournaments = getTournaments;
const generateBracket = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findById(req.params.id);
        if (!tournament)
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        await tournament.generateBracket();
        await tournament.populate('teams');
        res.json({ success: true, data: tournament.bracket });
    }
    catch (error) {
        next(error);
    }
};
exports.generateBracket = generateBracket;
const startTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament_1.default.findByIdAndUpdate(req.params.id, { status: 'ongoing' }, { new: true }).populate('teams');
        res.json({ success: true, data: tournament });
    }
    catch (error) {
        next(error);
    }
};
exports.startTournament = startTournament;
exports.default = {
    createTournament: exports.createTournament,
    getTournaments: exports.getTournaments,
    generateBracket: exports.generateBracket,
    startTournament: exports.startTournament
};
//# sourceMappingURL=tournamentController.js.map