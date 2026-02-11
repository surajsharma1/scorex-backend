import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket Keeper';
  jerseyNumber: string;
  image?: string;
  team: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // Link to user for social features
  stats: {
    matches: number;
    runs: number;
    wickets: number;
    average: number;
    battingAverage: number;
    bowlingAverage: number;
    strikeRate: number;
    economy: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema: Schema = new Schema({
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'],
    required: true
  },
  jerseyNumber: { type: String, required: true },
  image: { type: String },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Link to user for social features
  stats: {
    matches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    battingAverage: { type: Number, default: 0 },
    bowlingAverage: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    economy: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export default mongoose.model<IPlayer>('Player', PlayerSchema); 