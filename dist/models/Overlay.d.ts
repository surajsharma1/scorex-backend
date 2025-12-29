import mongoose, { Document } from 'mongoose';
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
        position: {
            x: number;
            y: number;
        };
        style: any;
    }[];
    publicId: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IOverlay, {}, {}, {}, mongoose.Document<unknown, {}, IOverlay> & IOverlay & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Overlay.d.ts.map