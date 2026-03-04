import mongoose, { Schema, Document, Types } from 'mongoose';

export type TournamentType = 'Round Robin' | 'Knockout' | 'Groups + Knockout' | 'Double Elimination' | 'League' | 'Custom';
export type LocationType = 'Indoor' | 'Outdoor' | 'Street' | 'Stadium';

export interface ITournament extends Document {
  name: string;
  organizer: string;
  startDate: Date;
  endDate: Date;
  location: string;
  locationType: LocationType;
  type: TournamentType;
  teams: Types.ObjectId[];
  matches: Types.ObjectId[];
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new Schema<ITournament>({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  organizer: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  locationType: { 
    type: String, 
    enum: ['Indoor', 'Outdoor', 'Street', 'Stadium'], 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['Round Robin', 'Knockout', 'Groups + Knockout', 'Double Elimination', 'League', 'Custom'], 
    required: true 
  },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
  status: { 
    type: String, 
    enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'], 
    default: 'Upcoming' 
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Validation to ensure logical dates
TournamentSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('Tournament end date cannot be before the start date.'));
  } else {
    next();
  }
});

export default mongoose.model<ITournament>('Tournament', TournamentSchema);