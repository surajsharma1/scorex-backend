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
  // Additional fields used by controller
  template?: string;
  publicId?: string;
  urlExpiresAt?: Date;
  membershipAtCreation?: number;
  requiredMembershipLevel?: number;
  match?: mongoose.Types.ObjectId;
  tournament?: mongoose.Types.ObjectId;
  config?: Record<string, any>;
  elements?: any[];
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
  // Additional fields
  template: { type: String },
  publicId: { type: String },
  urlExpiresAt: { type: Date },
  membershipAtCreation: { type: Number, default: 0 },
  requiredMembershipLevel: { type: Number, default: 0 },
  match: { type: Schema.Types.ObjectId, ref: 'Match' },
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament' },
  config: { type: Schema.Types.Mixed, default: {} },
  elements: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

OverlaySchema.index({ level: 1 });
OverlaySchema.index({ isPremium: 1 });
OverlaySchema.index({ category: 1 });
OverlaySchema.index({ createdBy: 1 });

export default mongoose.model<IOverlay>('Overlay', OverlaySchema);

