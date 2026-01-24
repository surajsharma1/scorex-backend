import mongoose, { Document, Schema } from 'mongoose';

export interface IOverlay extends Document {
  name: string;
  tournament: mongoose.Types.ObjectId;
  template: string;
  config: any;
  elements: any[];
  publicId: string;
  createdBy: mongoose.Types.ObjectId;
}

const overlaySchema = new Schema<IOverlay>(
  {
    name: { type: String, required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    template: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
    elements: [{ type: Schema.Types.Mixed }],
    publicId: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOverlay>('Overlay', overlaySchema);