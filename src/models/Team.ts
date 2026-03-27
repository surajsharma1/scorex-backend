import mongoose, { Schema, Document, Model } from 'mongoose';

interface IPlayerStats {
  matches: number;
  runs: number;
  wickets: number;
  average: number;
  strikeRate: number;
}

interface ITeamStats {
  matchesPlayed: number;
  matchesWon: number;
  tournamentWins: number;
  totalRuns: number;
  totalWickets: number;
}

interface ITeam extends Document {
  name: string;
  shortName: string;
  logo?: string;
  tournamentId?: mongoose.Types.ObjectId;
  players: mongoose.Types.ObjectId[];
  captain?: mongoose.Types.ObjectId;
  stats: ITeamStats;
  tournamentStats?: ITeamStats;
  matches?: mongoose.Types.ObjectId[];

  // Methods
  addPlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
  removePlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
  updateStats(): Promise<void>;
}

const TeamSchema = new Schema<ITeam>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  shortName: { type: String, required: true, maxlength: 4 },
  logo: { type: String },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', index: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  captain: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
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
    },
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
}, { timestamps: true });

// Indexes
TeamSchema.index({ tournamentId: 1 });
TeamSchema.index({ name: 1 });

// Methods
TeamSchema.methods.addPlayer = async function(playerId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.players.includes(playerId)) {
    this.players.push(playerId);
    await this.save();
  }
};

TeamSchema.methods.removePlayer = async function(playerId: mongoose.Types.ObjectId): Promise<void> {
  this.players = this.players.filter(p => !p.equals(playerId));
  await this.save();
};

TeamSchema.methods.updateStats = async function(): Promise<void> {
  // Fetch stats from matches (simplified)
  const Match = mongoose.model('Match');
  const matches = await Match.find({
    $or: [{ team1: this._id }, { team2: this._id }],
    status: 'completed'
  });
  
  let wins = 0, played = matches.length;
  matches.forEach(match => {
    if (match.winner?.equals(this._id)) wins++;
  });
  
  this.stats.matchesPlayed = played;
  this.stats.matchesWon = wins;
  await this.save();
};

export default mongoose.model<ITeam>('Team', TeamSchema);

