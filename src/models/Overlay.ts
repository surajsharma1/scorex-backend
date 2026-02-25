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
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default mongoose.model<IOverlay>('Overlay', OverlaySchema);