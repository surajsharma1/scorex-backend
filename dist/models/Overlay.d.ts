/**
 * Overlay Model
 * Broadcast overlay templates
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IOverlay, {}, {}, {}, mongoose.Document<unknown, {}, IOverlay> & IOverlay & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Overlay.d.ts.map