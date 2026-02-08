import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer {
  name: string;
  role: string;
  jerseyNumber: string;
  image?: string;
}

export interface ITeam extends Document {
  name: string;
  color: string;
  logo?: string;
  tournament: mongoose.Types.ObjectId;
  players: mongoose.Types.ObjectId[]; // Referenced players
  createdBy: mongoose.Types.ObjectId;
  deleted: boolean;
}

const playerSchema = new Schema<IPlayer>({
  name: { type: String, required: true },
  role: { type: String, required: true },
  jerseyNumber: { type: String, required: true },
  image: String,
});

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    color: { type: String, required: true },
    logo: String,
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    players: [playerSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITeam>('Team', teamSchema);