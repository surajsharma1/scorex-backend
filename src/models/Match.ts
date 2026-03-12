/**
 * Match Model
 * Complete cricket match and scoring system
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

// ==========================================
// INTERFACES & TYPES
// ==========================================

// Out types per algorithm
export type OutType = 
  | 'caught' 
  | 'bowled' 
  | 'lbw' 
  | 'run out' 
  | 'stumped' 
  | 'hit wicket' 
  | 'obstructing the field' 
  | 'timed out' 
  | 'handled the ball';

// Extra types per algorithm
export type ExtraType = 'no ball' | 'wide' | 'bye' | 'leg bye';

// Match status
export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

// Match format
export type MatchFormat = 'T10' | 'T20' | 'ODI' | 'Test';

// Innings status
export type InningsStatus = 'pending' | 'in_progress' | 'completed';

export interface IBatsman {
  playerId: mongoose.Types.ObjectId;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  outType?: OutType;
  outBy?: mongoose.Types.ObjectId;
  outAtBalls?: number;
}

export interface IBowler {
  playerId: mongoose.Types.ObjectId;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface IExtras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

export interface IInnings {
  teamId: mongoose.Types.ObjectId;
  status: InningsStatus;
  score: number;
  wickets: number;
  overs: number;
  balls: number;
  runRate: number;
  requiredRuns?: number;
  requiredRunRate?: number;
  targetScore?: number;
  extras: IExtras;
  batsmen: IBatsman[];
  bowlers: IBowler[];
  fallOfWickets: {
    wicket: number;
    score: number;
    overs: number;
    playerId: mongoose.Types.ObjectId;
  }[];
  powerPlay?: {
    start: number;
    end: number;
    runs: number;
    wickets: number;
  };
}

export interface IOver {
  overNumber: number;
  bowlerId: mongoose.Types.ObjectId;
  runs: number;
  wickets: number;
  extras: number;
  balls: {
    runs: number;
    isWide: boolean;
    isNoBall: boolean;
    isWicket: boolean;
    outType?: OutType;
  }[];
}

export interface IMatch extends Document {
  // Basic Match Info
  name: string;
  tournamentId?: mongoose.Types.ObjectId;
  round?: string;
  matchNumber?: number;
  
  // Teams
  team1: mongoose.Types.ObjectId;
  team2: mongoose.Types.ObjectId;
  
  // Match Details
  venue: string;
  date: Date;
  time?: string;
  format: MatchFormat;
  status: MatchStatus;
  
  // Toss
  tossWinner?: mongoose.Types.ObjectId;
  tossDecision?: 'bat' | 'bowl';
  
  // Innings
  innings: IInnings[];
  currentInnings: number; // 1 or 2
  
  // Scores
  team1Score: number;
  team1Wickets: number;
  team1Overs: number;
  team2Score: number;
  team2Wickets: number;
  team2Overs: number;
  
  // Result
  winner?: mongoose.Types.ObjectId;
  resultType?: 'win' | 'draw' | 'tie' | 'no result';
  margin?: string;
  playerOfMatch?: mongoose.Types.ObjectId;
  
  // Live Scoring
  currentOver: number;
  currentBall: number;
  lastBowler?: mongoose.Types.ObjectId;
  striker?: mongoose.Types.ObjectId;
  nonStriker?: mongoose.Types.ObjectId;
  
  // Over History
  overHistory: IOver[];
  
  // Streaming
  streamUrl?: string;
  streamEmbedUrl?: string;
  
  // Overlay
  overlayId?: mongoose.Types.ObjectId;
  overlayUrl?: string;
  
  // Scorer
  scorerId?: mongoose.Types.ObjectId;
  
  // Notes
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual for scorecard compatibility (maps innings to scorecard format)
  scorecard?: {
    batting: Array<{
      playerId?: mongoose.Types.ObjectId;
      name?: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      isOut: boolean;
      outType?: string;
      dismissal?: string;
      teamId?: mongoose.Types.ObjectId;
    }>;
    bowling: Array<{
      fieldingStats: any;
      playerId?: mongoose.Types.ObjectId;
      name?: string;
      overs: number;
      runs: number;
      wickets: number;
      teamId?: mongoose.Types.ObjectId;
    }>;
  };
  
  // Methods
  startMatch(tossWinnerId: mongoose.Types.ObjectId, decision: 'bat' | 'bowl'): Promise<void>;
  addBall(ballData: {
    runs: number;
    isWide?: boolean;
    isNoBall?: boolean;
    isWicket?: boolean;
    outType?: OutType;
    byes?: number;
    legByes?: number;
  }): Promise<IMatch>;
  calculateRunRate(): number;
  calculateRequiredRunRate(): number | null;
  endInnings(): Promise<void>;
  endMatch(winnerId?: mongoose.Types.ObjectId, resultType?: string): Promise<void>;
  getScoreDisplay(): string;
  
  // Static methods (defined on model, not instance)
  getLiveMatches(): Promise<any[]>;
  getByTournament(tournamentId: mongoose.Types.ObjectId): Promise<any[]>;
  getByTeam(teamId: mongoose.Types.ObjectId): Promise<any[]>;
  getUpcoming(limit?: number): Promise<any[]>;
}

// ==========================================
// SUB-SCHEMAS
// ==========================================

const ExtrasSchema = new Schema({
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
  byes: { type: Number, default: 0 },
  legByes: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const BatsmanSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  outType: { type: String },
  outBy: { type: Schema.Types.ObjectId, ref: 'Player' },
  outAtBalls: { type: Number },
}, { _id: false });

const BowlerSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  overs: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
}, { _id: false });

const InningsSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
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
    playerId: { type: Schema.Types.ObjectId, ref: 'Player' }
  }],
  powerPlay: {
    start: { type: Number },
    end: { type: Number },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 }
  }
}, { _id: false });

const OverSchema = new Schema({
  overNumber: { type: Number, required: true },
  bowlerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
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

const MatchSchema: Schema = new Schema({
  // Basic Match Info
  name: { 
    type: String, 
    required: [true, 'Match name is required'],
    trim: true
  },
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament' },
  round: { type: String }, // e.g., 'Quarter Final', 'Semi Final', 'Final'
  matchNumber: { type: Number },
  
  // Teams
  team1: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team',
    required: [true, 'Team 1 is required']
  },
  team2: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team',
    required: [true, 'Team 2 is required']
  },
  
  // Match Details
  venue: { 
    type: String, 
    required: [true, 'Venue is required'],
    trim: true
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
  tossWinner: { type: Schema.Types.ObjectId, ref: 'Team' },
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
  winner: { type: Schema.Types.ObjectId, ref: 'Team' },
  resultType: { type: String, enum: ['win', 'draw', 'tie', 'no result'] },
  margin: { type: String },
  playerOfMatch: { type: Schema.Types.ObjectId, ref: 'Player' },
  
  // Live Scoring
  currentOver: { type: Number, default: 0 },
  currentBall: { type: Number, default: 0 },
  lastBowler: { type: Schema.Types.ObjectId, ref: 'Player' },
  striker: { type: Schema.Types.ObjectId, ref: 'Player' },
  nonStriker: { type: Schema.Types.ObjectId, ref: 'Player' },
  
  // Over History
  overHistory: [{ type: OverSchema }],
  
  // Streaming
  streamUrl: { type: String },
  streamEmbedUrl: { type: String },
  
  // Overlay
  overlayId: { type: Schema.Types.ObjectId, ref: 'Overlay' },
  overlayUrl: { type: String },
  
  // Scorer
  scorerId: { type: Schema.Types.ObjectId, ref: 'User' },
  
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
MatchSchema.virtual('title').get(function() {
  return this.name || `${this.team1} vs ${this.team2}`;
});

// Virtual for overs display format
MatchSchema.virtual('oversDisplay').get(function() {
  const overs = this.team1Overs;
  const wholeOvers = Math.floor(overs);
  const balls = Math.round((overs - wholeOvers) * 10);
  return `${wholeOvers}.${balls}`;
});

// Virtual for is live
MatchSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

// ==========================================
// METHODS
// ==========================================

// Start match after toss
MatchSchema.methods.startMatch = async function(
  tossWinnerId: mongoose.Types.ObjectId, 
  decision: 'bat' | 'bowl'
) {
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
MatchSchema.methods.addBall = async function(ballData: {
  runs: number;
  isWide?: boolean;
  isNoBall?: boolean;
  isWicket?: boolean;
  outType?: OutType;
  byes?: number;
  legByes?: boolean;
}) {
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
    const batsman = innings.batsmen.find(
      b => b.playerId.toString() === this.striker?.toString()
    );
    
    if (batsman) {
      batsman.runs += scoredRuns;
      batsman.balls += 1;
      
      if (runs === 4) batsman.fours += 1;
      if (runs === 6) batsman.sixes += 1;
    }
  }
  
  // Handle wicket
  if (isWicket && this.striker) {
    innings.wickets += 1;
    
    const batsman = innings.batsmen.find(
      b => b.playerId.toString() === this.striker?.toString()
    );
    
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
  } else {
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
MatchSchema.methods.calculateRunRate = function(): number {
  const innings = this.innings[0];
  if (!innings || innings.balls === 0) return 0;
  
  const overs = innings.balls / 6;
  innings.runRate = innings.score / overs;
  
  return innings.runRate;
};

// Calculate required run rate (for chase)
MatchSchema.methods.calculateRequiredRunRate = function(): number | null {
  const innings = this.innings[0];
  if (!innings || !innings.targetScore || innings.balls === 0) return null;
  
  const ballsRemaining = 120 - innings.balls; // Assuming T20
  if (ballsRemaining <= 0) return null;
  
  const runsNeeded = innings.targetScore - innings.score;
  innings.requiredRuns = runsNeeded;
  innings.requiredRunRate = (runsNeeded * 6) / ballsRemaining;
  
  return innings.requiredRunRate;
};

// End innings
MatchSchema.methods.endInnings = async function() {
  const innings = this.innings[0];
  if (!innings) return;
  
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
MatchSchema.methods.endMatch = async function(
  winnerId?: mongoose.Types.ObjectId,
  resultType?: string
) {
  if (winnerId) {
    this.winner = winnerId;
    this.resultType = resultType as any || 'win';
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
MatchSchema.methods.getScoreDisplay = function(): string {
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
MatchSchema.statics.getLiveMatches = function() {
  return this.find({ status: 'live' })
    .populate('team1', 'name shortName')
    .populate('team2', 'name shortName')
    .populate('tournamentId', 'name');
};

// Get matches by tournament
MatchSchema.statics.getByTournament = function(tournamentId: mongoose.Types.ObjectId) {
  return this.find({ tournamentId })
    .populate('team1', 'name shortName logo')
    .populate('team2', 'name shortName logo')
    .sort({ matchNumber: 1 });
};

// Get matches by team
MatchSchema.statics.getByTeam = function(teamId: mongoose.Types.ObjectId) {
  return this.find({
    $or: [{ team1: teamId }, { team2: teamId }]
  }).sort({ date: -1 });
};

// Get upcoming matches
MatchSchema.statics.getUpcoming = function(limit: number = 10) {
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

export default mongoose.model<IMatch>('Match', MatchSchema);

