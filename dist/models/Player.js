"use strict";
/**
 * Player Model
 * Cricket player profile and statistics
 * Following PROJECT_ALGORITHM.md specifications
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// ==========================================
// SUB-SCHEMAS
// ==========================================
const BattingStatsSchema = new mongoose_1.Schema({
    totalMatches: { type: Number, default: 0 },
    totalInnings: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    doubles: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
}, { _id: false });
const BowlingStatsSchema = new mongoose_1.Schema({
    totalMatches: { type: Number, default: 0 },
    totalInnings: { type: Number, default: 0 },
    totalOvers: { type: Number, default: 0 },
    totalMaidens: { type: Number, default: 0 },
    totalRunsConceded: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    bestBowling: {
        wickets: { type: Number, default: 0 },
        runs: { type: Number, default: 0 }
    },
    fiveWickets: { type: Number, default: 0 },
}, { _id: false });
const FieldingStatsSchema = new mongoose_1.Schema({
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
}, { _id: false });
const PointsSchema = new mongoose_1.Schema({
    total: { type: Number, default: 0 },
    batting: { type: Number, default: 0 },
    bowling: { type: Number, default: 0 },
    fielding: { type: Number, default: 0 },
}, { _id: false });
// ==========================================
// MAIN SCHEMA
// ==========================================
const PlayerSchema = new mongoose_1.Schema({
    // Personal Information
    name: {
        type: String,
        required: [true, 'Player name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    nationality: { type: String, trim: true },
    profilePicture: { type: String },
    // Cricket Role
    role: {
        type: String,
        enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper', 'batsman-wicket-keeper'],
        required: [true, 'Player role is required'],
        default: 'batsman'
    },
    jerseyNumber: { type: Number },
    // Statistics
    battingStats: { type: BattingStatsSchema, default: () => ({}) },
    bowlingStats: { type: BowlingStatsSchema, default: () => ({}) },
    fieldingStats: { type: FieldingStatsSchema, default: () => ({}) },
    points: { type: PointsSchema, default: () => ({}) },
    // Team Association
    teams: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' }],
    // User Association
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    // Status
    isActive: { type: Boolean, default: true },
    lastMatchDate: { type: Date },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// ==========================================
// INDEXES
// ==========================================
PlayerSchema.index({ name: 'text' });
PlayerSchema.index({ teams: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ role: 1 });
PlayerSchema.index({ 'points.total': -1 });
PlayerSchema.index({ isActive: 1 });
// ==========================================
// VIRTUALS
// ==========================================
// Virtual for formatted name
PlayerSchema.virtual('formattedName').get(function () {
    return this.name;
});
// Virtual for age
PlayerSchema.virtual('age').get(function () {
    if (!this.dateOfBirth)
        return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});
// ==========================================
// METHODS
// ==========================================
// Calculate total points (per algorithm: Runs×1 + Fours×1 + Sixes×2 + Wickets×10 + Catches×5)
PlayerSchema.methods.calculateTotalPoints = function () {
    const batting = this.battingStats || {};
    const bowling = this.bowlingStats || {};
    const fielding = this.fieldingStats || {};
    // Batting points: 1 per run, 1 per four, 2 per six
    const battingPoints = (batting.totalRuns || 0) * 1 +
        (batting.fours || 0) * 1 +
        (batting.sixes || 0) * 2;
    // Bowling points: 10 per wicket, 5 per maiden
    const bowlingPoints = (bowling.totalWickets || 0) * 10 +
        (bowling.totalMaidens || 0) * 5;
    // Fielding points: 5 per catch, 5 per run out, 5 per stumping
    const fieldingPoints = (fielding.catches || 0) * 5 +
        (fielding.runOuts || 0) * 5 +
        (fielding.stumpings || 0) * 5;
    const total = battingPoints + bowlingPoints + fieldingPoints;
    // Update the points field
    this.points = {
        total,
        batting: battingPoints,
        bowling: bowlingPoints,
        fielding: fieldingPoints
    };
    return total;
};
// Update stats after a match
PlayerSchema.methods.updateStats = async function (matchResult) {
    // Update batting stats
    if (matchResult.batting) {
        const bs = this.battingStats || {};
        bs.totalInnings = (bs.totalInnings || 0) + 1;
        bs.totalRuns = (bs.totalRuns || 0) + (matchResult.batting.runs || 0);
        bs.fours = (bs.fours || 0) + (matchResult.batting.fours || 0);
        bs.sixes = (bs.sixes || 0) + (matchResult.batting.sixes || 0);
        if (matchResult.batting.runs > (bs.highestScore || 0)) {
            bs.highestScore = matchResult.batting.runs;
        }
        if (!matchResult.batting.notOut) {
            bs.notOuts = (bs.notOuts || 0) + 1;
        }
        // Calculate strike rate
        const totalBalls = (bs.totalRuns / (bs.strikeRate || 1)) * 100;
        if (matchResult.batting.balls && matchResult.batting.runs) {
            bs.strikeRate = (matchResult.batting.runs / matchResult.batting.balls) * 100;
        }
        // Count fifties, hundreds, doubles
        if (matchResult.batting.runs >= 200) {
            bs.doubles = (bs.doubles || 0) + 1;
        }
        else if (matchResult.batting.runs >= 100) {
            bs.hundreds = (bs.hundreds || 0) + 1;
        }
        else if (matchResult.batting.runs >= 50) {
            bs.fifties = (bs.fifties || 0) + 1;
        }
        // Calculate average
        const outs = (bs.notOuts || 0);
        if (bs.totalInnings > outs) {
            bs.average = bs.totalRuns / (bs.totalInnings - outs);
        }
        this.battingStats = bs;
    }
    // Update bowling stats
    if (matchResult.bowling) {
        const bos = this.bowlingStats || {};
        bos.totalInnings = (bos.totalInnings || 0) + 1;
        bos.totalOvers = (bos.totalOvers || 0) + (matchResult.bowling.overs || 0);
        bos.totalMaidens = (bos.totalMaidens || 0) + (matchResult.bowling.maidens || 0);
        bos.totalRunsConceded = (bos.totalRunsConceded || 0) + (matchResult.bowling.runsConceded || 0);
        bos.totalWickets = (bos.totalWickets || 0) + (matchResult.bowling.wickets || 0);
        // Best bowling
        if (matchResult.bowling.wickets > (bos.bestBowling?.wickets || 0) ||
            (matchResult.bowling.wickets === (bos.bestBowling?.wickets || 0) &&
                matchResult.bowling.runsConceded < (bos.bestBowling?.runs || 0))) {
            bos.bestBowling = {
                wickets: matchResult.bowling.wickets,
                runs: matchResult.bowling.runsConceded
            };
        }
        // Five wickets
        if (matchResult.bowling.wickets >= 5) {
            bos.fiveWickets = (bos.fiveWickets || 0) + 1;
        }
        // Calculate economy
        if (bos.totalOvers > 0) {
            bos.economy = bos.totalRunsConceded / bos.totalOvers;
        }
        // Calculate average
        if (bos.totalWickets > 0) {
            bos.average = bos.totalRunsConceded / bos.totalWickets;
        }
        // Calculate strike rate
        if (bos.totalWickets > 0) {
            bos.strikeRate = (bos.totalOvers * 6) / bos.totalWickets;
        }
        this.bowlingStats = bos;
    }
    // Update fielding stats
    if (matchResult.fielding) {
        const fs = this.fieldingStats || {};
        fs.catches = (fs.catches || 0) + (matchResult.fielding.catches || 0);
        fs.runOuts = (fs.runOuts || 0) + (matchResult.fielding.runOuts || 0);
        fs.stumpings = (fs.stumpings || 0) + (matchResult.fielding.stumpings || 0);
        this.fieldingStats = fs;
    }
    // Recalculate points
    this.calculateTotalPoints();
    await this.save();
};
// ==========================================
// STATIC METHODS
// ==========================================
// Get top players by points
PlayerSchema.statics.getTopPlayers = function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ 'points.total': -1 })
        .limit(limit)
        .populate('teams');
};
// Get players by team
PlayerSchema.statics.getByTeam = function (teamId) {
    return this.find({ teams: teamId, isActive: true });
};
// Get players by role
PlayerSchema.statics.getByRole = function (role) {
    return this.find({ role, isActive: true });
};
// Search players
PlayerSchema.statics.search = function (query) {
    return this.find({
        name: { $regex: query, $options: 'i' },
        isActive: true
    });
};
// ==========================================
// EXPORT
// ==========================================
exports.default = mongoose_1.default.model('Player', PlayerSchema);
