/**
 * Friend Model
 * Friends system
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IFriend extends Document {
  user: mongoose.Types.ObjectId;
  friend: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  friend: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
}, { timestamps: true });

FriendSchema.index({ user: 1, friend: 1 }, { unique: true });
FriendSchema.index({ user: 1, status: 1 });

export default mongoose.model<IFriend>('Friend', FriendSchema);

