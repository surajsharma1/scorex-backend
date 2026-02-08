"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBracket = exports.updateBracket = exports.generateBracket = exports.createBracket = exports.getBrackets = void 0;
const Bracket_1 = __importDefault(require("../models/Bracket"));
const getBrackets = async (req, res) => {
    try {
        const brackets = await Bracket_1.default.find({ createdBy: req.user?._id }) // Type assertion
            .populate('tournament');
        res.json(brackets);
    }
    catch (error) {
        console.error('Get brackets error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBrackets = getBrackets;
const createBracket = async (req, res) => {
    try {
        const { tournament, type, numberOfTeams } = req.body;
        const bracket = await Bracket_1.default.create({
            tournament,
            type,
            numberOfTeams,
            rounds: [],
            createdBy: req.user?._id, // Type assertion
        });
        res.status(201).json(bracket);
    }
    catch (error) {
        console.error('Create bracket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBracket = createBracket;
function generateRounds(teams, numberOfTeams) {
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const rounds = [];
    let currentTeams = shuffledTeams.slice(0, numberOfTeams);
    while (currentTeams.length > 1) {
        const matches = [];
        for (let i = 0; i < currentTeams.length; i += 2) {
            matches.push({
                team1: currentTeams[i],
                team2: currentTeams[i + 1] || null,
                score1: 0,
                score2: 0,
            });
        }
        rounds.push({ matches });
        // For next round, placeholders
        currentTeams = new Array(Math.ceil(currentTeams.length / 2)).fill(null).map(() => ({ name: 'TBD' }));
    }
    return rounds;
}
const generateBracket = async (req, res) => {
    try {
        const { teams } = req.body;
        const bracket = await Bracket_1.default.findById(req.params.id);
        if (!bracket) {
            res.status(404).json({ message: 'Bracket not found' });
            return;
        }
        const numberOfTeams = bracket.numberOfTeams || 8;
        const rounds = generateRounds(teams, numberOfTeams);
        const updatedBracket = await Bracket_1.default.findByIdAndUpdate(req.params.id, { rounds }, { new: true });
        res.json(updatedBracket);
    }
    catch (error) {
        console.error('Generate bracket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.generateBracket = generateBracket;
const updateBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bracket) {
            res.status(404).json({ message: 'Bracket not found' });
            return;
        }
        res.json(bracket);
    }
    catch (error) {
        console.error('Update bracket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateBracket = updateBracket;
const deleteBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findByIdAndDelete(req.params.id);
        if (!bracket) {
            res.status(404).json({ message: 'Bracket not found' });
            return;
        }
        res.json({ message: 'Bracket deleted' });
    }
    catch (error) {
        console.error('Delete bracket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteBracket = deleteBracket;
//# sourceMappingURL=bracketController.js.map