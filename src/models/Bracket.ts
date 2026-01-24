import mongoose, { Document, Schema } from 'mongoose';

export interface IBracket extends Document {
  tournament: mongoose.Types.ObjectId;
  type: string;
  rounds: any[];
  createdBy: mongoose.Types.ObjectId;
}

const bracketSchema = new Schema<IBracket>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    type: { type: String, required: true },
    rounds: [{ type: Schema.Types.Mixed }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IBracket>('Bracket', bracketSchema);