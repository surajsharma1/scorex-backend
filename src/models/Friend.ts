/**
 * Friend Model
 * Friends system
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IFriend extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema: Schema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'blocked', 'rejected'], default: 'pending' },

}, { timestamps: true });

FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });
FriendSchema.index({ requester: 1, status: 1 });
FriendSchema.index({ recipient: 1, status: 1 });

export default mongoose.model<IFriend>('Friend', FriendSchema);

