"use strict";
/**
 * Match Model
 * Complete cricket match and scoring system
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
const ExtrasSchema = new mongoose_1.Schema({
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
}, { _id: false });
const BatsmanSchema = new mongoose_1.Schema({
    playerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player', required: true },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    outType: { type: String },
    outBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    outAtBalls: { type: Number },
}, { _id: false });
const BowlerSchema = new mongoose_1.Schema({
    playerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player', required: true },
    overs: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
}, { _id: false });
const InningsSchema = new mongoose_1.Schema({
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    score: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runRate: { type: Number, default: 0 },
    requiredRuns: { type: Number },
    requiredRunRate: { type: Number },
    targetScore: { type: Number },
    extras: { type: ExtrasSchema, default: () => ({}) },
    batsmen: [{ type: BatsmanSchema }],
    bowlers: [{ type: BowlerSchema }],
    fallOfWickets: [{
            wicket: { type: Number },
            score: { type: Number },
            overs: { type: Number },
            playerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' }
        }],
    powerPlay: {
        start: { type: Number },
        end: { type: Number },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 }
    }
}, { _id: false });
const OverSchema = new mongoose_1.Schema({
    overNumber: { type: Number, required: true },
    bowlerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player', required: true },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    balls: [{
            runs: { type: Number },
            isWide: { type: Boolean },
            isNoBall: { type: Boolean },
            isWicket: { type: Boolean },
            outType: { type: String }
        }]
}, { _id: false });
// ==========================================
// MAIN SCHEMA
// ==========================================
const MatchSchema = new mongoose_1.Schema({
    // Basic Match Info
    name: {
        type: String,
        trim: true
    },
    tournamentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tournament' },
    round: { type: String }, // e.g., 'Quarter Final', 'Semi Final', 'Final'
    matchNumber: { type: Number },
    // Teams
    team1: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Team',
        required: [true, 'Team 1 is required']
    },
    team2: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Team',
        required: [true, 'Team 2 is required']
    },
    // Match Details
    venue: {
        type: String,
        trim: true,
        default: 'TBD'
    },
    date: {
        type: Date,
        required: [true, 'Match date is required']
    },
    time: { type: String },
    format: {
        type: String,
        enum: ['T10', 'T20', 'ODI', 'Test'],
        default: 'T20'
    },
    status: {
        type: String,
        enum: ['upcoming', 'live', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    // Toss
    tossWinner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
    tossDecision: { type: String, enum: ['bat', 'bowl'] },
    // Innings
    innings: [{ type: InningsSchema }],
    currentInnings: { type: Number, default: 1 },
    // Scores (denormalized for quick access)
    team1Score: { type: Number, default: 0 },
    team1Wickets: { type: Number, default: 0 },
    team1Overs: { type: Number, default: 0 },
    team2Score: { type: Number, default: 0 },
    team2Wickets: { type: Number, default: 0 },
    team2Overs: { type: Number, default: 0 },
    // Result
    winner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
    resultType: { type: String, enum: ['win', 'draw', 'tie', 'no result'] },
    margin: { type: String },
    playerOfMatch: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    // Live Scoring
    currentOver: { type: Number, default: 0 },
    currentBall: { type: Number, default: 0 },
    lastBowler: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    striker: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    nonStriker: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    // Over History
    overHistory: [{ type: OverSchema }],
    // Streaming
    streamUrl: { type: String },
    streamEmbedUrl: { type: String },
    // Overlay
    overlayId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Overlay' },
    overlayUrl: { type: String },
    // Scorer
    scorerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    // Notes
    notes: { type: String },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// ==========================================
// INDEXES
// ==========================================
MatchSchema.index({ tournamentId: 1 });
MatchSchema.index({ team1: 1, team2: 1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ date: 1 });
MatchSchema.index({ createdAt: -1 });
// ==========================================
// VIRTUALS
// ==========================================
// Virtual for match title
MatchSchema.virtual('title').get(function () {
    return this.name || `${this.team1} vs ${this.team2}`;
});
// Virtual for overs display format
MatchSchema.virtual('oversDisplay').get(function () {
    const overs = this.team1Overs;
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 10);
    return `${wholeOvers}.${balls}`;
});
// Virtual for is live
MatchSchema.virtual('isLive').get(function () {
    return this.status === 'live';
});
// ==========================================
// METHODS
// ==========================================
// Start match after toss
MatchSchema.methods.startMatch = async function (tossWinnerId, decision) {
    this.tossWinner = tossWinnerId;
    this.tossDecision = decision;
    this.status = 'live';
    // Initialize innings
    const battingTeam = decision === 'bat' ? tossWinnerId :
        (tossWinnerId.toString() === this.team1.toString() ? this.team2 : this.team1);
    const bowlingTeam = decision === 'bat' ?
        (tossWinnerId.toString() === this.team1.toString() ? this.team2 : this.team1) : tossWinnerId;
    this.innings = [
        {
            teamId: battingTeam,
            status: 'in_progress',
            score: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            runRate: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
            batsmen: [],
            bowlers: [],
            fallOfWickets: []
        }
    ];
    this.currentInnings = 1;
    this.currentOver = 0;
    this.currentBall = 0;
    await this.save();
};
// Add ball to match (core scoring algorithm)
MatchSchema.methods.addBall = async function (ballData) {
    if (this.status !== 'live') {
        throw new Error('Match is not live');
    }
    const innings = this.innings[0];
    if (!innings || innings.status === 'completed') {
        throw new Error('Innings not available');
    }
    const { runs, isWide, isNoBall, isWicket, outType, byes, legByes } = ballData;
    // Handle extras
    let totalExtras = 0;
    if (isWide) {
        innings.extras.wides += 1;
        totalExtras += runs + 1; // Wide + runs
    }
    if (isNoBall) {
        innings.extras.noBalls += 1;
        totalExtras += 1 + (runs || 0); // No ball + runs
    }
    if (byes) {
        innings.extras.byes += byes;
        totalExtras += byes;
    }
    if (legByes) {
        innings.extras.legByes += 1;
        totalExtras += 1;
    }
    // Update score
    const scoredRuns = (!isWide && !isNoBall) ? runs : 0;
    innings.score += scoredRuns + totalExtras;
    innings.extras.total = innings.extras.total + totalExtras;
    // Update ball count (only if not wide - wides don't count as legal balls)
    if (!isWide) {
        innings.balls += 1;
        this.currentBall = innings.balls % 6;
        this.currentOver = Math.floor(innings.balls / 6);
        innings.overs = this.currentOver + (this.currentBall / 10);
        // Handle over completion
        if (innings.balls % 6 === 0) {
            innings.overs = Math.floor(innings.balls / 6);
        }
    }
    // Update striker's stats
    if (this.striker && !isWide) {
        const batsman = innings.batsmen.find(b => b.playerId.toString() === this.striker?.toString());
        if (batsman) {
            batsman.runs += scoredRuns;
            batsman.balls += 1;
            if (runs === 4)
                batsman.fours += 1;
            if (runs === 6)
                batsman.sixes += 1;
        }
    }
    // Handle wicket
    if (isWicket && this.striker) {
        innings.wickets += 1;
        const batsman = innings.batsmen.find(b => b.playerId.toString() === this.striker?.toString());
        if (batsman) {
            batsman.isOut = true;
            batsman.outType = outType;
            batsman.outAtBalls = batsman.balls;
        }
        // Record fall of wicket
        innings.fallOfWickets.push({
            wicket: innings.wickets,
            score: innings.score,
            overs: innings.overs,
            playerId: this.striker
        });
    }
    // Calculate run rate
    this.calculateRunRate();
    // Update denormalized scores
    if (innings.teamId.toString() === this.team1.toString()) {
        this.team1Score = innings.score;
        this.team1Wickets = innings.wickets;
        this.team1Overs = innings.overs;
    }
    else {
        this.team2Score = innings.score;
        this.team2Wickets = innings.wickets;
        this.team2Overs = innings.overs;
    }
    // Handle strike rotation (odd runs)
    if (runs && runs % 2 === 1 && !isWide && !isNoBall && this.striker && this.nonStriker) {
        // Swap striker and non-striker
        const temp = this.striker;
        this.striker = this.nonStriker;
        this.nonStriker = temp;
    }
    await this.save();
    // Emit socket event for real-time update
    // This would be handled in the controller
    return this;
};
// Calculate run rate
MatchSchema.methods.calculateRunRate = function () {
    const innings = this.innings[0];
    if (!innings || innings.balls === 0)
        return 0;
    const overs = innings.balls / 6;
    innings.runRate = innings.score / overs;
    return innings.runRate;
};
// Calculate required run rate (for chase)
MatchSchema.methods.calculateRequiredRunRate = function () {
    const innings = this.innings[0];
    if (!innings || !innings.targetScore || innings.balls === 0)
        return null;
    const ballsRemaining = 120 - innings.balls; // Assuming T20
    if (ballsRemaining <= 0)
        return null;
    const runsNeeded = innings.targetScore - innings.score;
    innings.requiredRuns = runsNeeded;
    innings.requiredRunRate = (runsNeeded * 6) / ballsRemaining;
    return innings.requiredRunRate;
};
// End innings
MatchSchema.methods.endInnings = async function () {
    const innings = this.innings[0];
    if (!innings)
        return;
    innings.status = 'completed';
    // For second innings (chase), check if target reached
    if (this.currentInnings === 2) {
        if (innings.score >= (innings.targetScore || 0)) {
            // Team chased successfully
            this.winner = innings.teamId;
            this.resultType = 'win';
            await this.endMatch();
            return;
        }
        // Check if all out or overs completed
        if (innings.wickets >= 10 || innings.balls >= 120) {
            // Team lost
            const winningTeam = innings.teamId.toString() === this.team1.toString() ? this.team2 : this.team1;
            this.winner = winningTeam;
            this.resultType = 'win';
            await this.endMatch();
            return;
        }
    }
    await this.save();
};
// End match
MatchSchema.methods.endMatch = async function (winnerId, resultType) {
    if (winnerId) {
        this.winner = winnerId;
        this.resultType = resultType || 'win';
    }
    this.status = 'completed';
    // Mark innings as completed
    if (this.innings && this.innings.length > 0) {
        this.innings.forEach(innings => {
            innings.status = 'completed';
        });
    }
    await this.save();
};
// Get score display string
MatchSchema.methods.getScoreDisplay = function () {
    const team1Display = `${this.team1Score}/${this.team1Wickets}`;
    const team2Display = `${this.team2Score}/${this.team2Wickets}`;
    if (this.currentInnings === 1) {
        return `${team1Display} (${this.team1Overs.toFixed(1)})`;
    }
    return `${team1Display} (${this.team1Overs.toFixed(1)}) vs ${team2Display} (${this.team2Overs.toFixed(1)})`;
};
// ==========================================
// STATIC METHODS
// ==========================================
// Get live matches
MatchSchema.statics.getLiveMatches = function () {
    return this.find({ status: 'live' })
        .populate('team1', 'name shortName')
        .populate('team2', 'name shortName')
        .populate('tournamentId', 'name');
};
// Get matches by tournament
MatchSchema.statics.getByTournament = function (tournamentId) {
    return this.find({ tournamentId })
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .sort({ matchNumber: 1 });
};
// Get matches by team
MatchSchema.statics.getByTeam = function (teamId) {
    return this.find({
        $or: [{ team1: teamId }, { team2: teamId }]
    }).sort({ date: -1 });
};
// Get upcoming matches
MatchSchema.statics.getUpcoming = function (limit = 10) {
    return this.find({
        status: 'upcoming',
        date: { $gte: new Date() }
    })
        .populate('team1', 'name shortName')
        .populate('team2', 'name shortName')
        .sort({ date: 1 })
        .limit(limit);
};
// ==========================================
// EXPORT
// ==========================================
exports.default = mongoose_1.default.model('Match', MatchSchema);
//# sourceMappingURL=Match.js.map