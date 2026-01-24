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
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBrackets = getBrackets;
const createBracket = async (req, res) => {
    try {
        const bracket = await Bracket_1.default.create({
            ...req.body,
            createdBy: req.user?._id,
        });
        res.status(201).json(bracket);
    }
    catch (error) {
        console.error('Create bracket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBracket = createBracket;
const generateBracket = async (req, res) => {
    try {
        const { tournamentId, teams } = req.body;
        const bracket = await Bracket_1.default.findByIdAndUpdate(req.params.id, {
            tournament: tournamentId,
            teams: teams,
            status: 'generated'
        }, { new: true });
        if (!bracket) {
            res.status(404).json({ message: 'Bracket not found' });
            return;
        }
        res.json(bracket);
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