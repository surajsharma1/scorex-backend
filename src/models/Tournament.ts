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
  },
  { timestamps: true }
);

export default mongoose.model<ITournament>('Tournament', tournamentSchema);