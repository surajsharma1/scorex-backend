  import mongoose, { Document, Schema } from 'mongoose';

export interface IMatch extends Document {
  tournament: mongoose.Types.ObjectId;
  team1: mongoose.Types.ObjectId;
  team2: mongoose.Types.ObjectId;
  date: Date;
  venue?: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  score1?: number;
  score2?: number;
  wickets1?: number;
  wickets2?: number;
  overs1?: number;
  overs2?: number;
  winner?: mongoose.Types.ObjectId;
  tossWinner?: mongoose.Types.ObjectId;
  tossChoice?: 'bat' | 'bowl';
  matchType?: 'League' | 'Quarter-Final' | 'Semi-Final' | 'Final' | 'Playoff';

  videoLink?: string;
  commentary: string[];
  createdBy: mongoose.Types.ObjectId;
  
  // Striker/Non-striker fields for live scoring
  strikerName?: string;
  strikerRuns?: number;
  strikerBalls?: number;
  nonStrikerName?: string;
  nonStrikerRuns?: number;
  nonStrikerBalls?: number;
  
  // Computed stats
  currentRunRate?: number;
  requiredRunRate?: number;
  target?: number;
  lastFiveOvers?: string;
}


  const matchSchema = new Schema<IMatch>(
    {
      tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
      team1: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
      team2: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
      date: { type: Date, required: true },
      venue: String,
      status: { type: String, enum: ['scheduled', 'ongoing', 'completed'], default: 'scheduled' },
      score1: { type: Number, default: 0 },
      score2: { type: Number, default: 0 },
      wickets1: { type: Number, default: 0 },
      wickets2: { type: Number, default: 0 },
      overs1: { type: Number, default: 0 },
      overs2: { type: Number, default: 0 },
      winner: { type: Schema.Types.ObjectId, ref: 'Team' },
      tossWinner: { type: Schema.Types.ObjectId, ref: 'Team' },
      tossChoice: { type: String, enum: ['bat', 'bowl'] },
      matchType: { type: String, enum: ['League', 'Quarter-Final', 'Semi-Final', 'Final', 'Playoff'] },

      videoLink: String,
      commentary: [{ type: String, default: [] }],
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

      // Striker/Non-striker fields for live scoring
      strikerName: { type: String, default: '' },
      strikerRuns: { type: Number, default: 0 },
      strikerBalls: { type: Number, default: 0 },
      nonStrikerName: { type: String, default: '' },
      nonStrikerRuns: { type: Number, default: 0 },
      nonStrikerBalls: { type: Number, default: 0 },
      
      // Computed stats
      currentRunRate: { type: Number, default: 0 },
      requiredRunRate: { type: Number, default: 0 },
      target: { type: Number, default: 0 },
      lastFiveOvers: { type: String, default: '-' },

    },
    { timestamps: true }
  );

  // Add indexes for performance
  matchSchema.index({ tournament: 1 });
  matchSchema.index({ date: 1 });
  matchSchema.index({ status: 1 });
  matchSchema.index({ createdBy: 1 });
  matchSchema.index({ tournament: 1, date: -1 }); // Compound index for tournament matches by date

  export default mongoose.model<IMatch>('Match', matchSchema);
