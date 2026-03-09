/**
 * Bracket Model
 * Tournament bracket system
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IBracket extends Document {
  tournament: mongoose.Types.ObjectId;
  type: 'knockout' | 'double_elimination' | 'round_robin';
  rounds: {
    name: string;
    matches: {
      matchId: mongoose.Types.ObjectId;
      team1?: mongoose.Types.ObjectId;
      team2?: mongoose.Types.ObjectId;
      winner?: mongoose.Types.ObjectId;
      nextMatchId?: mongoose.Types.ObjectId;
    }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BracketSchema: Schema = new Schema({
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  type: { type: String, enum: ['knockout', 'double_elimination', 'round_robin'], required: true },
  rounds: [{
    name: { type: String, required: true },
    matches: [{
      matchId: { type: Schema.Types.ObjectId, ref: 'Match' },
      team1: { type: Schema.Types.ObjectId, ref: 'Team' },
      team2: { type: Schema.Types.ObjectId, ref: 'Team' },
      winner: { type: Schema.Types.ObjectId, ref: 'Team' },
      nextMatchId: { type: Schema.Types.ObjectId, ref: 'Match' }
    }]
  }]
}, { timestamps: true });

BracketSchema.index({ tournament: 1 });

export default mongoose.model<IBracket>('Bracket', BracketSchema);

