import mongoose, { Document, Schema } from 'mongoose';

export interface IFriend extends Document {
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const friendSchema = new Schema<IFriend>(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
  },
  { timestamps: true }
);

// Ensure unique friend requests (no duplicates)
friendSchema.index({ from: 1, to: 1 }, { unique: true });

export default mongoose.model<IFriend>('Friend', friendSchema);
