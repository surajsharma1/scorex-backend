"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectScorer = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
const protectScorer = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const matchId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(matchId)) {
            return res.status(400).json({ success: false, message: 'Invalid match ID' });
        }
        const match = await Match_1.default.findById(matchId).populate('tournamentId');
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }
        // Check 1: Designated scorer
        if (match.scorerId && match.scorerId.equals(req.user._id)) {
            req.scorerMatch = match;
            return next();
        }
        // Check 2: Tournament organizer - FIXED ✅
        if (match.tournamentId) {
            const tournament = await Tournament_1.default.findById(match.tournamentId).select('organizer');
            if (tournament && tournament.organizer && tournament.organizer.equals(req.user._id)) {
                req.scorerMatch = match;
                return next();
            }
        }
        // Check 3: User is club/tournament admin (future club integration)
        // TODO: Add club membership check if match linked to club
        return res.status(403).json({
            success: false,
            message: 'Scorer authorization required. Only tournament creator/admin or designated scorer can update live scores.'
        });
    }
    catch (error) {
        console.error('Scorer auth error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.protectScorer = protectScorer;
