/**
 * Overlay Model
 * Broadcast overlay templates
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IOverlay extends Document {
  name: string;
  description?: string;
  thumbnail?: string;
  html: string;
  css?: string;
  level: 1 | 2;
  category: string;
  isPremium: boolean;
  createdBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OverlaySchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  thumbnail: { type: String },
  html: { type: String, required: true },
  css: { type: String },
  level: { type: Number, enum: [1, 2], default: 1 },
  category: { type: String, default: 'broadcast' },
  isPremium: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

OverlaySchema.index({ level: 1 });
OverlaySchema.index({ isPremium: 1 });
OverlaySchema.index({ category: 1 });

export default mongoose.model<IOverlay>('Overlay', OverlaySchema);

