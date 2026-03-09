"use strict";
/**
 * Team Model
 * Team management with players
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
const TournamentStatsSchema = new mongoose_1.Schema({
    tournamentsPlayed: { type: Number, default: 0 },
    tournamentsWon: { type: Number, default: 0 },
    tournamentsLost: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    matchesTied: { type: Number, default: 0 },
    matchesNoResult: { type: Number, default: 0 },
}, { _id: false });
// ==========================================
// MAIN SCHEMA
// ==========================================
const TeamSchema = new mongoose_1.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true,
        maxlength: [100, 'Team name cannot exceed 100 characters']
    },
    shortName: {
        type: String,
        trim: true,
        maxlength: [10, 'Short name cannot exceed 10 characters']
    },
    logo: { type: String },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    // Team Details
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Team owner is required']
    },
    captain: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    viceCaptain: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Player' },
    // Players
    players: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Player'
        }],
    // Tournament Performance
    tournamentStats: {
        type: TournamentStatsSchema,
        default: () => ({})
    },
    // Points (for tournament leaderboard)
    points: { type: Number, default: 0 },
    netRunRate: { type: Number, default: 0 },
    // Status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    // Tournaments
    tournaments: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tournament'
        }],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// ==========================================
// INDEXES
// ==========================================
TeamSchema.index({ name: 'text' });
TeamSchema.index({ owner: 1 });
TeamSchema.index({ players: 1 });
TeamSchema.index({ tournaments: 1 });
TeamSchema.index({ points: -1 });
TeamSchema.index({ isActive: 1 });
// ==========================================
// VIRTUALS
// ==========================================
// Virtual for player count
TeamSchema.virtual('playerCount').get(function () {
    return this.players ? this.players.length : 0;
});
// Virtual for win rate
TeamSchema.virtual('winRate').get(function () {
    const stats = this.tournamentStats;
    if (!stats || stats.matchesPlayed === 0)
        return 0;
    return (stats.matchesWon / stats.matchesPlayed) * 100;
});
// Virtual for formatted name
TeamSchema.virtual('displayName').get(function () {
    return this.shortName || this.name;
});
// ==========================================
// METHODS
// ==========================================
// Add player to team
TeamSchema.methods.addPlayer = async function (playerId) {
    if (!this.players.includes(playerId)) {
        this.players.push(playerId);
        await this.save();
    }
};
// Remove player from team
TeamSchema.methods.removePlayer = async function (playerId) {
    this.players = this.players.filter(p => p.toString() !== playerId.toString());
    await this.save();
};
// Calculate team statistics from matches
TeamSchema.methods.calculateStats = async function () {
    const Match = mongoose_1.default.model('Match');
    // Get all matches for this team
    const matches = await Match.find({
        $or: [
            { team1: this._id },
            { team2: this._id }
        ],
        status: 'completed'
    });
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let noResults = 0;
    let totalRunsScored = 0;
    let totalOversFaced = 0;
    let totalRunsConceded = 0;
    let totalOversBowled = 0;
    for (const match of matches) {
        const isTeam1 = match.team1.toString() === this._id.toString();
        const ourRuns = isTeam1 ? match.team1Score : match.team2Score;
        const opponentRuns = isTeam1 ? match.team2Score : match.team1Score;
        const ourOvers = isTeam1 ? match.team1Overs : match.team2Overs;
        const opponentOvers = isTeam1 ? match.team2Overs : match.team1Overs;
        totalRunsScored += ourRuns || 0;
        totalOversFaced += ourOvers || 0;
        totalRunsConceded += opponentRuns || 0;
        totalOversBowled += opponentOvers || 0;
        if (ourRuns > opponentRuns) {
            wins++;
        }
        else if (opponentRuns > ourRuns) {
            losses++;
        }
        else if (match.isNoResult) {
            noResults++;
        }
        else {
            ties++;
        }
    }
    // Update stats
    this.tournamentStats = {
        tournamentsPlayed: this.tournaments?.length || 0,
        tournamentsWon: 0, // Calculated separately
        tournamentsLost: 0,
        matchesPlayed: matches.length,
        matchesWon: wins,
        matchesLost: losses,
        matchesTied: ties,
        matchesNoResult: noResults
    };
    // Calculate points (2 for win, 1 for tie/no result, 0 for loss)
    this.points = (wins * 2) + (ties * 1) + (noResults * 1);
    // Calculate net run rate
    if (totalOversFaced > 0 && totalOversBowled > 0) {
        const runRateScored = totalRunsScored / totalOversFaced;
        const runRateConceded = totalRunsConceded / totalOversBowled;
        this.netRunRate = runRateScored - runRateConceded;
    }
    await this.save();
};
// ==========================================
// STATIC METHODS
// ==========================================
// Get top teams by points
TeamSchema.statics.getTopTeams = function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ points: -1 })
        .populate('owner', 'username email')
        .populate('players')
        .limit(limit);
};
// Get teams by owner
TeamSchema.statics.getByOwner = function (ownerId) {
    return this.find({ owner: ownerId, isActive: true })
        .populate('players');
};
// Get teams by tournament
TeamSchema.statics.getByTournament = function (tournamentId) {
    return this.find({ tournaments: tournamentId, isActive: true })
        .populate('players');
};
// Search teams
TeamSchema.statics.search = function (query) {
    return this.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { shortName: { $regex: query, $options: 'i' } }
        ],
        isActive: true
    });
};
// ==========================================
// EXPORT
// ==========================================
exports.default = mongoose_1.default.model('Team', TeamSchema);
//# sourceMappingURL=Team.js.map