import mongoose, { Document, Schema } from 'mongoose';

export interface IBracket extends Document {
  tournament: mongoose.Types.ObjectId;
  type: 'single-elimination' | 'double-elimination' | 'round-robin' | 'group-knockout';
  rounds: {
    roundNumber: number;
    matches: {
      id: string;
      team1?: mongoose.Types.ObjectId;
      team2?: mongoose.Types.ObjectId;
      winner?: mongoose.Types.ObjectId;
      score1?: number;
      score2?: number;
      status: 'pending' | 'in-progress' | 'completed';
    }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BracketSchema: Schema = new Schema({
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  type: { 
    type: String, 
    enum: ['single-elimination', 'double-elimination', 'round-robin', 'group-knockout'], 
    required: true 
  },
  rounds: [{
    roundNumber: { type: Number, required: true },
    matches: [{
      id: { type: String, required: true },
      team1: { type: Schema.Types.ObjectId, ref: 'Team' },
      team2: { type: Schema.Types.ObjectId, ref: 'Team' },
      winner: { type: Schema.Types.ObjectId, ref: 'Team' },
      score1: { type: Number },
      score2: { type: Number },
      status: { 
        type: String, 
        enum: ['pending', 'in-progress', 'completed'], 
        default: 'pending' 
      }
    }]
  }]
}, {
  timestamps: true
});

export default mongoose.model<IBracket>('Bracket', BracketSchema);