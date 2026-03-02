import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  description?: string;
  format: string; // T20, ODI, Test
  startDate: Date;
  endDate?: Date;
  status: 'upcoming' | 'ongoing' | 'completed'; // Changed 'active' to 'ongoing' for frontend compatibility
  
  // Relationships
  teams: mongoose.Types.ObjectId[];
  organizer: mongoose.Types.ObjectId; // Renamed from createdBy to match Controller
  matches: mongoose.Types.ObjectId[];

// Live Data for Ticker/Carousel
  isLive: boolean;
  liveMatchUrl?: string;
  
  // Live Scores - stored for Scoreboard/Overlay
  liveScores?: {
    team1: {
      name: string;
      score: number;
      wickets: number;
      overs: number;
      balls: number;
      batsmen: any[];
      bowler: any | null;
    };
    team2: {
      name: string;
      score: number;
      wickets: number;
      overs: number;
      balls: number;
    };
    battingTeam: 'team1' | 'team2';
    currentRunRate: number;
    requiredRunRate: number;
    target: number;
    lastFiveOvers: string;
    innings: number;
  };
  
  // Soft Delete
  deleted: boolean;
  deletedAt?: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    format: { type: String, required: true, default: 'T20' },
    
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    
    status: { 
      type: String, 
      enum: ['upcoming', 'ongoing', 'completed'], 
      default: 'upcoming',
      index: true 
    },

    // Arrays of IDs
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
    
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

isLive: { type: Boolean, default: false },
    liveMatchUrl: { type: String },

    // Live Scores field for Scoreboard/Overlay
    liveScores: { type: Schema.Types.Mixed },

    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for Dashboard & Ticker Performance
tournamentSchema.index({ status: 1, startDate: -1 }); // Fast sorting for "Live/Upcoming"
tournamentSchema.index({ deleted: 1, status: 1 });

export default mongoose.model<ITournament>('Tournament', tournamentSchema);