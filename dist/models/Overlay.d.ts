import mongoose, { Document } from 'mongoose';
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
    requiredMembershipLevel: number;
    membershipAtCreation: number;
    urlExpiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IOverlay, {}, {}, {}, mongoose.Document<unknown, {}, IOverlay> & IOverlay & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Overlay.d.ts.map