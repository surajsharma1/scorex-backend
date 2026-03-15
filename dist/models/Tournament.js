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
exports.TournamentStatus = exports.TournamentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var TournamentType;
(function (TournamentType) {
    TournamentType["ROUND_ROBIN"] = "round_robin";
    TournamentType["KNOCKOUT"] = "knockout";
    TournamentType["LEAGUE"] = "league";
})(TournamentType || (exports.TournamentType = TournamentType = {}));
var TournamentStatus;
(function (TournamentStatus) {
    TournamentStatus["UPCOMING"] = "upcoming";
    TournamentStatus["ONGOING"] = "ongoing";
    TournamentStatus["COMPLETED"] = "completed";
})(TournamentStatus || (exports.TournamentStatus = TournamentStatus = {}));
const TournamentSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: Object.values(TournamentType), required: true },
    format: { type: String, required: true, enum: ['T10', 'T20', 'ODI', 'Test'] },
    status: { type: String, enum: Object.values(TournamentStatus), default: TournamentStatus.UPCOMING },
    organizer: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teams: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Team' }],
    matches: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Match' }],
    startDate: { type: Date, required: true },
    endDate: Date,
    venue: { type: String, required: true },
    prizePool: { type: Number, default: 0 },
    rules: { type: String },
    pointsTable: [mongoose_1.Schema.Types.Mixed],
    bracket: [mongoose_1.Schema.Types.Mixed]
}, { timestamps: true });
// Indexes
TournamentSchema.index({ organizer: 1 });
TournamentSchema.index({ type: 1, status: 1 });
TournamentSchema.index({ startDate: 1 });
// Generate knockout bracket algorithm (from spec)
TournamentSchema.methods.generateBracket = async function () {
    const teams = await mongoose_1.default.model('Team').find({ _id: { $in: this.teams } });
    if (teams.length === 0)
        throw new Error('No teams to generate bracket');
    // Shuffle teams for fair bracket
    const shuffledTeams = teams.sort(() => Math.random() - 0.5);
    let bracketRounds = [];
    let currentRound = [];
    let teamIndex = 0;
    // Handle non-power-of-2 byes
    const nextPowerOf2 = 2 ** Math.ceil(Math.log2(shuffledTeams.length));
    const byes = nextPowerOf2 - shuffledTeams.length;
    // Fill byes
    for (let i = 0; i < byes; i++) {
        currentRound.push({ team1: null, team2: shuffledTeams[teamIndex++], bye: true });
    }
    // Pair remaining teams
    while (teamIndex < shuffledTeams.length) {
        const team1 = shuffledTeams[teamIndex++];
        const team2 = shuffledTeams[teamIndex++];
        if (team2) {
            currentRound.push({ team1, team2, bye: false });
        }
    }
    bracketRounds.push({ round: 1, matches: currentRound });
    // Generate subsequent rounds (simplified - winners advance)
    let nextRoundTeams = [];
    currentRound.forEach(match => {
        if (match.bye) {
            nextRoundTeams.push(match.team2);
        }
        else {
            nextRoundTeams.push({ team1: match.team1, team2: match.team2 });
        }
    });
    // Continue until final
    let roundNum = 2;
    while (nextRoundTeams.length > 1) {
        const nextRoundMatches = [];
        for (let i = 0; i < nextRoundTeams.length; i += 2) {
            const team1 = nextRoundTeams[i];
            const team2 = nextRoundTeams[i + 1];
            if (team2) {
                nextRoundMatches.push({ team1, team2 });
            }
        }
        if (nextRoundMatches.length > 0) {
            bracketRounds.push({ round: roundNum++, matches: nextRoundMatches });
        }
        nextRoundTeams = nextRoundMatches.map(m => ({ winner: true })); // Placeholder
    }
    this.bracket = bracketRounds;
    await this.save();
};
// Calculate points table with NRR (Net Run Rate)
TournamentSchema.methods.calculatePointsTable = async function () {
    const teams = await mongoose_1.default.model('Team').find({ _id: { $in: this.teams } });
    const matches = await mongoose_1.default.model('Match').find({
        _id: { $in: this.matches },
        status: 'completed'
    });
    const pointsTable = teams.map(team => {
        const teamMatches = matches.filter(m => m.team1.toString() === team._id.toString() ||
            m.team2.toString() === team._id.toString());
        let points = 0, wins = 0, losses = 0, nr = 0;
        let runsFor = 0, runsAgainst = 0, oversFor = 0, oversAgainst = 0;
        teamMatches.forEach(match => {
            if (match.winner?.toString() === team._id.toString()) {
                wins++;
                points += 2;
            }
            else if (!match.winner) {
                losses++;
            }
            // Simplified NRR calc
            runsFor += match.team1Score || 0;
            runsAgainst += match.team2Score || 0;
            oversFor += (match.team1Overs || 0);
            oversAgainst += (match.team2Overs || 0);
        });
        const nrr = Math.pow((runsFor / runsAgainst), (1 / (oversFor / oversAgainst))) - 1;
        return {
            team: team._id,
            played: teamMatches.length,
            won: wins, lost: losses, nr,
            points,
            nrr: Number(nrr.toFixed(3))
        };
    }).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    this.pointsTable = pointsTable;
    await this.save();
};
// Convenience methods
TournamentSchema.methods.addTeam = async function (teamId) {
    if (!this.teams.includes(teamId)) {
        this.teams.push(teamId);
        await this.save();
    }
};
TournamentSchema.methods.isUserOwner = function (userId) {
    return this.organizer.toString() === userId;
};
exports.default = mongoose_1.default.model('Tournament', TournamentSchema);
//# sourceMappingURL=Tournament.js.map