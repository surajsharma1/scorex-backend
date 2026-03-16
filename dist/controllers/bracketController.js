"use strict";
/**
 * Bracket Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. getBrackets/createBracket used (req as any).user?._id — middleware sets req.user.id
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBracket = exports.updateBracket = exports.generateBracket = exports.createBracket = exports.getBrackets = void 0;
const Bracket_1 = __importDefault(require("../models/Bracket"));
const getBrackets = async (req, res) => {
    try {
        // FIX: was (req as any).user?._id — auth middleware sets req.user.id (string)
        let brackets = await Bracket_1.default.find({ createdBy: req.user?.id });
        try {
            brackets = await Bracket_1.default.populate(brackets, { path: 'tournament', strictPopulate: false });
        }
        catch {
            // Populate failure is non-fatal — return brackets without tournament data
        }
        res.json({ success: true, data: brackets });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getBrackets = getBrackets;
const createBracket = async (req, res) => {
    try {
        const { tournament, type, numberOfTeams } = req.body;
        const bracket = await Bracket_1.default.create({
            tournament, type, numberOfTeams, rounds: [],
            createdBy: req.user?.id, // FIX: was (req as any).user?._id
        });
        res.status(201).json({ success: true, data: bracket });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createBracket = createBracket;
function generateRounds(teams, numberOfTeams) {
    const shuffled = [...teams].sort(() => Math.random() - 0.5).slice(0, numberOfTeams);
    const rounds = [];
    let current = shuffled;
    while (current.length > 1) {
        const matches = [];
        for (let i = 0; i < current.length; i += 2) {
            matches.push({ team1: current[i], team2: current[i + 1] || null, score1: 0, score2: 0 });
        }
        rounds.push({ matches });
        current = new Array(Math.ceil(current.length / 2)).fill(null).map(() => ({ name: 'TBD' }));
    }
    return rounds;
}
const generateBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findById(req.params.id);
        if (!bracket) {
            res.status(404).json({ success: false, message: 'Bracket not found' });
            return;
        }
        const rounds = generateRounds(req.body.teams || [], bracket.numberOfTeams || 8);
        const updated = await Bracket_1.default.findByIdAndUpdate(req.params.id, { rounds }, { new: true });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.generateBracket = generateBracket;
const updateBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bracket) {
            res.status(404).json({ success: false, message: 'Bracket not found' });
            return;
        }
        res.json({ success: true, data: bracket });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateBracket = updateBracket;
const deleteBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findByIdAndDelete(req.params.id);
        if (!bracket) {
            res.status(404).json({ success: false, message: 'Bracket not found' });
            return;
        }
        res.json({ success: true, message: 'Bracket deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.deleteBracket = deleteBracket;
