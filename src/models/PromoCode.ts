import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  discount: number;           // percentage, 1-100
  expiresAt: Date;
  usageLimit: number | null;  // null = unlimited
  usedBy: string[];           // array of user IDs who used it
  isActive: boolean;
  createdAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>({
  code:       { type: String, required: true, unique: true, uppercase: true, trim: true },
  discount:   { type: Number, required: true, min: 1, max: 100 },
  expiresAt:  { type: Date, required: true },
  usageLimit: { type: Number, default: null },  // null = unlimited
  usedBy:     [{ type: String }],
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
