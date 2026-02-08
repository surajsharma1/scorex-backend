import mongoose, { Document, Schema } from 'mongoose';

export interface IClub extends Document {
  name: string;
  description?: string;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<IClub>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IClub>('Club', clubSchema);
