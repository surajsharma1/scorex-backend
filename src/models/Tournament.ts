import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  description?: string;
  format: string;
  startDate: Date;
  numberOfTeams: number;
  status: 'upcoming' | 'active' | 'completed';
  isLive: boolean;
  liveScores?: {
    team1: { name: string; score: number; wickets: number; overs: number };
    team2: { name: string; score: number; wickets: number; overs: number };
    currentRunRate: number;
    requiredRunRate: number;
    target: number;
    lastFiveOvers: string;
  };
  createdBy: mongoose.Types.ObjectId;
  deleted?: boolean;
}

const tournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true },
    description: String,
    format: { type: String, required: true },
    startDate: { type: Date, required: true },
    numberOfTeams: { type: Number, required: true },
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
    isLive: { type: Boolean, default: false },
    liveScores: {
      team1: { name: String, score: Number, wickets: Number, overs: Number },
      team2: { name: String, score: Number, wickets: Number, overs: Number },
      currentRunRate: Number,
      requiredRunRate: Number,
      target: Number,
      lastFiveOvers: String,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Add indexes for performance
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ startDate: 1 });
tournamentSchema.index({ createdBy: 1 });
tournamentSchema.index({ isLive: 1 });
tournamentSchema.index({ status: 1, startDate: -1 }); // Compound index for status and date sorting

export default mongoose.model<ITournament>('Tournament', tournamentSchema);