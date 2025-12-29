"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBracket = exports.updateBracket = exports.generateBracket = exports.createBracket = exports.getBrackets = void 0;
const Bracket_1 = __importDefault(require("../models/Bracket"));
const getBrackets = async (req, res) => {
    try {
        const brackets = await Bracket_1.default.find({ createdBy: req.user?._id })
            .populate('tournament');
        res.json(brackets);
    }
    catch (error) {
        console.error('Get brackets error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'Server error', error: message });
    }
};
exports.getBrackets = getBrackets;
const createBracket = async (req, res) => {
    try {
        const { tournament, type, numberOfTeams } = req.body;
        const bracket = await Bracket_1.default.create({ tournament, type, numberOfTeams });
        res.status(201).json(bracket);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBracket = createBracket;
const generateBracket = async (req, res) => {
    try {
        const { teams } = req.body;
        if (!teams || teams.length === 0) {
            return res.status(400).json({ message: 'Teams are required' });
        }
        const bracket = await Bracket_1.default.findById(req.params.id);
        if (!bracket) {
            return res.status(404).json({ message: 'Bracket not found' });
        }
        // Explicitly type rounds as Round[]
        const rounds = [];
        const numRounds = Math.ceil(Math.log2(teams.length));
        for (let i = 0; i < numRounds; i++) {
            const round = {
                roundNumber: i + 1,
                matches: []
            };
            const numMatches = Math.pow(2, numRounds - 1 - i);
            for (let j = 0; j < numMatches; j++) {
                const match = {
                    id: `${i}-${j}`, // Simple ID generation
                    team1: teams[j * 2]?._id,
                    team2: teams[j * 2 + 1]?._id,
                    score1: 0,
                    score2: 0,
                    status: 'pending',
                };
                round.matches.push(match);
            }
            rounds.push(round);
        }
        bracket.rounds = rounds;
        await bracket.save();
        res.json(bracket);
    }
    catch (error) {
        console.error('Bracket generation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.generateBracket = generateBracket;
const updateBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bracket) {
            return res.status(404).json({ message: 'Bracket not found' });
        }
        res.json(bracket);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateBracket = updateBracket;
const deleteBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.findByIdAndDelete(req.params.id);
        if (!bracket) {
            return res.status(404).json({ message: 'Bracket not found' });
        }
        res.json({ message: 'Bracket deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteBracket = deleteBracket;
//# sourceMappingURL=bracketController.js.map