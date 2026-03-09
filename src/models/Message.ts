/**
 * Message Model
 * Chat messages
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient?: mongoose.Types.ObjectId;
  roomId?: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User' },
  roomId: { type: String },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ sender: 1 });
MessageSchema.index({ recipient: 1 });
MessageSchema.index({ roomId: 1 });
MessageSchema.index({ createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);

