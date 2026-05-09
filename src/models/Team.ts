import mongoose, { Schema, Document, Model } from 'mongoose';

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

  /**
   * Sequential number for this team within its tournament.
   * Tournament-scoped auto-increment: first team in a tournament gets 1,
   * second gets 2, and so on. Cross-tournament there is no collision because
   * the counter resets per tournament.
   */
  teamNumber: number;

  /**
   * Per-team auto-incrementing counter so we can assign a unique
   * playerNumber to each new player added to this team.
   * Starts at 0; we pre-increment before assigning.
   */
  nextPlayerNumber: number;

  // Methods
  addPlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
  removePlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
  updateStats(): Promise<void>;
}

const TeamSchema = new Schema<ITeam>({
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  shortName:   { type: String, required: true, maxlength: 4 },
  logo:        { type: String },
  tournamentId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', index: true },
  players:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  captain:     { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },

  // Sequential team number scoped to a tournament (assigned by teamController)
  teamNumber: { type: Number, default: 0 },

  // Counter used to hand out unique per-team player numbers
  nextPlayerNumber: { type: Number, default: 0 },

  stats: {
    matchesPlayed:  { type: Number, default: 0 },
    matchesWon:     { type: Number, default: 0 },
    tournamentWins: { type: Number, default: 0 },
    totalRuns:      { type: Number, default: 0 },
    totalWickets:   { type: Number, default: 0 },
  },
  tournamentStats: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon:    { type: Number, default: 0 },
  },
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
}, { timestamps: true });

// Indexes
TeamSchema.index({ tournamentId: 1 });
TeamSchema.index({ name: 1 });
// Non-unique index — just for query performance when fetching teams by tournament
TeamSchema.index({ tournamentId: 1, teamNumber: 1 });

// ─── Methods ──────────────────────────────────────────────────────────────

TeamSchema.methods.addPlayer = async function(
  playerId: mongoose.Types.ObjectId
): Promise<void> {
  if (!this.players.includes(playerId)) {
    this.players.push(playerId);
    await this.save();
  }
};

TeamSchema.methods.removePlayer = async function(
  playerId: mongoose.Types.ObjectId
): Promise<void> {
  this.players = this.players.filter((p: mongoose.Types.ObjectId) => !p.equals(playerId));
  await this.save();
};

TeamSchema.methods.updateStats = async function(): Promise<void> {
  const Match = mongoose.model('Match');
  const matches = await Match.find({
    $or: [{ team1: this._id }, { team2: this._id }],
    status: 'completed',
  });

  let wins = 0;
  const played = matches.length;
  matches.forEach((match: any) => {
    if (match.winner?.equals(this._id)) wins++;
  });

  this.stats.matchesPlayed = played;
  this.stats.matchesWon    = wins;
  await this.save();
};

export default mongoose.model<ITeam>('Team', TeamSchema);