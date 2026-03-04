import mongoose, { Schema, Document, Types } from 'mongoose';

// Represents a single delivery in the match for live scoring and undo features
export interface IBall {
  overNumber: number;
  ballNumber: number; // 1 to 6 (or more if extras)
  bowler: Types.ObjectId;
  striker: Types.ObjectId;
  nonStriker: Types.ObjectId;
  runsOffBat: number; // 0, 1, 2, 3, 4, 5, 6, 7, etc.
  extras: number;
  extraType: 'None' | 'WD' | 'NB' | 'B' | 'LB' | 'Penalty';
  isWicket: boolean;
  wicketType: 'None' | 'Bowled' | 'Caught' | 'Stumped' | 'LBW' | 'Run Out' | 'Mankad' | 'Retired' | 'Hit Wicket' | 'Obstructing the Field' | 'Hit the Ball Twice' | 'Timed Out' | 'Over the Fence' | 'One Hand One Bounce';
  outPlayer?: Types.ObjectId;
  fielder?: Types.ObjectId;
  timestamp: Date;
}

export interface IInnings {
  battingTeam: Types.ObjectId;
  bowlingTeam: Types.ObjectId;
  totalRuns: number;
  totalWickets: number;
  totalOversBowled: number; // e.g., 4.2
  extrasTotal: number;
  ballByBall: IBall[];
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
  bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  striker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  nonStriker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
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
  outPlayer: { type: Schema.Types.ObjectId, ref: 'Player' },
  fielder: { type: Schema.Types.ObjectId, ref: 'Player' },
  timestamp: { type: Date, default: Date.now }
});

const InningsSchema = new Schema<IInnings>({
  battingTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  bowlingTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalOversBowled: { type: Number, default: 0 },
  extrasTotal: { type: Number, default: 0 },
  ballByBall: [BallSchema]
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