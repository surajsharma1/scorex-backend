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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const BallSchema = new mongoose_1.Schema({
    overNumber: { type: Number, required: true },
    ballNumber: { type: Number, required: true },
    bowler: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player', required: true },
    striker: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player', required: true },
    nonStriker: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player', required: true },
    runsOffBat: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    extraType: { type: String, enum: ['None', 'WD', 'NB', 'B', 'LB', 'Penalty'], default: 'None' },
    isWicket: { type: Boolean, default: false },
    wicketType: {
        type: String,
        enum: [
            'None', 'Bowled', 'Caught', 'Stumped', 'LBW', 'Run Out',
            'Mankad', 'Retired', 'Hit Wicket', 'Obstructing the Field',
            'Hit the Ball Twice', 'Timed Out', 'Over the Fence', 'One Hand One Bounce'
        ],
        default: 'None'
    },
    outPlayer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    fielder: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    timestamp: { type: Date, default: Date.now }
});
const InningsSchema = new mongoose_1.Schema({
    battingTeam: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
    bowlingTeam: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOversBowled: { type: Number, default: 0 },
    extrasTotal: { type: Number, default: 0 },
    ballByBall: [BallSchema]
});
const MatchSchema = new mongoose_1.Schema({
    tournamentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    matchName: { type: String, required: true },
    teamA: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true },
    teamB: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true },
    venue: { type: String, required: true },
    matchDate: { type: Date, required: true },
    format: {
        type: String,
        enum: ['T10', 'T20', 'Club', '100', 'ODI', 'Test', 'Custom'],
        required: true
    },
    maxOvers: { type: Number, required: true },
    playersPerSide: { type: Number, min: 2, max: 11, default: 11 },
    customRules: {
        lastManStanding: { type: Boolean, default: false }
    },
    toss: {
        winner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
        decision: { type: String, enum: ['Bat', 'Bowl', 'Pending'], default: 'Pending' }
    },
    currentInnings: { type: Number, default: 1 },
    firstInnings: InningsSchema,
    secondInnings: InningsSchema,
    status: {
        type: String,
        enum: ['Scheduled', 'Toss Completed', 'First Innings', 'Second Innings', 'Completed', 'Abandoned'],
        default: 'Scheduled'
    },
    result: {
        winner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
        margin: { type: String },
        isDraw: { type: Boolean, default: false }
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('Match', MatchSchema);
//# sourceMappingURL=Match.js.map