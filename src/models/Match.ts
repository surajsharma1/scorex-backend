import mongoose, { Schema, Document, Types } from 'mongoose';

// Represents a single delivery in the match for live scoring and undo features
export interface IBall {
  overNumber: number;
  ballNumber: number; // 1 to 6 (or more if extras)
  // Accept either ObjectId or player name string for flexibility
  bowler: Types.ObjectId | string;
  striker: Types.ObjectId | string;
  nonStriker: Types.ObjectId | string;
  runsOffBat: number; // 0, 1, 2, 3, 4, 5, 6, 7, etc.
  extras: number;
  extraType: 'None' | 'WD' | 'NB' | 'B' | 'LB' | 'Penalty';
  isWicket: boolean;
  wicketType: 'None' | 'Bowled' | 'Caught' | 'Stumped' | 'LBW' | 'Run Out' | 'Mankad' | 'Retired' | 'Hit Wicket' | 'Obstructing the Field' | 'Hit the Ball Twice' | 'Timed Out' | 'Over the Fence' | 'One Hand One Bounce';
  outPlayer?: Types.ObjectId | string;
  fielder?: Types.ObjectId | string;
  timestamp: Date;
}

// Individual Player Statistics
export interface IPlayerBattingStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal?: string;
  dismissalType?: string;
  fielder?: string;
  bowler?: string;
}

export interface IPlayerBowlingStats {
  playerId: string;
  playerName: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  wide: number;
  noBall: number;
}

// Enhanced Innings with full player stats
export interface IInnings {
  battingTeam: Types.ObjectId;
  bowlingTeam: Types.ObjectId;
  totalRuns: number;
  totalWickets: number;
  totalOversBowled: number; // e.g., 4.2
  extrasTotal: number;
  ballByBall: IBall[];
  // Full batting lineup with stats
  battingLineup: IPlayerBattingStats[];
  // Bowling lineup with stats
  bowlingLineup: IPlayerBowlingStats[];
  // Current players on field
  strikerId?: string;
  strikerName?: string;
  nonStrikerId?: string;
  nonStrikerName?: string;
  currentBowlerId?: string;
  currentBowlerName?: string;
  // Over tracking
  currentOverBalls: (number | string)[]; // Array of runs/wickets for current over
}

export interface IMatch extends Document {
  tournamentId: Types.ObjectId;
  matchName: string; // e.g., "Qualifier 1" or "Final"
  teamA: Types.ObjectId;
  teamB: Types.ObjectId;
  venue: string;
  matchDate: Date;
  
  // Format details
  format: 'T10' | 'T20' | 'Club' | '100' | 'ODI' | 'Test' | 'Custom';
  maxOvers: number;
  playersPerSide: number; // custom from 2 to 11
  customRules: {
    overTheFenceOut: boolean;
    lastManStanding: boolean;
  };

  // Live Match State
  toss: {
    winner?: Types.ObjectId;
    decision: 'Bat' | 'Bowl' | 'Pending';
  };
  // Player selections for the match
  playerSelections?: {
    team1Players: { id: string; name: string }[];
    team2Players: { id: string; name: string }[];
    battingOrder: string[]; // Array of player IDs in batting order
    bowlingOrder: string[]; // Array of player IDs in bowling order
  };
  currentInnings: 1 | 2 | 3 | 4; // 3 and 4 used for Test matches
  firstInnings?: IInnings;
  secondInnings?: IInnings;
  
  status: 'Scheduled' | 'Toss Completed' | 'First Innings' | 'Second Innings' | 'Completed' | 'Abandoned';
  result?: {
    winner?: Types.ObjectId;
    margin?: string; // e.g., "Team A won by 4 wickets"
    isDraw: boolean;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BallSchema = new Schema<IBall>({
  overNumber: { type: Number, required: true },
  ballNumber: { type: Number, required: true },
  // Accept either ObjectId or player name string for flexibility
  bowler: { type: Schema.Types.Mixed, required: true },
  striker: { type: Schema.Types.Mixed, required: true },
  nonStriker: { type: Schema.Types.Mixed, required: true },
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
  outPlayer: { type: Schema.Types.Mixed },
  fielder: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

// Player Stats Sub-schemas
const PlayerBattingStatsSchema = new Schema<IPlayerBattingStats>({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  dismissal: { type: String },
  dismissalType: { type: String },
  fielder: { type: String },
  bowler: { type: String }
});

const PlayerBowlingStatsSchema = new Schema<IPlayerBowlingStats>({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  overs: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  wide: { type: Number, default: 0 },
  noBall: { type: Number, default: 0 }
});

const InningsSchema = new Schema<IInnings>({
  battingTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  bowlingTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalOversBowled: { type: Number, default: 0 },
  extrasTotal: { type: Number, default: 0 },
  ballByBall: [BallSchema],
  battingLineup: [PlayerBattingStatsSchema],
  bowlingLineup: [PlayerBowlingStatsSchema],
  strikerId: { type: String },
  strikerName: { type: String },
  nonStrikerId: { type: String },
  nonStrikerName: { type: String },
  currentBowlerId: { type: String },
  currentBowlerName: { type: String },
  currentOverBalls: [{ type: Schema.Types.Mixed }]
});

// Player Selections Schema
const PlayerSelectionsSchema = new Schema({
  team1Players: [{
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  team2Players: [{
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  battingOrder: [{ type: String }],
  bowlingOrder: [{ type: String }]
});

const MatchSchema = new Schema<IMatch>({
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  matchName: { type: String, required: true },
  teamA: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  teamB: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
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
    overTheFenceOut: { type: Boolean, default: false },
    lastManStanding: { type: Boolean, default: false }
  },
  toss: {
    winner: { type: Schema.Types.ObjectId, ref: 'Team' },
    decision: { type: String, enum: ['Bat', 'Bowl', 'Pending'], default: 'Pending' }
  },
  playerSelections: PlayerSelectionsSchema,
  currentInnings: { type: Number, default: 1 },
  firstInnings: InningsSchema,
  secondInnings: InningsSchema,
  status: { 
    type: String, 
    enum: ['Scheduled', 'Toss Completed', 'First Innings', 'Second Innings', 'Completed', 'Abandoned'], 
    default: 'Scheduled' 
  },
  result: {
    winner: { type: Schema.Types.ObjectId, ref: 'Team' },
    margin: { type: String },
    isDraw: { type: Boolean, default: false }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<IMatch>('Match', MatchSchema);

