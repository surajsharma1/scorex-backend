import mongoose, { Schema, Document } from 'mongoose';

export interface IOverlayConfig {
  backgroundColor?: string;
  opacity?: number;
  fontFamily?: string;
  [key: string]: any;
}

export interface IOverlay extends Document {
  name: string;
  template: string;
  publicId: string;
  config: IOverlayConfig;
  elements: any[];
  tournament?: mongoose.Types.ObjectId;
  match?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  // Membership tracking fields
  requiredMembershipLevel: number; // 0=Free, 1=Basic, 2=Premium
  membershipAtCreation: number; // Store the membership level when overlay was created
  // URL expiry tracking
  urlExpiresAt: Date; // When the overlay URL expires (24 hours from creation/regeneration)
  createdAt: Date;
  updatedAt: Date;
}

const OverlaySchema: Schema = new Schema({
  name: { type: String, required: true },
  template: { type: String, required: true, default: 'modern' },
  publicId: { type: String, required: true, unique: true },
  config: { 
    type: Map,
    of: Schema.Types.Mixed,
    default: {} 
  },
  elements: { type: Array, default: [] },
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament' },
  match: { type: Schema.Types.ObjectId, ref: 'Match' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Membership tracking fields
  requiredMembershipLevel: { 
    type: Number, 
    default: 1, 
    enum: [0, 1, 2] 
  }, // Minimum membership required to access (1 = Basic, 2 = Premium)
  membershipAtCreation: { 
    type: Number, 
    default: 0, 
    enum: [0, 1, 2] 
  }, // Membership level when overlay was created
  // URL expiry tracking - 24 hours from creation/regeneration
  urlExpiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Default: 24 hours from now
  }
}, {
  timestamps: true
});

export default mongoose.model<IOverlay>('Overlay', OverlaySchema);
