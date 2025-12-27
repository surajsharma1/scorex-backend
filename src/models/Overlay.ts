import mongoose, { Document, Schema } from 'mongoose';

export interface IOverlay extends Document {
  name: string;
  tournament: mongoose.Types.ObjectId;
  template: 'classic' | 'modern' | 'broadcast' | 'ipl';
  config: {
    backgroundColor: string;
    opacity: number;
    fontFamily: string;
    position: 'top' | 'center' | 'bottom';
    showAnimations: boolean;
    autoUpdate: boolean;
  };
  elements: {
    type: 'text' | 'image' | 'scoreboard' | 'widget';
    content: any;
    position: { x: number; y: number };
    style: any;
  }[];
  publicId: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OverlaySchema: Schema = new Schema({
  name: { type: String, required: true },
  tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  template: { 
    type: String, 
    enum: ['classic', 'modern', 'broadcast', 'ipl'], 
    default: 'classic' 
  },
  config: {
    backgroundColor: { type: String, default: '#16a34a' },
    opacity: { type: Number, default: 90 },
    fontFamily: { type: String, default: 'Inter' },
    position: { 
      type: String, 
      enum: ['top', 'center', 'bottom'], 
      default: 'top' 
    },
    showAnimations: { type: Boolean, default: true },
    autoUpdate: { type: Boolean, default: true }
  },
  elements: [{
    type: { 
      type: String, 
      enum: ['text', 'image', 'scoreboard', 'widget'], 
      required: true 
    },
    content: { type: Schema.Types.Mixed },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    style: { type: Schema.Types.Mixed }
  }],
  publicId: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default mongoose.model<IOverlay>('Overlay', OverlaySchema);