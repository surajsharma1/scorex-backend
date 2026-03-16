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
const TeamSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    shortName: { type: String, required: true, maxlength: 4 },
    logo: { type: String },
    tournamentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Tournament', index: true },
    players: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Player' }],
    captain: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Player' },
    stats: {
        matchesPlayed: { type: Number, default: 0 },
        matchesWon: { type: Number, default: 0 },
        tournamentWins: { type: Number, default: 0 },
        totalRuns: { type: Number, default: 0 },
        totalWickets: { type: Number, default: 0 }
    },
    tournamentStats: {
        matchesPlayed: { type: Number, default: 0 },
        matchesWon: { type: Number, default: 0 }
    }
}, { timestamps: true });
// Indexes
TeamSchema.index({ tournamentId: 1 });
TeamSchema.index({ name: 1 });
// Methods
TeamSchema.methods.addPlayer = async function (playerId) {
    if (!this.players.includes(playerId)) {
        this.players.push(playerId);
        await this.save();
    }
};
TeamSchema.methods.removePlayer = async function (playerId) {
    this.players = this.players.filter(p => !p.equals(playerId));
    await this.save();
};
TeamSchema.methods.updateStats = async function () {
    // Fetch stats from matches (simplified)
    const Match = mongoose_1.default.model('Match');
    const matches = await Match.find({
        $or: [{ team1: this._id }, { team2: this._id }],
        status: 'completed'
    });
    let wins = 0, played = matches.length;
    matches.forEach(match => {
        if (match.winner?.equals(this._id))
            wins++;
    });
    this.stats.matchesPlayed = played;
    this.stats.matchesWon = wins;
    await this.save();
};
exports.default = mongoose_1.default.model('Team', TeamSchema);
