import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  color?: string;                  // <-- Added color
  tournament?: Types.ObjectId;     // <-- Added tournament
  logo?: string;
  captain?: Types.ObjectId;
  players: Types.ObjectId[];
  statistics: {
    matchesPlayed: number;
    won: number;
    lost: number;
    tied: number;
    points: number;
    netRunRate: number;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>({
  name: { type: String, required: true, trim: true },
  color: { type: String },                                     // <-- Added color
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament' },// <-- Added tournament (ensure 'Tournament' matches your actual tournament model name)
  logo: { type: String },
  captain: { type: Schema.Types.ObjectId, ref: 'User' },
  players: [{ type: Schema.Types.ObjectId, ref: 'players' }],     // Note: see warning below
  statistics: {
    matchesPlayed: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    netRunRate: { type: Number, default: 0.000 }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<ITeam>('Team', TeamSchema);