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
    videoLink?: string;
    commentary: string[];
    createdBy: mongoose.Types.ObjectId;
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
      videoLink: String,
      commentary: [{ type: String, default: [] }],
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
